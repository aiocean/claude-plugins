# gRPC (Production)

## Protobuf API Design

```proto
// proto/users/v1/users.proto — ALWAYS version your packages
syntax = "proto3";
package users.v1;
option go_package = "example.com/myapp/gen/users/v1;usersv1";

service UsersService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream User);
}

message GetUserRequest { string id = 1; }
message GetUserResponse { User user = 1; }
message ListUsersRequest { int32 page_size = 1; string page_token = 2; }
message User { string id = 1; string email = 2; string display_name = 3; }
```

## Code Generation

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

protoc -I proto \
  --go_out=./gen --go_opt=paths=source_relative \
  --go-grpc_out=./gen --go-grpc_opt=paths=source_relative \
  proto/users/v1/users.proto
```

## Server Implementation

```go
type Service struct {
    usersv1.UnimplementedUsersServiceServer
    Repo Repo
}

func (s *Service) GetUser(ctx context.Context, req *usersv1.GetUserRequest) (*usersv1.GetUserResponse, error) {
    if req.GetId() == "" {
        return nil, status.Error(codes.InvalidArgument, "id is required")
    }
    u, err := s.Repo.GetUser(ctx, req.GetId())
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            return nil, status.Error(codes.NotFound, "user not found")
        }
        return nil, status.Error(codes.Internal, "internal error")
    }
    return &usersv1.GetUserResponse{User: toProto(u)}, nil
}
```

**Rule: Always map domain errors to gRPC status codes.** Never return raw `errors.New()`.

## Deadlines

```go
// Server: require deadline on expensive operations
if _, ok := ctx.Deadline(); !ok {
    return nil, status.Error(codes.InvalidArgument, "deadline required")
}

// Client: always set deadline
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
resp, err := client.GetUser(ctx, req)
```

## Interceptors (Middleware)

```go
func unaryRequestID() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
        id := uuid.NewString()
        ctx = context.WithValue(ctx, requestIDKey{}, id)
        return handler(ctx, req)
    }
}

// Register
srv := grpc.NewServer(
    grpc.ChainUnaryInterceptor(unaryRequestID(), unaryLogging(), unaryRecovery()),
)
```

## Server Streaming

```go
func (s *Service) ListUsers(req *usersv1.ListUsersRequest, stream usersv1.UsersService_ListUsersServer) error {
    users, err := s.Repo.ListUsers(stream.Context(), int(req.GetPageSize()))
    if err != nil { return status.Error(codes.Internal, "internal error") }

    for _, u := range users {
        select {
        case <-stream.Context().Done():
            return stream.Context().Err()
        default:
        }
        if err := stream.Send(toProto(u)); err != nil { return err }
    }
    return nil
}
```

**Streaming decision:**
- **Unary** — single req/resp, simple retries
- **Server stream** — large result sets, continuous updates
- **Client stream** — bulk uploads with one final response
- **Bidirectional** — interactive protocols

## Health Checks + Reflection

```go
hs := health.NewServer()
grpc_health_v1.RegisterHealthServer(srv, hs)

if env != "production" {
    reflection.Register(srv)  // Never expose in production
}
```

## Graceful Shutdown

```go
stopped := make(chan struct{})
go func() { srv.GracefulStop(); close(stopped) }()

select {
case <-stopped:
case <-time.After(10 * time.Second):
    srv.Stop()  // Force stop after deadline
}
```

## TLS

```go
// Server
creds, _ := credentials.NewServerTLSFromFile("server.crt", "server.key")
srv := grpc.NewServer(grpc.Creds(creds))

// Client
creds, _ := credentials.NewClientTLSFromFile("ca.crt", "")
conn, _ := grpc.Dial(addr, grpc.WithTransportCredentials(creds))
```

## Testing with bufconn

```go
func setupTest(t *testing.T) usersv1.UsersServiceClient {
    lis := bufconn.Listen(1024 * 1024)
    srv := grpc.NewServer()
    usersv1.RegisterUsersServiceServer(srv, &Service{Repo: mockRepo})
    go func() { _ = srv.Serve(lis) }()
    t.Cleanup(func() { srv.Stop() })

    conn, _ := grpc.DialContext(context.Background(), "bufnet",
        grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) { return lis.Dial() }),
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    t.Cleanup(func() { conn.Close() })
    return usersv1.NewUsersServiceClient(conn)
}

func TestGetUser(t *testing.T) {
    client := setupTest(t)
    resp, err := client.GetUser(context.Background(), &usersv1.GetUserRequest{Id: "1"})
    if err != nil { t.Fatal(err) }
    if resp.User.Email != "alice@example.com" { t.Error("wrong email") }
}
```

## Anti-Patterns

- **Ignore deadlines** — unbounded handlers cause tail latency
- **Return string errors** — always use `status.Error(codes.X, "...")`
- **Stream without backpressure** — check `ctx.Done()` and handle `Send` errors
- **Expose reflection in production** — it's a discovery surface
- **No health checks** — load balancers need them
