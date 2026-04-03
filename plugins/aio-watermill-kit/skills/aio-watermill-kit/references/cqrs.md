# Watermill CQRS Reference

Complete reference for the CQRS component in `github.com/ThreeDotsLabs/watermill/components/cqrs`.

## Table of Contents

1. [Overview](#overview)
2. [CommandBus](#commandbus)
3. [CommandProcessor](#commandprocessor)
4. [EventBus](#eventbus)
5. [EventProcessor](#eventprocessor)
6. [EventProcessorGroup](#eventprocessorgroup)
7. [Marshalers](#marshalers)
8. [Full Example](#full-example)

---

## Overview

The CQRS component lets you work with typed Go structs instead of raw `[]byte` payloads. It sits on top
of the Router and provides:

- **CommandBus** — publishes commands (1 command → 1 handler)
- **EventBus** — publishes events (1 event → N handlers)
- **CommandProcessor** — subscribes to commands, routes to handlers
- **EventProcessor** — subscribes to events, routes to handlers
- **Marshalers** — serialize/deserialize commands and events

The command/event name (used for routing) is derived from the Go struct name by the Marshaler.

---

## CommandBus

Publishes commands to topics. Each command type maps to one topic.

```go
commandBus, err := cqrs.NewCommandBusWithConfig(cqrs.CommandBusConfig{
    // Required: how to map command name → publish topic
    GeneratePublishTopic: func(params cqrs.CommandBusGeneratePublishTopicParams) (string, error) {
        return "commands." + params.CommandName, nil
    },

    // Required: serialization
    Marshaler: cqrs.JSONMarshaler{GenerateName: cqrs.StructName},

    // Optional: mutate message before publish (add metadata, etc.)
    OnSend: func(params cqrs.CommandBusOnSendParams) error {
        params.Message.Metadata.Set("sent_at", time.Now().Format(time.RFC3339))
        return nil
    },

    Logger: logger,
})

// Send a command
err = commandBus.Send(ctx, &PlaceOrder{OrderID: "123", Amount: 99.99})
```

---

## CommandProcessor

Subscribes to commands and invokes the matching handler. Registers handlers on the Router.

```go
commandProcessor, err := cqrs.NewCommandProcessorWithConfig(router, cqrs.CommandProcessorConfig{
    // Required: how to map command name → subscribe topic
    GenerateSubscribeTopic: func(params cqrs.CommandProcessorGenerateSubscribeTopicParams) (string, error) {
        return "commands." + params.CommandName, nil
    },

    // Required: create a subscriber for each handler
    SubscriberConstructor: func(params cqrs.CommandProcessorSubscriberConstructorParams) (message.Subscriber, error) {
        return subscriber, nil // typically return a new subscriber instance
    },

    // Required: same marshaler as CommandBus
    Marshaler: cqrs.JSONMarshaler{GenerateName: cqrs.StructName},

    // Optional: middleware-like hook before/after handling
    OnHandle: func(params cqrs.CommandProcessorOnHandleParams) error {
        log.Printf("Handling command: %s", params.CommandName)
        return params.Handler.Handle(params.Message.Context(), params.Command)
    },

    // Optional: ack even when handler returns error (default false)
    AckCommandHandlingErrors: false,

    Logger: logger,
})

// Register handlers
err = commandProcessor.AddHandlers(
    cqrs.NewCommandHandler("PlaceOrder", handlePlaceOrder),
    cqrs.NewCommandHandler("CancelOrder", handleCancelOrder),
)
```

### Command Handler

```go
// Function signature
func handlePlaceOrder(ctx context.Context, cmd *PlaceOrder) error {
    // Process command
    // Optionally publish events via EventBus
    return nil
}

// Or as a struct method
type PlaceOrderHandler struct {
    repo     OrderRepository
    eventBus *cqrs.EventBus
}

func (h *PlaceOrderHandler) Handle(ctx context.Context, cmd *PlaceOrder) error {
    order := NewOrder(cmd.OrderID, cmd.Amount)
    if err := h.repo.Save(ctx, order); err != nil {
        return err
    }
    return h.eventBus.Publish(ctx, &OrderPlaced{OrderID: order.ID})
}
```

---

## EventBus

Publishes events to topics. Unlike commands, events can have multiple handlers.

```go
eventBus, err := cqrs.NewEventBusWithConfig(cqrs.EventBusConfig{
    GeneratePublishTopic: func(params cqrs.EventBusGeneratePublishTopicParams) (string, error) {
        return "events." + params.EventName, nil
    },

    Marshaler: cqrs.JSONMarshaler{GenerateName: cqrs.StructName},

    // Optional: mutate message before publish
    OnPublish: func(params cqrs.EventBusOnPublishParams) error {
        params.Message.Metadata.Set("published_at", time.Now().Format(time.RFC3339))
        return nil
    },

    Logger: logger,
})

// Publish events
err = eventBus.Publish(ctx, &OrderPlaced{OrderID: "123"})
```

---

## EventProcessor

Subscribes to events and invokes handlers. Each handler gets its own subscriber by default, so multiple
handlers can independently process the same event.

```go
eventProcessor, err := cqrs.NewEventProcessorWithConfig(router, cqrs.EventProcessorConfig{
    GenerateSubscribeTopic: func(params cqrs.EventProcessorGenerateSubscribeTopicParams) (string, error) {
        return "events." + params.EventName, nil
    },

    SubscriberConstructor: func(params cqrs.EventProcessorSubscriberConstructorParams) (message.Subscriber, error) {
        // Each handler gets its own subscriber → independent consumption
        return newSubscriber(), nil
    },

    Marshaler: cqrs.JSONMarshaler{GenerateName: cqrs.StructName},

    // Optional: ack unknown events (default false → Nack)
    AckOnUnknownEvent: true,

    Logger: logger,
})

err = eventProcessor.AddHandlers(
    cqrs.NewEventHandler("UpdateReadModel", handleOrderPlacedForReadModel),
    cqrs.NewEventHandler("SendNotification", handleOrderPlacedForNotification),
)
```

### Event Handler

```go
func handleOrderPlacedForReadModel(ctx context.Context, event *OrderPlaced) error {
    return readModelRepo.Upsert(ctx, event.OrderID, event)
}

func handleOrderPlacedForNotification(ctx context.Context, event *OrderPlaced) error {
    return notifier.Send(ctx, "Order placed: " + event.OrderID)
}
```

---

## EventProcessorGroup

Optimized variant where multiple handlers share a single subscriber. Useful when you have many handlers
for the same event and want to reduce subscriber count.

```go
eventProcessor.AddHandlersGroup(
    "order_events",     // group name
    cqrs.NewGroupEventHandler("UpdateInventory", handleOrderPlacedForInventory),
    cqrs.NewGroupEventHandler("UpdateMetrics", handleOrderPlacedForMetrics),
)
```

All handlers in the group process each event sequentially (one subscriber, ordered). Use this when
ordering matters between handlers, or to reduce connection count to the broker.

---

## Marshalers

Marshalers serialize/deserialize commands and events. They also determine the command/event name used
for topic routing.

### JSONMarshaler

```go
marshaler := cqrs.JSONMarshaler{
    GenerateName: cqrs.StructName, // uses Go struct name as command/event name
}
```

`GenerateName` options:
- `cqrs.StructName` — `"PlaceOrder"` (simple struct name)
- `cqrs.FullyQualifiedStructName` — `"myapp/commands.PlaceOrder"` (with package path)
- Custom function: `func(v interface{}) string { return "custom_name" }`

### ProtoMarshaler

For Protocol Buffers:

```go
marshaler := cqrs.ProtobufMarshaler{}
// Commands/events must implement proto.Message
```

### GoGo Protobuf

```go
marshaler := cqrs.GoGoProtobufMarshaler{}
// For github.com/gogo/protobuf
```

### Custom Marshaler

Implement the `CommandEventMarshaler` interface:

```go
type CommandEventMarshaler interface {
    Marshal(v interface{}) (*message.Message, error)
    Unmarshal(msg *message.Message, v interface{}) error
    Name(v interface{}) string
    NameFromMessage(msg *message.Message) string
}
```

### Marshaler Decorator

Wrap any marshaler to add metadata or transform messages:

```go
decorated := cqrs.CommandEventMarshalerDecorator{
    Marshaler: cqrs.JSONMarshaler{GenerateName: cqrs.StructName},
    DecorateFunc: func(msg *message.Message) {
        msg.Metadata.Set("version", "v1")
    },
}
```

---

## Full Example

Complete CQRS setup wiring everything together:

```go
func setupCQRS(router *message.Router, pub message.Publisher, subFactory func() message.Subscriber, logger watermill.LoggerAdapter) error {
    marshaler := cqrs.JSONMarshaler{GenerateName: cqrs.StructName}

    // Event Bus
    eventBus, err := cqrs.NewEventBusWithConfig(cqrs.EventBusConfig{
        GeneratePublishTopic: func(params cqrs.EventBusGeneratePublishTopicParams) (string, error) {
            return "events." + params.EventName, nil
        },
        Marshaler: marshaler,
        Logger:    logger,
    })
    if err != nil {
        return err
    }

    // Command Bus
    commandBus, err := cqrs.NewCommandBusWithConfig(cqrs.CommandBusConfig{
        GeneratePublishTopic: func(params cqrs.CommandBusGeneratePublishTopicParams) (string, error) {
            return "commands." + params.CommandName, nil
        },
        Marshaler: marshaler,
        Logger:    logger,
    })
    if err != nil {
        return err
    }

    // Command Processor
    commandProcessor, err := cqrs.NewCommandProcessorWithConfig(router, cqrs.CommandProcessorConfig{
        GenerateSubscribeTopic: func(params cqrs.CommandProcessorGenerateSubscribeTopicParams) (string, error) {
            return "commands." + params.CommandName, nil
        },
        SubscriberConstructor: func(params cqrs.CommandProcessorSubscriberConstructorParams) (message.Subscriber, error) {
            return subFactory(), nil
        },
        Marshaler: marshaler,
        Logger:    logger,
    })
    if err != nil {
        return err
    }

    // Event Processor
    eventProcessor, err := cqrs.NewEventProcessorWithConfig(router, cqrs.EventProcessorConfig{
        GenerateSubscribeTopic: func(params cqrs.EventProcessorGenerateSubscribeTopicParams) (string, error) {
            return "events." + params.EventName, nil
        },
        SubscriberConstructor: func(params cqrs.EventProcessorSubscriberConstructorParams) (message.Subscriber, error) {
            return subFactory(), nil
        },
        Marshaler: marshaler,
        Logger:    logger,
    })
    if err != nil {
        return err
    }

    // Register handlers
    if err := commandProcessor.AddHandlers(
        cqrs.NewCommandHandler("PlaceOrder", NewPlaceOrderHandler(eventBus).Handle),
    ); err != nil {
        return err
    }

    if err := eventProcessor.AddHandlers(
        cqrs.NewEventHandler("OrderPlaced-ReadModel", handleOrderPlacedReadModel),
        cqrs.NewEventHandler("OrderPlaced-Notify", handleOrderPlacedNotify),
    ); err != nil {
        return err
    }

    return nil
}
```
