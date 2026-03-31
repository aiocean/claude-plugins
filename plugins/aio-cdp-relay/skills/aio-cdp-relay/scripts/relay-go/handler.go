package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"
)

func handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSON(w, map[string]string{"error": "Method not allowed"}, 405)
		return
	}
	state.touch()

	state.cdp.mu.Lock()
	connected := state.cdp.ws != nil
	state.cdp.mu.Unlock()

	sendJSON(w, map[string]interface{}{
		"status":       "ok",
		"connected":    connected,
		"idle_seconds": int(time.Since(state.lastActivity).Seconds()),
		"pid":          os.Getpid(),
	}, 200)
}

func handleTargets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSON(w, map[string]string{"error": "Method not allowed"}, 405)
		return
	}
	state.touch()

	if err := state.cdp.EnsureConnected(); err != nil {
		sendJSON(w, map[string]string{"error": "Cannot connect to Chrome"}, 502)
		return
	}

	resp, err := state.cdp.Send("Target.getTargets", nil, "", 15)
	if err != nil {
		sendJSON(w, map[string]string{"error": err.Error()}, 502)
		return
	}

	// Parse response to extract targetInfos
	var parsed struct {
		Result struct {
			TargetInfos json.RawMessage `json:"targetInfos"`
		} `json:"result"`
		Error json.RawMessage `json:"error,omitempty"`
	}
	if err := json.Unmarshal(resp, &parsed); err != nil {
		sendJSON(w, map[string]string{"error": "parse failed"}, 502)
		return
	}

	if parsed.Result.TargetInfos != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		w.Write(parsed.Result.TargetInfos)
		return
	}

	// Return raw error or empty
	if parsed.Error != nil {
		sendJSON(w, map[string]string{"error": string(parsed.Error)}, 502)
		return
	}
	sendJSON(w, []interface{}{}, 200)
}

func handleEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSON(w, map[string]string{"error": "Method not allowed"}, 405)
		return
	}
	state.touch()

	sid := r.URL.Query().Get("sessionId")
	events := state.cdp.DrainEvents(sid)
	if events == nil {
		events = []json.RawMessage{}
	}
	sendJSON(w, events, 200)
}

func handleCDP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSON(w, map[string]string{"error": "Method not allowed"}, 405)
		return
	}
	state.touch()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendJSON(w, map[string]string{"error": "Read body failed"}, 400)
		return
	}

	var req struct {
		Method    string          `json:"method"`
		Params    json.RawMessage `json:"params,omitempty"`
		SessionID string          `json:"sessionId,omitempty"`
		Timeout   float64         `json:"timeout,omitempty"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		sendJSON(w, map[string]string{"error": "Invalid JSON"}, 400)
		return
	}

	if req.Method == "" {
		sendJSON(w, map[string]string{"error": "Missing 'method'"}, 400)
		return
	}

	if req.Timeout <= 0 {
		req.Timeout = 15
	}

	if err := state.cdp.EnsureConnected(); err != nil {
		sendJSON(w, map[string]string{"error": "Cannot connect to Chrome"}, 502)
		return
	}

	resp, err := state.cdp.Send(req.Method, req.Params, req.SessionID, req.Timeout)
	if err != nil {
		sendJSON(w, map[string]string{"error": err.Error()}, 502)
		return
	}

	// Write raw CDP response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	w.Write(resp)
}

func handleStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSON(w, map[string]string{"error": "Method not allowed"}, 405)
		return
	}
	state.touch()

	sendJSON(w, map[string]string{"status": "stopping"}, 200)
	state.shouldStop = true
}
