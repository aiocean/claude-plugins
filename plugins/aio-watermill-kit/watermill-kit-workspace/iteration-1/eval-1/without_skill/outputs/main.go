package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/components/cqrs"
	"github.com/ThreeDotsLabs/watermill/message"
)

// 1. Define your Command and Event payload types

// CreateOrderCommand represents a command to create a new order
type CreateOrderCommand struct {
	OrderID   string `json:"order_id"`
	ProductID string `json:"product_id"`
}

// OrderCreatedEvent represents an event that an order was created
type OrderCreatedEvent struct {
	OrderID string `json:"order_id"`
}

// 2. Define Command Handlers

// CreateOrderCommandHandler handles CreateOrderCommand
type CreateOrderCommandHandler struct {
	eventBus *cqrs.EventBus
}

func (h CreateOrderCommandHandler) HandlerName() string {
	return "CreateOrderCommandHandler"
}

func (h CreateOrderCommandHandler) NewCommand() interface{} {
	return &CreateOrderCommand{}
}

func (h CreateOrderCommandHandler) Handle(ctx context.Context, cmd interface{}) error {
	createCmd := cmd.(*CreateOrderCommand)

	log.Printf("Handling command: Create Order %s for Product %s\n", createCmd.OrderID, createCmd.ProductID)

	// In a real app, you would save to database here
	// ... database logic ...

	// Emit an event after successful command processing
	event := &OrderCreatedEvent{
		OrderID: createCmd.OrderID,
	}

	log.Printf("Publishing event: OrderCreatedEvent %s\n", event.OrderID)
	return h.eventBus.Publish(ctx, event)
}

// 3. Define Event Handlers

// OrderCreatedEventHandler handles OrderCreatedEvent
type OrderCreatedEventHandler struct{}

func (h OrderCreatedEventHandler) HandlerName() string {
	return "OrderCreatedEventHandler"
}

func (h OrderCreatedEventHandler) NewEvent() interface{} {
	return &OrderCreatedEvent{}
}

func (h OrderCreatedEventHandler) Handle(ctx context.Context, event interface{}) error {
	orderCreatedEvent := event.(*OrderCreatedEvent)
	log.Printf("Handling event: Order %s was created successfully! Sending confirmation email...\n", orderCreatedEvent.OrderID)
	return nil
}

func main() {
	// 4. Setup Watermill Logger
	logger := watermill.NewStdLogger(false, false)

	// 5. Setup Kafka Publisher and Subscriber
	brokers := []string{"localhost:9092"} // Adjust to your Kafka brokers

	// Ensure Kafka brokers address is available if using docker-compose
	if os.Getenv("KAFKA_BROKERS") != "" {
		brokers = []string{os.Getenv("KAFKA_BROKERS")}
	}

	publisher, err := kafka.NewPublisher(
		kafka.PublisherConfig{
			Brokers:   brokers,
			Marshaler: kafka.DefaultMarshaler{},
		},
		logger,
	)
	if err != nil {
		log.Fatalf("Failed to create Kafka publisher: %v", err)
	}
	defer publisher.Close()

	// Subscriber for commands (often consumer group based)
	commandsSubscriber, err := kafka.NewSubscriber(
		kafka.SubscriberConfig{
			Brokers:       brokers,
			Unmarshaler:   kafka.DefaultMarshaler{},
			ConsumerGroup: "cqrs-commands-group",
		},
		logger,
	)
	if err != nil {
		log.Fatalf("Failed to create Kafka commands subscriber: %v", err)
	}
	defer commandsSubscriber.Close()

	// Subscriber for events
	eventsSubscriber, err := kafka.NewSubscriber(
		kafka.SubscriberConfig{
			Brokers:       brokers,
			Unmarshaler:   kafka.DefaultMarshaler{},
			ConsumerGroup: "cqrs-events-group",
		},
		logger,
	)
	if err != nil {
		log.Fatalf("Failed to create Kafka events subscriber: %v", err)
	}
	defer eventsSubscriber.Close()

	// 6. Setup CQRS Router and Facade
	router, err := message.NewRouter(message.RouterConfig{}, logger)
	if err != nil {
		log.Fatalf("Failed to create router: %v", err)
	}
	defer router.Close()

	// We'll define simple topic generation functions
	generateCommandTopic := func(commandName string) string {
		return fmt.Sprintf("commands.%s", commandName)
	}
	generateEventTopic := func(eventName string) string {
		return fmt.Sprintf("events.%s", eventName)
	}

	cqrsFacade, err := cqrs.NewFacade(cqrs.FacadeConfig{
		GenerateCommandsTopic: generateCommandTopic,
		CommandHandlers: func(cb *cqrs.CommandBus, eb *cqrs.EventBus) []cqrs.CommandHandler {
			return []cqrs.CommandHandler{
				CreateOrderCommandHandler{eventBus: eb},
			}
		},
		CommandsPublisher: publisher,
		CommandsSubscriberConstructor: func(handlerName string) (message.Subscriber, error) {
			// In Kafka, we can reuse the same subscriber instance since it handles multiple topics
			return commandsSubscriber, nil
		},

		GenerateEventsTopic: generateEventTopic,
		EventHandlers: func(cb *cqrs.CommandBus, eb *cqrs.EventBus) []cqrs.EventHandler {
			return []cqrs.EventHandler{
				OrderCreatedEventHandler{},
			}
		},
		EventsPublisher: publisher,
		EventsSubscriberConstructor: func(handlerName string) (message.Subscriber, error) {
			return eventsSubscriber, nil
		},

		Router:                router,
		CommandEventMarshaler: cqrs.JSONMarshaler{}, // Marshals payloads to JSON
		Logger:                logger,
	})
	if err != nil {
		log.Fatalf("Failed to create CQRS facade: %v", err)
	}

	// 7. Start the Router in the background
	go func() {
		if err := router.Run(context.Background()); err != nil {
			log.Fatalf("Router run error: %v", err)
		}
	}()

	// Wait for router to be ready
	<-router.Running()

	// 8. Publish a Command to trigger the flow
	cmd := &CreateOrderCommand{
		OrderID:   "ord-12345",
		ProductID: "prod-987",
	}

	log.Printf("Sending command: CreateOrderCommand for %s\n", cmd.OrderID)
	err = cqrsFacade.CommandBus().Send(context.Background(), cmd)
	if err != nil {
		log.Fatalf("Failed to send command: %v", err)
	}

	// Keep the program running briefly to allow messages to process
	// (In a real app you'd wait for OS signals)
	select {} 
}
