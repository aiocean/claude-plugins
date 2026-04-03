package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
)

// TargetSelector specifies criteria for selecting a Chrome target.
type TargetSelector struct {
	URL      string `json:"url,omitempty"`
	Title    string `json:"title,omitempty"`
	TargetID string `json:"targetId,omitempty"`
}

// targetInfo represents a Chrome target from Target.getTargets.
type targetInfo struct {
	TargetID string `json:"targetId"`
	Type     string `json:"type"`
	Title    string `json:"title"`
	URL      string `json:"url"`
}

// sessionCache maps targetId -> sessionId for reuse.
type sessionCache struct {
	mu       sync.RWMutex
	sessions map[string]string
}

func newSessionCache() *sessionCache {
	return &sessionCache{sessions: make(map[string]string)}
}

func (sc *sessionCache) get(targetID string) (string, bool) {
	sc.mu.RLock()
	defer sc.mu.RUnlock()
	sid, ok := sc.sessions[targetID]
	return sid, ok
}

func (sc *sessionCache) set(targetID, sessionID string) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	sc.sessions[targetID] = sessionID
}

func (sc *sessionCache) remove(targetID string) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	delete(sc.sessions, targetID)
}

func (sc *sessionCache) removeBySession(sessionID string) {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	for tid, sid := range sc.sessions {
		if sid == sessionID {
			delete(sc.sessions, tid)
			return
		}
	}
}

// globMatch does simple wildcard matching.
// Without *, it does case-insensitive substring match.
// With *, splits on * and checks parts appear in order.
func globMatch(pattern, s string) bool {
	if !strings.Contains(pattern, "*") {
		return strings.Contains(strings.ToLower(s), strings.ToLower(pattern))
	}

	pattern = strings.ToLower(pattern)
	s = strings.ToLower(s)
	parts := strings.Split(pattern, "*")

	pos := 0
	for i, part := range parts {
		if part == "" {
			continue
		}
		idx := strings.Index(s[pos:], part)
		if idx < 0 {
			return false
		}
		// First part must match at start if pattern doesn't start with *
		if i == 0 && !strings.HasPrefix(pattern, "*") && idx != 0 {
			return false
		}
		pos += idx + len(part)
	}
	// Last part must match at end if pattern doesn't end with *
	if !strings.HasSuffix(pattern, "*") && len(parts) > 0 {
		last := parts[len(parts)-1]
		if last != "" && !strings.HasSuffix(s, last) {
			return false
		}
	}
	return true
}

// matchTarget checks if a target matches the selector.
func matchTarget(t targetInfo, sel TargetSelector) bool {
	if sel.TargetID != "" {
		return t.TargetID == sel.TargetID
	}
	if sel.URL != "" && !globMatch(sel.URL, t.URL) {
		return false
	}
	if sel.Title != "" && !globMatch(sel.Title, t.Title) {
		return false
	}
	return sel.URL != "" || sel.Title != ""
}

// ResolveTarget finds a page target matching the selector.
func (c *CDPConnection) ResolveTarget(sel TargetSelector) (*targetInfo, error) {
	resp, err := c.Send("Target.getTargets", nil, "", 15)
	if err != nil {
		return nil, fmt.Errorf("getTargets failed: %w", err)
	}

	var parsed struct {
		Result struct {
			TargetInfos []targetInfo `json:"targetInfos"`
		} `json:"result"`
	}
	if err := json.Unmarshal(resp, &parsed); err != nil {
		return nil, fmt.Errorf("parse targets: %w", err)
	}

	// Match pages first
	for i := range parsed.Result.TargetInfos {
		t := &parsed.Result.TargetInfos[i]
		if t.Type != "page" {
			continue
		}
		if matchTarget(*t, sel) {
			return t, nil
		}
	}

	// If targetId was specified, check all target types
	if sel.TargetID != "" {
		for i := range parsed.Result.TargetInfos {
			t := &parsed.Result.TargetInfos[i]
			if t.TargetID == sel.TargetID {
				return t, nil
			}
		}
	}

	return nil, fmt.Errorf("no target matching selector: url=%q title=%q id=%q", sel.URL, sel.Title, sel.TargetID)
}

// AutoAttach resolves a target and attaches to it, returning the sessionId.
// Uses cached sessions when available.
func (c *CDPConnection) AutoAttach(sel TargetSelector) (string, *targetInfo, error) {
	target, err := c.ResolveTarget(sel)
	if err != nil {
		return "", nil, err
	}

	// Check cache
	if sid, ok := c.sessions.get(target.TargetID); ok {
		return sid, target, nil
	}

	// Attach to target
	params, _ := json.Marshal(map[string]interface{}{
		"targetId": target.TargetID,
		"flatten":  true,
	})
	resp, err := c.Send("Target.attachToTarget", params, "", 15)
	if err != nil {
		return "", nil, fmt.Errorf("attach failed: %w", err)
	}

	var attachResp struct {
		Result struct {
			SessionID string `json:"sessionId"`
		} `json:"result"`
	}
	if err := json.Unmarshal(resp, &attachResp); err != nil {
		return "", nil, fmt.Errorf("parse attach response: %w", err)
	}
	if attachResp.Result.SessionID == "" {
		return "", nil, fmt.Errorf("attach returned no sessionId: %s", string(resp))
	}

	sid := attachResp.Result.SessionID
	c.sessions.set(target.TargetID, sid)
	log.Printf("[relay] Auto-attached to %s (url=%s, sid=%s)",
		target.TargetID[:min(16, len(target.TargetID))],
		target.URL[:min(60, len(target.URL))],
		sid[:min(16, len(sid))])

	return sid, target, nil
}
