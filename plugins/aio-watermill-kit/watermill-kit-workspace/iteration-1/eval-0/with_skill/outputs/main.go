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

	// Setup Pub/Sub
	pubSub := gochannel.NewGoChannel(gochannel.Config{}, logger)

	// Add Handlers
	router.AddHandler(
		"my_handler",
		"incoming_topic",
		pubSub,
		"outgoing_topic",
		pubSub,
		func(msg *message.Message) ([]*message.Message, error) {
			log.Printf("Received: %s", string(msg.Payload))
			// Create new message to publish
			newMsg := message.NewMessage(watermill.NewUUID(), []byte("Processed: "+string(msg.Payload)))
			return []*message.Message{newMsg}, nil
		},
	)

	// Run
	if err := router.Run(context.Background()); err != nil {
		panic(err)
	}
}