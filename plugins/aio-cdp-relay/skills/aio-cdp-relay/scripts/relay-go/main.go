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
	defaultPort = 9223
	pidFile     = "/tmp/cdp_relay.pid"
)

// RelayState holds the global state for the relay server.
type RelayState struct {
	cdp          *CDPConnection
	lastActivity time.Time
	shouldStop   bool
}

func (s *RelayState) touch() {
	s.lastActivity = time.Now()
}

var state *RelayState

func main() {
	port := flag.Int("port", defaultPort, "Listen port")
	flag.Parse()

	state = &RelayState{
		cdp:          NewCDPConnection(),
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

	// Stop watchdog
	go func() {
		for !state.shouldStop {
			time.Sleep(1 * time.Second)
		}
		server.Close()
	}()

	// Signal handler
	go func() {
		<-sigCh
		fmt.Fprintln(os.Stderr, "[relay] Signal received, shutting down.")
		state.shouldStop = true
		server.Close()
	}()

	fmt.Fprintf(os.Stderr, "[relay] Listening on 127.0.0.1:%d (persistent mode, no idle timeout)\n", *port)

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
