package main

import (
	"encoding/base64"
	"encoding/json"
	"log"
	"sync"
	"time"
)

// InterceptRule defines how to handle a matched network request.
type InterceptRule struct {
	URLPattern  string            `json:"urlPattern"`
	Action      string            `json:"action"` // "log", "block", "mock"
	MockStatus  int               `json:"mockStatus,omitempty"`
	MockBody    string            `json:"mockBody,omitempty"`
	MockHeaders map[string]string `json:"mockHeaders,omitempty"`
}

// InterceptedRequest is a logged network request captured by the interceptor.
type InterceptedRequest struct {
	RequestID    string            `json:"requestId"`
	URL          string            `json:"url"`
	Method       string            `json:"method"`
	Headers      map[string]string `json:"headers"`
	ResourceType string            `json:"resourceType"`
	Action       string            `json:"action"`
	Timestamp    time.Time         `json:"timestamp"`
}

// interceptor manages Fetch-based request interception.
type interceptor struct {
	mu          sync.Mutex
	rules       []InterceptRule
	intercepted []InterceptedRequest
	enabled     bool
	sessionID   string
}

func newInterceptor() *interceptor {
	return &interceptor{}
}

// SetRules configures interception rules. Caller must enable Fetch domain separately.
func (i *interceptor) SetRules(rules []InterceptRule, sessionID string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.rules = rules
	i.sessionID = sessionID
	i.enabled = true
	i.intercepted = nil
}

// Clear disables interception and clears state.
func (i *interceptor) Clear() {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.rules = nil
	i.intercepted = nil
	i.enabled = false
	i.sessionID = ""
}

// IsEnabled returns whether interception is active.
func (i *interceptor) IsEnabled() bool {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.enabled
}

// DrainIntercepted returns and clears all logged intercepted requests.
func (i *interceptor) DrainIntercepted() []InterceptedRequest {
	i.mu.Lock()
	defer i.mu.Unlock()
	reqs := i.intercepted
	i.intercepted = nil
	return reqs
}

// HandlePaused processes a Fetch.requestPaused event.
// Must be called in a goroutine (it calls c.Send which blocks until response).
func (i *interceptor) HandlePaused(c *CDPConnection, raw json.RawMessage, sessionID string) {
	var evt struct {
		Params struct {
			RequestID string `json:"requestId"`
			Request   struct {
				URL     string            `json:"url"`
				Method  string            `json:"method"`
				Headers map[string]string `json:"headers"`
			} `json:"request"`
			ResourceType string `json:"resourceType"`
		} `json:"params"`
	}
	if err := json.Unmarshal(raw, &evt); err != nil {
		log.Printf("[intercept] Failed to parse requestPaused: %v", err)
		return
	}

	i.mu.Lock()
	rules := make([]InterceptRule, len(i.rules))
	copy(rules, i.rules)
	sid := i.sessionID
	i.mu.Unlock()

	// Use event's sessionId if available, fall back to stored one
	if sessionID != "" {
		sid = sessionID
	}

	// Find matching rule
	action := "log"
	var matchedRule *InterceptRule
	for idx := range rules {
		if globMatch(rules[idx].URLPattern, evt.Params.Request.URL) {
			action = rules[idx].Action
			r := rules[idx]
			matchedRule = &r
			break
		}
	}

	// Log the request
	i.mu.Lock()
	i.intercepted = append(i.intercepted, InterceptedRequest{
		RequestID:    evt.Params.RequestID,
		URL:          evt.Params.Request.URL,
		Method:       evt.Params.Request.Method,
		Headers:      evt.Params.Request.Headers,
		ResourceType: evt.Params.ResourceType,
		Action:       action,
		Timestamp:    time.Now(),
	})
	i.mu.Unlock()

	reqID := evt.Params.RequestID

	switch action {
	case "block":
		params, _ := json.Marshal(map[string]interface{}{
			"requestId":   reqID,
			"errorReason": "BlockedByClient",
		})
		c.Send("Fetch.failRequest", params, sid, 5)
		log.Printf("[intercept] Blocked: %s %s", evt.Params.Request.Method, evt.Params.Request.URL)

	case "mock":
		if matchedRule != nil {
			status := matchedRule.MockStatus
			if status == 0 {
				status = 200
			}
			headers := []map[string]string{}
			for k, v := range matchedRule.MockHeaders {
				headers = append(headers, map[string]string{"name": k, "value": v})
			}
			if len(headers) == 0 {
				headers = append(headers, map[string]string{"name": "Content-Type", "value": "application/json"})
			}
			body := base64.StdEncoding.EncodeToString([]byte(matchedRule.MockBody))
			params, _ := json.Marshal(map[string]interface{}{
				"requestId":       reqID,
				"responseCode":    status,
				"responseHeaders": headers,
				"body":            body,
			})
			c.Send("Fetch.fulfillRequest", params, sid, 5)
			log.Printf("[intercept] Mocked: %s %s -> %d", evt.Params.Request.Method, evt.Params.Request.URL, status)
		}

	default: // "log" or unrecognized — continue the request
		params, _ := json.Marshal(map[string]interface{}{
			"requestId": reqID,
		})
		c.Send("Fetch.continueRequest", params, sid, 5)
		log.Printf("[intercept] Logged: %s %s", evt.Params.Request.Method, evt.Params.Request.URL)
	}
}
