package main

import (
	"context"
	"log"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v3/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/components/cqrs"
	"github.com/ThreeDotsLabs/watermill/message"
)

// 1. Define Commands and Events
// Commands represent an intent to change state (e.g., BookFlight)
type BookFlight struct {
	BookingID string `json:"booking_id"`
	Passenger string `json:"passenger"`
}

// Events represent a fact that has already occurred (e.g., FlightBooked)
type FlightBooked struct {
	BookingID string    `json:"booking_id"`
	Timestamp time.Time `json:"timestamp"`
}

func main() {
	logger := watermill.NewStdLogger(false, false)

	// Configure Kafka Publisher
	publisher, err := kafka.NewPublisher(
		kafka.PublisherConfig{
			Brokers:   []string{"localhost:9092"},
			Marshaler: kafka.DefaultMarshaler{},
		},
		logger,
	)
	if err != nil {
		panic(err)
	}
	defer publisher.Close()

	// Helper to create Kafka Subscribers
	createSubscriber := func(consumerGroup string) (message.Subscriber, error) {
		return kafka.NewSubscriber(
			kafka.SubscriberConfig{
				Brokers:       []string{"localhost:9092"},
				Unmarshaler:   kafka.DefaultMarshaler{},
				ConsumerGroup: consumerGroup,
			},
			logger,
		)
	}

	router, err := message.NewRouter(message.RouterConfig{}, logger)
	if err != nil {
		panic(err)
	}

	// CQRS separates read and write operations.
	// CommandHandlers process intent and typically emit Events.
	// EventHandlers listen to facts and update read models or trigger other actions.

	// 2. CQRS Facade configuration
	cqrsFacade, err := cqrs.NewFacade(cqrs.FacadeConfig{
		GenerateCommandsTopic: func(commandName string) string {
			return "commands." + commandName
		},
		CommandHandlers: func(cb *cqrs.CommandBus, eb *cqrs.EventBus) []cqrs.CommandHandler {
			return []cqrs.CommandHandler{
				BookFlightHandler{eventBus: eb},
			}
		},
		CommandsPublisher: publisher,
		CommandsSubscriberConstructor: func(handlerName string) (message.Subscriber, error) {
			return createSubscriber("commands_consumer_group")
		},
		GenerateEventsTopic: func(eventName string) string {
			return "events." + eventName
		},
		EventHandlers: func(cb *cqrs.CommandBus, eb *cqrs.EventBus) []cqrs.EventHandler {
			return []cqrs.EventHandler{
				FlightBookedHandler{},
			}
		},
		EventsPublisher: publisher,
		EventsSubscriberConstructor: func(handlerName string) (message.Subscriber, error) {
			return createSubscriber("events_consumer_group")
		},
		Router:                router,
		CommandEventMarshaler: cqrs.JSONMarshaler{},
		Logger:                logger,
	})
	if err != nil {
		panic(err)
	}

	// 3. Start the Router in the background
	go func() {
		if err := router.Run(context.Background()); err != nil {
			panic(err)
		}
	}()

	<-router.Running()

	// 4. Send a command
	command := BookFlight{
		BookingID: "BKG-12345",
		Passenger: "Alice",
	}

	log.Println("Sending BookFlight command...")
	err = cqrsFacade.CommandBus().Send(context.Background(), command)
	if err != nil {
		panic(err)
	}

	// Wait a moment for messages to be processed
	time.Sleep(time.Second * 2)
}

// -----------------------------------------------------------------------------
// Command Handlers
// -----------------------------------------------------------------------------

// BookFlightHandler handles the BookFlight command
type BookFlightHandler struct {
	eventBus *cqrs.EventBus
}

func (h BookFlightHandler) HandlerName() string {
	return "BookFlightHandler"
}

func (h BookFlightHandler) NewCommand() interface{} {
	return &BookFlight{}
}

func (h BookFlightHandler) Handle(ctx context.Context, cmd interface{}) error {
	bookFlight := cmd.(*BookFlight)

	log.Printf("Processing BookFlight command for booking %s...", bookFlight.BookingID)

	// Perform business logic here (e.g., reserve seat, charge credit card)

	// Emit an event indicating the outcome
	event := FlightBooked{
		BookingID: bookFlight.BookingID,
		Timestamp: time.Now(),
	}

	log.Printf("Publishing FlightBooked event for booking %s...", event.BookingID)
	return h.eventBus.Publish(ctx, event)
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------

// FlightBookedHandler handles the FlightBooked event
type FlightBookedHandler struct{}

func (h FlightBookedHandler) HandlerName() string {
	return "FlightBookedHandler"
}

func (h FlightBookedHandler) NewEvent() interface{} {
	return &FlightBooked{}
}

func (h FlightBookedHandler) Handle(ctx context.Context, ev interface{}) error {
	flightBooked := ev.(*FlightBooked)

	log.Printf("Received FlightBooked event for booking %s at %v", flightBooked.BookingID, flightBooked.Timestamp)
	// Update read models, send notification emails, etc.
	return nil
}
