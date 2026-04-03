package main

import (
	"context"
	"log"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/ThreeDotsLabs/watermill/message/router/plugin"
	"github.com/ThreeDotsLabs/watermill/pubsub/gochannel"
)

func main() {
	logger := watermill.NewStdLogger(false, false)
	router, err := message.NewRouter(message.RouterConfig{}, logger)
	if err != nil {
		panic(err)
	}

	// Plugins and Middlewares
	router.AddPlugin(plugin.SignalsHandler)
	router.AddMiddleware(
		middleware.Recoverer,
		middleware.Retry{
			MaxRetries:      3,
			InitialInterval: time.Millisecond * 100,
			Logger:          logger,
		}.Middleware,
		middleware.CorrelationID,
	)

	// Setup Pub/Sub using GoChannel
	pubSub := gochannel.NewGoChannel(gochannel.Config{}, logger)

	// Add Handler
	router.AddHandler(
		"my_handler",
		"incoming_topic",
		pubSub,
		"outgoing_topic",
		pubSub,
		func(msg *message.Message) ([]*message.Message, error) {
			log.Printf("Received: %s", string(msg.Payload))
			// Prepend 'Processed: ' to the message payload
			newMsg := message.NewMessage(watermill.NewUUID(), []byte("Processed: "+string(msg.Payload)))
			return []*message.Message{newMsg}, nil
		},
	)

	// Start a background goroutine to publish a test message
	go func() {
		// Wait a bit for the router to start
		time.Sleep(time.Second)

		msg := message.NewMessage(watermill.NewUUID(), []byte("Hello Watermill!"))
		log.Printf("Publishing: %s", string(msg.Payload))
		
		if err := pubSub.Publish("incoming_topic", msg); err != nil {
			log.Printf("Failed to publish: %v", err)
		}
	}()

	// Start a background goroutine to consume the processed message
	go func() {
		// Wait a bit for the router to start
		time.Sleep(time.Second)
		
		messages, err := pubSub.Subscribe(context.Background(), "outgoing_topic")
		if err != nil {
			log.Printf("Failed to subscribe: %v", err)
			return
		}

		for msg := range messages {
			log.Printf("Final Output: %s", string(msg.Payload))
			msg.Ack()
		}
	}()

	// Run the router
	if err := router.Run(context.Background()); err != nil {
		panic(err)
	}
}
