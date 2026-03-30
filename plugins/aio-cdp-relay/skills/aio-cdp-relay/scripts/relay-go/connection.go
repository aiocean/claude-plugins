package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
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
	ws        *websocket.Conn
	mu        sync.Mutex
	msgID     atomic.Int64
	pending   map[int64]*pendingRequest
	pendingMu sync.Mutex
	events    map[string][]json.RawMessage
	eventsMu  sync.Mutex
}

// NewCDPConnection creates a new CDPConnection.
func NewCDPConnection() *CDPConnection {
	return &CDPConnection{
		pending: make(map[int64]*pendingRequest),
		events:  make(map[string][]json.RawMessage),
	}
}

// EnsureConnected connects to Chrome if not already connected.
func (c *CDPConnection) EnsureConnected() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.ws != nil {
		return nil
	}

	port, wsPath, err := readCDPEndpoint()
	if err != nil {
		return fmt.Errorf("cannot find Chrome: %w", err)
	}

	wsURL := fmt.Sprintf("ws://127.0.0.1:%d%s", port, wsPath)
	dialer := websocket.Dialer{
		HandshakeTimeout: 15 * time.Second,
	}
	conn, _, err := dialer.Dial(wsURL, nil)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}

	c.ws = conn
	go c.recvLoop()
	return nil
}

// recvLoop reads messages from the WebSocket and routes them.
func (c *CDPConnection) recvLoop() {
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
			// Event — buffer by sessionId
			sid := msg.SessionID
			if sid == "" {
				sid = "__global__"
			}
			c.eventsMu.Lock()
			c.events[sid] = append(c.events[sid], raw)
			c.eventsMu.Unlock()
		}
	}

	// WebSocket died — clean up
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
}

// Send sends a CDP command and waits for a response.
func (c *CDPConnection) Send(method string, params json.RawMessage, sessionID string, timeout float64) (json.RawMessage, error) {
	if err := c.EnsureConnected(); err != nil {
		return nil, err
	}

	id := c.msgID.Add(1)

	// Build message
	msg := map[string]interface{}{
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

	// Send
	c.mu.Lock()
	ws := c.ws
	c.mu.Unlock()
	if ws == nil {
		c.pendingMu.Lock()
		delete(c.pending, id)
		c.pendingMu.Unlock()
		return nil, fmt.Errorf("not connected")
	}

	data, _ := json.Marshal(msg)
	if err := ws.WriteMessage(websocket.TextMessage, data); err != nil {
		c.pendingMu.Lock()
		delete(c.pending, id)
		c.pendingMu.Unlock()
		return nil, fmt.Errorf("send failed: %w", err)
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
