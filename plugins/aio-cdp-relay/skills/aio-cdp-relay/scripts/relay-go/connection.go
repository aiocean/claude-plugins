package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"golang.org/x/sync/singleflight"
)

var chromeUserDataDirs = []string{
	os.Getenv("CHROME_USER_DATA_DIR"),
	filepath.Join(os.Getenv("HOME"), ".chrome-debug-profile"),
	filepath.Join(os.Getenv("HOME"), "Library", "Application Support", "Google", "Chrome"),
}

// readCDPEndpoint reads Chrome's DevToolsActivePort file to get port and ws path.
func readCDPEndpoint() (int, string, error) {
	for _, dataDir := range chromeUserDataDirs {
		if dataDir == "" {
			continue
		}
		portFile := filepath.Join(dataDir, "DevToolsActivePort")
		data, err := os.ReadFile(portFile)
		if err != nil {
			continue
		}
		lines := strings.Split(strings.TrimSpace(string(data)), "\n")
		if len(lines) < 2 {
			continue
		}
		port, err := strconv.Atoi(strings.TrimSpace(lines[0]))
		if err != nil {
			continue
		}
		wsPath := strings.TrimSpace(lines[1])
		return port, wsPath, nil
	}
	return 0, "", fmt.Errorf("no DevToolsActivePort found")
}

// pendingRequest holds a channel and response for a single CDP command.
type pendingRequest struct {
	ch   chan json.RawMessage
	resp json.RawMessage
}

// CDPConnection manages a persistent WebSocket connection to Chrome CDP.
type CDPConnection struct {
	ws           *websocket.Conn
	mu           sync.Mutex
	writeMu      sync.Mutex // serializes WebSocket writes (gorilla disallows concurrent writes)
	msgID        atomic.Int64
	pending      map[int64]*pendingRequest
	pendingMu    sync.Mutex
	events       map[string][]json.RawMessage
	eventsMu     sync.Mutex
	reconnecting atomic.Bool // prevents multiple concurrent autoReconnect goroutines
	dedup        singleflight.Group

	// Connection gating: prevents multiple simultaneous Dial attempts.
	connectGroup singleflight.Group

	// Auto-attach: caches targetId -> sessionId
	sessions *sessionCache
	// Event filtering: controls which events get buffered per session
	filters *eventFilter
	// Network interception: handles Fetch.requestPaused events
	interceptor *interceptor
}

// NewCDPConnection creates a new CDPConnection.
func NewCDPConnection() *CDPConnection {
	return &CDPConnection{
		pending:     make(map[int64]*pendingRequest),
		events:      make(map[string][]json.RawMessage),
		sessions:    newSessionCache(),
		filters:     newEventFilter(),
		interceptor: newInterceptor(),
	}
}

// EnsureConnected connects to Chrome if not already connected.
// Uses singleflight so that only one Dial is in flight at a time —
// if Chrome is showing an "accept connection" prompt, all callers
// wait for that single attempt instead of spawning more prompts.
func (c *CDPConnection) EnsureConnected() error {
	c.mu.Lock()
	if c.ws != nil {
		c.mu.Unlock()
		return nil
	}
	c.mu.Unlock()

	// All concurrent callers share a single Dial attempt.
	_, err, shared := c.connectGroup.Do("connect", func() (interface{}, error) {
		// Double-check under lock (another caller may have connected while we waited).
		c.mu.Lock()
		if c.ws != nil {
			c.mu.Unlock()
			return nil, nil
		}
		c.mu.Unlock()

		port, wsPath, err := readCDPEndpoint()
		if err != nil {
			return nil, fmt.Errorf("cannot find Chrome: %w", err)
		}

		wsURL := fmt.Sprintf("ws://127.0.0.1:%d%s", port, wsPath)
		log.Printf("[relay] Dialing Chrome at %s ...", wsURL)
		dialer := websocket.Dialer{
			HandshakeTimeout: 30 * time.Second,
		}
		conn, _, err := dialer.Dial(wsURL, nil)
		if err != nil {
			return nil, fmt.Errorf("connection failed: %w", err)
		}

		c.mu.Lock()
		c.ws = conn
		c.mu.Unlock()
		go c.recvLoop()
		log.Printf("[relay] Connected to Chrome.")
		return nil, nil
	})
	if shared {
		log.Printf("[relay] Connection attempt shared (waited for existing Dial).")
	}
	return err
}

// recvLoop reads messages from the WebSocket and routes them.
func (c *CDPConnection) recvLoop() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[relay] PANIC in recvLoop recovered: %v", r)
			c.mu.Lock()
			if c.ws != nil {
				c.ws.Close()
				c.ws = nil
			}
			c.mu.Unlock()
			c.tryAutoReconnect()
		}
	}()

	for {
		_, raw, err := c.ws.ReadMessage()
		if err != nil {
			break
		}

		// Parse to check for id or method
		var msg struct {
			ID        *int64          `json:"id,omitempty"`
			Method    string          `json:"method,omitempty"`
			SessionID string          `json:"sessionId,omitempty"`
			Result    json.RawMessage `json:"result,omitempty"`
			Error     json.RawMessage `json:"error,omitempty"`
		}
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}

		if msg.ID != nil {
			// Response to a command
			c.pendingMu.Lock()
			if pr, ok := c.pending[*msg.ID]; ok {
				pr.resp = raw
				close(pr.ch)
				delete(c.pending, *msg.ID)
			}
			c.pendingMu.Unlock()
		} else if msg.Method != "" {
			sid := msg.SessionID
			bufferKey := sid
			if bufferKey == "" {
				bufferKey = "__global__"
			}

			// Handle target lifecycle — invalidate session cache
			if msg.Method == "Target.targetDestroyed" {
				var evt struct {
					Params struct {
						TargetID string `json:"targetId"`
					} `json:"params"`
				}
				if json.Unmarshal(raw, &evt) == nil && evt.Params.TargetID != "" {
					c.sessions.remove(evt.Params.TargetID)
					log.Printf("[relay] Target destroyed, cache cleared: %s", evt.Params.TargetID[:min(16, len(evt.Params.TargetID))])
				}
			}

			// Handle Fetch.requestPaused — dispatch to interceptor
			if msg.Method == "Fetch.requestPaused" && c.interceptor.IsEnabled() {
				go c.interceptor.HandlePaused(c, raw, sid)
				continue
			}

			// Apply event filter
			if !c.filters.ShouldBuffer(bufferKey, msg.Method) {
				continue
			}

			// Buffer event
			c.eventsMu.Lock()
			c.events[bufferKey] = append(c.events[bufferKey], raw)
			c.eventsMu.Unlock()
		}
	}

	// WebSocket died — clean up and auto-reconnect
	fmt.Fprintln(os.Stderr, "[relay] WebSocket recv loop ended, marking disconnected.")
	c.mu.Lock()
	if c.ws != nil {
		c.ws.Close()
		c.ws = nil
	}
	c.mu.Unlock()

	// Wake pending requests
	c.pendingMu.Lock()
	for id, pr := range c.pending {
		pr.resp = json.RawMessage(`{"error":"WebSocket disconnected"}`)
		close(pr.ch)
		delete(c.pending, id)
	}
	c.pendingMu.Unlock()

	// Auto-reconnect in background (guarded by atomic flag)
	c.tryAutoReconnect()
}

const (
	reconnectMinInterval = 2 * time.Second
	reconnectMaxInterval = 30 * time.Second
	reconnectMaxAttempts = 10
)

// tryAutoReconnect starts autoReconnect if one isn't already running.
func (c *CDPConnection) tryAutoReconnect() {
	if c.reconnecting.CompareAndSwap(false, true) {
		go c.autoReconnect()
	}
}

// autoReconnect tries to reconnect to Chrome with exponential backoff, limited attempts.
func (c *CDPConnection) autoReconnect() {
	defer c.reconnecting.Store(false)

	interval := reconnectMinInterval
	for attempt := 1; attempt <= reconnectMaxAttempts; attempt++ {
		time.Sleep(interval)
		log.Printf("[relay] Reconnect attempt #%d/%d (backoff %v)...", attempt, reconnectMaxAttempts, interval)
		if err := c.EnsureConnected(); err == nil {
			log.Printf("[relay] Reconnected to Chrome after %d attempts.", attempt)
			return
		}
		interval = min(interval*2, reconnectMaxInterval)
	}
	log.Printf("[relay] Gave up reconnecting after %d attempts. Next Send() will retry.", reconnectMaxAttempts)
}

// Send sends a CDP command and waits for a response.
// On write failure, it reconnects and retries once.
func (c *CDPConnection) Send(method string, params json.RawMessage, sessionID string, timeout float64) (json.RawMessage, error) {
	resp, err := c.sendOnce(method, params, sessionID, timeout)
	if err != nil {
		// Disconnect, reconnect, retry once
		log.Printf("[relay] Send failed (%v), reconnecting and retrying...", err)
		c.mu.Lock()
		if c.ws != nil {
			c.ws.Close()
			c.ws = nil
		}
		c.mu.Unlock()

		if connErr := c.EnsureConnected(); connErr != nil {
			return nil, fmt.Errorf("retry connect failed: %w", connErr)
		}
		return c.sendOnce(method, params, sessionID, timeout)
	}
	return resp, nil
}

func (c *CDPConnection) sendOnce(method string, params json.RawMessage, sessionID string, timeout float64) (json.RawMessage, error) {
	if err := c.EnsureConnected(); err != nil {
		return nil, err
	}

	id := c.msgID.Add(1)

	// Build message
	msg := map[string]any{
		"id":     id,
		"method": method,
	}
	if params != nil && string(params) != "null" {
		msg["params"] = params
	}
	if sessionID != "" {
		msg["sessionId"] = sessionID
	}

	pr := &pendingRequest{
		ch: make(chan json.RawMessage, 1),
	}
	c.pendingMu.Lock()
	c.pending[id] = pr
	c.pendingMu.Unlock()

	// Send — serialize writes to avoid concurrent write panics
	c.writeMu.Lock()
	c.mu.Lock()
	ws := c.ws
	c.mu.Unlock()
	if ws == nil {
		c.writeMu.Unlock()
		c.pendingMu.Lock()
		delete(c.pending, id)
		c.pendingMu.Unlock()
		return nil, fmt.Errorf("not connected")
	}

	data, _ := json.Marshal(msg)
	writeErr := ws.WriteMessage(websocket.TextMessage, data)
	c.writeMu.Unlock()
	if writeErr != nil {
		c.pendingMu.Lock()
		delete(c.pending, id)
		c.pendingMu.Unlock()
		return nil, fmt.Errorf("send failed: %w", writeErr)
	}

	// Wait for response
	timeoutDur := time.Duration(timeout * float64(time.Second))
	select {
	case <-pr.ch:
		return pr.resp, nil
	case <-time.After(timeoutDur):
		c.pendingMu.Lock()
		delete(c.pending, id)
		c.pendingMu.Unlock()
		return json.RawMessage(`{"error":"Timeout"}`), nil
	}
}

// DrainEvents returns and clears buffered events for a sessionId.
func (c *CDPConnection) DrainEvents(sessionID string) []json.RawMessage {
	key := sessionID
	if key == "" {
		key = "__global__"
	}
	c.eventsMu.Lock()
	defer c.eventsMu.Unlock()
	events := c.events[key]
	delete(c.events, key)
	return events
}

// Close closes the WebSocket connection.
func (c *CDPConnection) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.ws != nil {
		c.ws.Close()
		c.ws = nil
	}
}
