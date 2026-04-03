package main

import (
	"encoding/json"
	"io"
	"log"
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
		Method         string          `json:"method"`
		Params         json.RawMessage `json:"params,omitempty"`
		SessionID      string          `json:"sessionId,omitempty"`
		Timeout        float64         `json:"timeout,omitempty"`
		TargetSelector *TargetSelector `json:"targetSelector,omitempty"`
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

	// Auto-attach if targetSelector provided and no explicit sessionId
	if req.TargetSelector != nil && req.SessionID == "" {
		sid, _, err := state.cdp.AutoAttach(*req.TargetSelector)
		if err != nil {
			sendJSON(w, map[string]string{"error": err.Error()}, 502)
			return
		}
		req.SessionID = sid
		w.Header().Set("X-CDP-Session-ID", sid)
	}

	dedupKey := req.Method + "|" + req.SessionID + "|" + string(req.Params)
	val, err, shared := state.cdp.dedup.Do(dedupKey, func() (any, error) {
		return state.cdp.Send(req.Method, req.Params, req.SessionID, req.Timeout)
	})
	if err != nil {
		sendJSON(w, map[string]string{"error": err.Error()}, 502)
		return
	}
	if shared {
		log.Printf("[relay] Deduped request: %s (sessionId=%s)", req.Method, req.SessionID)
	}

	resp := val.(json.RawMessage)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	w.Write(resp)
}

func handleAttach(w http.ResponseWriter, r *http.Request) {
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

	var sel TargetSelector
	if err := json.Unmarshal(body, &sel); err != nil {
		sendJSON(w, map[string]string{"error": "Invalid JSON"}, 400)
		return
	}
	if sel.URL == "" && sel.Title == "" && sel.TargetID == "" {
		sendJSON(w, map[string]string{"error": "Provide at least one of: url, title, targetId"}, 400)
		return
	}

	if err := state.cdp.EnsureConnected(); err != nil {
		sendJSON(w, map[string]string{"error": "Cannot connect to Chrome"}, 502)
		return
	}

	sid, target, err := state.cdp.AutoAttach(sel)
	if err != nil {
		sendJSON(w, map[string]string{"error": err.Error()}, 502)
		return
	}

	sendJSON(w, map[string]string{
		"sessionId": sid,
		"targetId":  target.TargetID,
		"url":       target.URL,
		"title":     target.Title,
	}, 200)
}

func handleSubscribe(w http.ResponseWriter, r *http.Request) {
	state.touch()

	switch r.Method {
	case http.MethodPost:
		body, err := io.ReadAll(r.Body)
		if err != nil {
			sendJSON(w, map[string]string{"error": "Read body failed"}, 400)
			return
		}
		var req struct {
			SessionID string   `json:"sessionId"`
			Events    []string `json:"events"`
		}
		if err := json.Unmarshal(body, &req); err != nil {
			sendJSON(w, map[string]string{"error": "Invalid JSON"}, 400)
			return
		}
		if len(req.Events) == 0 {
			sendJSON(w, map[string]string{"error": "Missing 'events'"}, 400)
			return
		}
		key := req.SessionID
		if key == "" {
			key = "__global__"
		}
		state.cdp.filters.Set(key, req.Events)
		sendJSON(w, map[string]any{
			"status":    "subscribed",
			"sessionId": key,
			"count":     len(req.Events),
		}, 200)

	case http.MethodDelete:
		key := r.URL.Query().Get("sessionId")
		if key == "" {
			key = "__global__"
		}
		state.cdp.filters.Clear(key)
		sendJSON(w, map[string]string{"status": "cleared", "sessionId": key}, 200)

	default:
		sendJSON(w, map[string]string{"error": "Method not allowed"}, 405)
	}
}

func handleIntercept(w http.ResponseWriter, r *http.Request) {
	state.touch()

	switch r.Method {
	case http.MethodPost:
		body, err := io.ReadAll(r.Body)
		if err != nil {
			sendJSON(w, map[string]string{"error": "Read body failed"}, 400)
			return
		}
		var req struct {
			SessionID string          `json:"sessionId"`
			Rules     []InterceptRule `json:"rules"`
		}
		if err := json.Unmarshal(body, &req); err != nil {
			sendJSON(w, map[string]string{"error": "Invalid JSON"}, 400)
			return
		}
		if len(req.Rules) == 0 {
			sendJSON(w, map[string]string{"error": "Missing 'rules'"}, 400)
			return
		}

		if err := state.cdp.EnsureConnected(); err != nil {
			sendJSON(w, map[string]string{"error": "Cannot connect to Chrome"}, 502)
			return
		}

		// Enable Fetch domain with URL patterns
		patterns := make([]map[string]string, len(req.Rules))
		for i, rule := range req.Rules {
			patterns[i] = map[string]string{"urlPattern": rule.URLPattern}
		}
		params, _ := json.Marshal(map[string]any{"patterns": patterns})
		if _, err := state.cdp.Send("Fetch.enable", params, req.SessionID, 15); err != nil {
			sendJSON(w, map[string]string{"error": "Fetch.enable failed: " + err.Error()}, 502)
			return
		}

		state.cdp.interceptor.SetRules(req.Rules, req.SessionID)
		sendJSON(w, map[string]any{
			"status": "intercepting",
			"rules":  len(req.Rules),
		}, 200)

	case http.MethodDelete:
		sid := r.URL.Query().Get("sessionId")
		if state.cdp.interceptor.IsEnabled() {
			state.cdp.Send("Fetch.disable", nil, sid, 15)
		}
		state.cdp.interceptor.Clear()
		sendJSON(w, map[string]string{"status": "cleared"}, 200)

	default:
		sendJSON(w, map[string]string{"error": "Method not allowed"}, 405)
	}
}

func handleIntercepted(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSON(w, map[string]string{"error": "Method not allowed"}, 405)
		return
	}
	state.touch()

	reqs := state.cdp.interceptor.DrainIntercepted()
	if reqs == nil {
		reqs = []InterceptedRequest{}
	}
	sendJSON(w, reqs, 200)
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
