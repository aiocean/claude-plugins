package main

import (
	"context"
	"log"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/components/cqrs"
	"github.com/ThreeDotsLabs/watermill/message"
)

// 1. Define Command and Event payloads
type BookRoomCommand struct {
	RoomID string `json:"room_id"`
	Guest  string `json:"guest"`
}

type RoomBookedEvent struct {
	RoomID string `json:"room_id"`
	Guest  string `json:"guest"`
}

func main() {
	logger := watermill.NewStdLogger(false, false)

	// 2. Setup Kafka Publisher and Subscriber
	// Replace brokers with your actual Kafka broker addresses
	brokers := []string{"localhost:9092"}

	publisher, err := kafka.NewPublisher(
		kafka.PublisherConfig{
			Brokers:   brokers,
			Marshaler: kafka.DefaultMarshaler{},
		},
		logger,
	)
	if err != nil {
		log.Fatalf("Failed to create publisher: %v", err)
	}
	defer publisher.Close()

	subscriber, err := kafka.NewSubscriber(
		kafka.SubscriberConfig{
			Brokers:       brokers,
			Unmarshaler:   kafka.DefaultMarshaler{},
			ConsumerGroup: "my_cqrs_group",
		},
		logger,
	)
	if err != nil {
		log.Fatalf("Failed to create subscriber: %v", err)
	}
	defer subscriber.Close()

	// 3. Setup Router
	router, err := message.NewRouter(message.RouterConfig{}, logger)
	if err != nil {
		log.Fatalf("Failed to create router: %v", err)
	}

	// 4. Setup CQRS Facade
	// The CQRS component handles routing messages to the right handlers
	cqrsFacade, err := cqrs.NewFacade(cqrs.FacadeConfig{
		GenerateCommandsTopic: func(commandName string) string {
			return "commands." + commandName
		},
		CommandHandlers: func(cb *cqrs.CommandBus, eb *cqrs.EventBus) []cqrs.CommandHandler {
			return []cqrs.CommandHandler{
				NewBookRoomHandler(eb),
			}
		},
		CommandsPublisher: publisher,
		CommandsSubscriberConstructor: func(handlerName string) (message.Subscriber, error) {
			// In Kafka, we typically use the same subscriber instance, or create a new one per handler.
			// Reusing the subscriber is often fine for simple setups if ConsumerGroup is set.
			return subscriber, nil
		},
		GenerateEventsTopic: func(eventName string) string {
			return "events." + eventName
		},
		EventHandlers: func(cb *cqrs.CommandBus, eb *cqrs.EventBus) []cqrs.EventHandler {
			return []cqrs.EventHandler{
				NewRoomBookedHandler(),
			}
		},
		EventsPublisher: publisher,
		EventsSubscriberConstructor: func(handlerName string) (message.Subscriber, error) {
			return subscriber, nil
		},
		Router:                router,
		CommandEventMarshaler: cqrs.JSONMarshaler{},
		Logger:                logger,
	})
	if err != nil {
		log.Fatalf("Failed to create CQRS facade: %v", err)
	}

	// 5. Publish a Command (simulating an external request)
	go func() {
		// Wait for router to start
		// In a real app, you'd wait for router.Running() channel
		cmd := &BookRoomCommand{
			RoomID: "101",
			Guest:  "Alice",
		}
		log.Printf("Publishing command: %+v\n", cmd)
		err := cqrsFacade.CommandBus().Send(context.Background(), cmd)
		if err != nil {
			log.Printf("Failed to send command: %v", err)
		}
	}()

	// 6. Run the router (blocks until stopped)
	if err := router.Run(context.Background()); err != nil {
		log.Fatalf("Router error: %v", err)
	}
}

// --- Handlers Implementation ---

// BookRoomHandler handles the BookRoomCommand
type BookRoomHandler struct {
	eventBus *cqrs.EventBus
}

func NewBookRoomHandler(eventBus *cqrs.EventBus) *BookRoomHandler {
	return &BookRoomHandler{eventBus: eventBus}
}

func (h *BookRoomHandler) HandlerName() string {
	return "BookRoomHandler"
}

func (h *BookRoomHandler) NewCommand() interface{} {
	return &BookRoomCommand{}
}

func (h *BookRoomHandler) Handle(ctx context.Context, c interface{}) error {
	cmd := c.(*BookRoomCommand)
	log.Printf("Handling command: Book Room %s for %s\n", cmd.RoomID, cmd.Guest)

	// Business logic goes here (e.g., save to DB)

	// Publish the resulting event
	event := &RoomBookedEvent{
		RoomID: cmd.RoomID,
		Guest:  cmd.Guest,
	}
	return h.eventBus.Publish(ctx, event)
}

// RoomBookedHandler handles the RoomBookedEvent
type RoomBookedHandler struct{}

func NewRoomBookedHandler() *RoomBookedHandler {
	return &RoomBookedHandler{}
}

func (h *RoomBookedHandler) HandlerName() string {
	return "RoomBookedHandler"
}

func (h *RoomBookedHandler) NewEvent() interface{} {
	return &RoomBookedEvent{}
}

func (h *RoomBookedHandler) Handle(ctx context.Context, e interface{}) error {
	event := e.(*RoomBookedEvent)
	log.Printf("Handling event: Room %s was booked for %s\n", event.RoomID, event.Guest)

	// Side effects go here (e.g., send email, update read model)
	return nil
}
