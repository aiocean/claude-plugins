package main

import (
	"strings"
	"sync"
)

// eventFilter controls which CDP events get buffered per session.
// When no filter is set for a session, all events are buffered (backward compatible).
type eventFilter struct {
	mu      sync.RWMutex
	filters map[string]map[string]bool // sessionId -> set of event method names/patterns
}

func newEventFilter() *eventFilter {
	return &eventFilter{filters: make(map[string]map[string]bool)}
}

// Set configures which events to buffer for a session.
// Supports exact names ("Network.responseReceived") and domain wildcards ("Network.*").
func (ef *eventFilter) Set(sessionID string, methods []string) {
	ef.mu.Lock()
	defer ef.mu.Unlock()
	set := make(map[string]bool, len(methods))
	for _, m := range methods {
		set[m] = true
	}
	ef.filters[sessionID] = set
}

// Clear removes the filter for a session (reverts to buffering all events).
func (ef *eventFilter) Clear(sessionID string) {
	ef.mu.Lock()
	defer ef.mu.Unlock()
	delete(ef.filters, sessionID)
}

// ShouldBuffer returns true if the event should be buffered.
func (ef *eventFilter) ShouldBuffer(sessionID, method string) bool {
	ef.mu.RLock()
	defer ef.mu.RUnlock()

	set, ok := ef.filters[sessionID]
	if !ok {
		return true // no filter = buffer everything
	}

	// Exact match
	if set[method] {
		return true
	}

	// Domain wildcard match: "Network.*" matches "Network.responseReceived"
	for pattern := range set {
		if strings.HasSuffix(pattern, ".*") {
			domain := strings.TrimSuffix(pattern, ".*")
			if strings.HasPrefix(method, domain+".") {
				return true
			}
		}
	}

	return false
}
