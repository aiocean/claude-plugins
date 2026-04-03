package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/pubsub/gochannel"
)

func main() {
	logger := watermill.NewStdLogger(false, false)

	// Set up the GoChannel pub/sub
	pubSub := gochannel.NewGoChannel(
		gochannel.Config{},
		logger,
	)

	// Set up the router
	router, err := message.NewRouter(message.RouterConfig{}, logger)
	if err != nil {
		log.Fatal(err)
	}

	// Add the handler to listen to incoming_topic and publish to outgoing_topic
	router.AddHandler(
		"process_message", // Handler name
		"incoming_topic",  // Subscribe topic
		pubSub,            // Subscriber
		"outgoing_topic",  // Publish topic
		pubSub,            // Publisher
		func(msg *message.Message) ([]*message.Message, error) {
			// Prepend 'Processed: ' to the message payload
			newPayload := fmt.Sprintf("Processed: %s", string(msg.Payload))

			// Create a new message with the updated payload
			newMsg := message.NewMessage(watermill.NewUUID(), []byte(newPayload))

			return []*message.Message{newMsg}, nil
		},
	)

	// Subscribe to outgoing_topic to verify processing
	messages, err := pubSub.Subscribe(context.Background(), "outgoing_topic")
	if err != nil {
		log.Fatal(err)
	}

	go func() {
		for msg := range messages {
			fmt.Printf("Received message: %s\n", string(msg.Payload))
			msg.Ack()
		}
	}()

	// Publish a test message
	go func() {
		// Wait for the router to start before publishing
		<-router.Running()

		msg := message.NewMessage(watermill.NewUUID(), []byte("Hello, Watermill!"))
		fmt.Printf("Publishing message: %s\n", string(msg.Payload))
		err := pubSub.Publish("incoming_topic", msg)
		if err != nil {
			log.Printf("Error publishing message: %v", err)
		}
	}()

	// Start the router
	ctx := context.Background()
	if err := router.Run(ctx); err != nil {
		log.Fatal(err)
	}
}
