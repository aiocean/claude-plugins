package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

const (
	defaultPort        = 9223
	defaultIdleTimeout = 300
	pidFile            = "/tmp/cdp_relay.pid"
)

// RelayState holds the global state for the relay server.
type RelayState struct {
	cdp          *CDPConnection
	idleTimeout  int
	lastActivity time.Time
	shouldStop   bool
}

func (s *RelayState) touch() {
	s.lastActivity = time.Now()
}

func (s *RelayState) isIdle() bool {
	return time.Since(s.lastActivity) > time.Duration(s.idleTimeout)*time.Second
}

var state *RelayState

func main() {
	port := flag.Int("port", defaultPort, "Listen port")
	idleTimeout := flag.Int("idle-timeout", defaultIdleTimeout, "Shutdown after N seconds idle")
	flag.Parse()

	state = &RelayState{
		cdp:          NewCDPConnection(),
		idleTimeout:  *idleTimeout,
		lastActivity: time.Now(),
	}

	// Write PID file
	if err := os.WriteFile(pidFile, []byte(fmt.Sprintf("%d", os.Getpid())), 0644); err != nil {
		log.Printf("[relay] Failed to write PID file: %v", err)
	}

	// Signal handling
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/targets", handleTargets)
	mux.HandleFunc("/events", handleEvents)
	mux.HandleFunc("/cdp", handleCDP)
	mux.HandleFunc("/stop", handleStop)

	server := &http.Server{
		Addr:    fmt.Sprintf("127.0.0.1:%d", *port),
		Handler: mux,
	}

	// Idle watchdog
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if state.shouldStop || state.isIdle() {
				if state.isIdle() {
					fmt.Fprintf(os.Stderr, "[relay] Idle for %ds, shutting down.\n", state.idleTimeout)
				}
				server.Close()
				return
			}
		}
	}()

	// Signal handler
	go func() {
		<-sigCh
		fmt.Fprintln(os.Stderr, "[relay] Signal received, shutting down.")
		state.shouldStop = true
		server.Close()
	}()

	fmt.Fprintf(os.Stderr, "[relay] Listening on 127.0.0.1:%d (idle timeout: %ds)\n", *port, *idleTimeout)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("[relay] Server error: %v", err)
	}

	cleanup()
}

func cleanup() {
	state.cdp.Close()
	os.Remove(pidFile)
}

func sendJSON(w http.ResponseWriter, data interface{}, status int) {
	body, err := json.Marshal(data)
	if err != nil {
		http.Error(w, `{"error":"marshal failed"}`, 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}
