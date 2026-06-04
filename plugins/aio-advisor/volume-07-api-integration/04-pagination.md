# Pagination — Cursor, Offset, and Keyset

> "Pagination is the act of dividing a large result set into discrete pages. The interesting question is: what is the cost of asking for page N?" — Nelson Elhage

## The Problem

No production API returns all records in a single response. A user with 50,000 orders cannot receive them all at once — the response would be hundreds of megabytes, the database query would time out, and the client application would run out of memory trying to render the result. Pagination is the universal solution: break the result set into pages of manageable size and let the client navigate through them sequentially or randomly.

The naive implementation is offset pagination: `GET /orders?page=2&limit=50` means "skip the first 50 records and return the next 50." Every developer writes this on their first API. The database query is `SELECT * FROM orders LIMIT 50 OFFSET 50`. It is simple, intuitive, and broken in ways that only become apparent at scale.

The first problem is consistency. Offset pagination assumes the result set is static between page requests. In any real system, records are being created and deleted continuously. If a user requests page 1 (records 1-50), then a new record is created, then requests page 2 (records 51-100), the new record pushes what was record 51 to position 52. The old record 51 is now on page 1. The client never sees it on page 2. Records disappear and duplicate depending on whether inserts or deletes occur between page requests. For a paginated list of orders in an active system, this means clients routinely miss orders.

The second problem is performance. `SELECT * FROM orders ORDER BY created_at LIMIT 50 OFFSET 50000` requires the database to generate 50,000 rows, discard 49,950, and return 50. At small offsets this is fast. At `OFFSET 100000`, the database is doing enormous amounts of work to throw away rows. The query gets progressively slower as users navigate deeper into the result set. At page 2,000 of a large table, offset pagination has degraded from milliseconds to seconds.

Cursor-based and keyset-based pagination solve these problems, at the cost of features developers and users often want: the ability to jump to an arbitrary page number, display total page count, or sort by arbitrary columns.

## Core Concept

### Offset Pagination

The simplest form. Page number and page size (or offset and limit) are query parameters. The API returns a slice of the result set starting at position `offset`:

```
GET /orders?offset=100&limit=50
```

```json
{
  "orders": [...],
  "pagination": {
    "offset": 100,
    "limit": 50,
    "total": 2847,
    "hasNext": true,
    "hasPrev": true
  }
}
```

The `total` field answers "how many pages are there?" and enables UI components like "Page 3 of 57." This is valuable UX but costs a `COUNT(*)` query on every paginated request — expensive on large tables without careful indexing.

**Use offset pagination when:**
- Result sets are small and static (admin dashboards, configuration lists)
- Users need to jump to arbitrary pages by number
- Total count is required for UI
- The table has no more than a few thousand rows

### Cursor-Based Pagination

Instead of a positional offset, the API returns an opaque cursor token that encodes the position in the result set. The client passes this cursor on the next request to get the following page:

```
GET /orders?limit=50
→ returns orders 1-50, plus cursor: "eyJpZCI6NTAsInRzIjoiMjAyNC0wMS0xNVQxMDozMDowMFoifQ=="

GET /orders?limit=50&cursor=eyJpZCI6NTAsInRzIjoiMjAyNC0wMS0xNVQxMDozMDowMFoifQ==
→ returns orders 51-100, plus cursor: "eyJpZCI6MTAwLCJ0cyI6IjIwMjQtMDEtMTVUMTI6MDA6MDBaIn0="
```

The cursor is opaque to the client — they should not parse it. Internally it encodes the information needed to resume the query: typically the ID and sort key of the last record returned.

```json
{
  "orders": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6NTAsInRzIjoiMjAyNC0wMS0xNVQxMDozMDowMFoifQ==",
    "prevCursor": null,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Key properties:
- **Consistent under writes**: New records inserted after the cursor was issued do not shift the cursor's position. The client sees the result set as it was when they started paginating.
- **No total count**: Cursor pagination cannot efficiently compute a total count without scanning the entire table.
- **Forward-only by default**: While bidirectional cursors are possible (and useful), they require more complex cursor state.
- **Opaque**: Never expose the cursor's internal structure. Use base64 encoding. If you change the cursor format, old cursors must still work (or expire gracefully).

### Keyset Pagination

Keyset pagination is the database-level mechanism underlying cursor pagination. Instead of `OFFSET N`, the query uses a `WHERE` clause based on the value of the sort key:

```sql
-- Offset pagination (slow at large offsets)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 50 OFFSET 50000;

-- Keyset pagination (constant time regardless of depth)
SELECT * FROM orders
WHERE created_at < '2024-01-15T10:30:00Z'
   OR (created_at = '2024-01-15T10:30:00Z' AND id < 50)
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

The keyset query is fast because it uses an index on `(created_at, id)` to find the starting position directly, then scans forward 50 rows. The database never touches rows before the cursor position.

The complexity is in handling ties: if multiple records have identical `created_at` values, you must include the ID as a tiebreaker to ensure deterministic ordering and correct pagination. The cursor must encode both the sort key and the tiebreaker.

For an API, keyset pagination is usually implemented as cursor pagination: the cursor is the base64-encoded pair of `(created_at, id)`. The client sees a cursor; the database sees a keyset WHERE clause.

### Relay Cursor Connections (GraphQL)

The GraphQL Relay specification formalizes cursor-based pagination into a standard connection format that has become widely adopted even outside GraphQL:

```json
{
  "orders": {
    "edges": [
      {
        "cursor": "cursor_abc",
        "node": { "id": "1", "status": "PENDING" }
      },
      {
        "cursor": "cursor_def",
        "node": { "id": "2", "status": "FULFILLED" }
      }
    ],
    "pageInfo": {
      "hasNextPage": true,
      "hasPreviousPage": false,
      "startCursor": "cursor_abc",
      "endCursor": "cursor_def"
    }
  }
}
```

The Relay format assigns a cursor to each item in the page, not just the page boundary. This enables precise resumption: "give me the next page after item cursor_def" is unambiguous. The `pageInfo` object provides navigation metadata consistently.

## Deep Dive

The performance argument against offset pagination is more severe than most documentation conveys. A `SELECT * FROM orders ORDER BY created_at LIMIT 50 OFFSET 50000` query is not merely slower than a keyset equivalent — it becomes progressively and unboundedly slower as the offset grows. The database must materialize rows 1 through 50,000 before it can discard them and return rows 50,001 through 50,050. On a table with 10 million rows, requesting page 200,000 of 50 requires materializing 10 million rows to find the last 50. This is not a database tuning problem — it is a fundamental property of offset-based pagination that no index can fully resolve, because the index can locate the first row of the result set but cannot efficiently skip to an arbitrary position without counting through all preceding rows.

The keyset pagination pattern — using the actual values of the sort key rather than a positional offset — solves this by making the "where to start" query efficient. `SELECT * FROM orders WHERE created_at > '2024-01-15T10:30:00Z' AND id > 'ord-12345' ORDER BY created_at, id LIMIT 50` is index-efficient regardless of how many rows precede it in the result set. The database can use a composite index on `(created_at, id)` to jump directly to the first qualifying row. The page 200,000 query takes the same time as the page 1 query, because the query itself has constant cost given the keyset values from the previous page.

Google's AIP-158 specification for pagination represents the most carefully reasoned public treatment of the cursor pagination pattern. The AIP addresses several subtleties that simpler treatments ignore. First, the page token must be opaque to clients — it is a server-internal data structure that encodes the cursor position, and clients must not parse or construct it. This opacity gives the server freedom to change the cursor encoding without breaking clients. Second, the page token must be stable for a reasonable duration — Google specifies "at least a few hours" — so that clients navigating large result sets do not experience token expiration mid-traversal. Third, the server must handle page size limits gracefully: if a client requests `page_size=10000` and the server's maximum is 100, the server should silently clamp to 100 rather than returning an error, because clients should be able to request "as many as possible" and receive a reasonable response.

The consistency problem with offset pagination — where inserts and deletes between page requests cause records to appear on multiple pages or be skipped entirely — is not solvable within the offset model without using database snapshots (which are expensive and not supported by most databases). Cursor-based pagination sidesteps this problem for append-heavy workloads: if new records are always inserted with timestamps newer than the current cursor position, they will never appear in previously returned pages. But cursor pagination does not solve the problem for non-monotonic workloads where records can be inserted in the middle of the result set. The honest treatment of pagination consistency requires acknowledging that no pagination model provides perfect consistency for all workloads under concurrent modification, and that API designers should choose the model that best matches their workload's consistency requirements and performance characteristics.

The Stripe API design philosophy treats the opaque cursor as a developer experience feature, not just a technical detail. Stripe's pagination uses a `starting_after` parameter that accepts the ID of the last object received, which is a keyset approach presented with a friendlier interface. Rather than returning an opaque base64-encoded blob, Stripe returns the ID of the last object, which the client passes back as `starting_after`. The client's code reads naturally: "give me the next page of charges, starting after charge_123." The developer can see the cursor value, understand what it means, and debug pagination issues without decoding opaque tokens. This is a deliberate trade-off: the cursor is less opaque (which theoretically gives the server less freedom to change cursor semantics), but the developer experience is significantly better. Stripe's judgment is that developer experience is worth more than theoretical implementation freedom, particularly for a public API where developer trust and ease of integration are primary concerns.

## Implementation Guide

### Implementing Cursor Pagination (Go)

```go
type Cursor struct {
    ID        string    `json:"id"`
    CreatedAt time.Time `json:"ts"`
}

func encodeCursor(c Cursor) string {
    b, _ := json.Marshal(c)
    return base64.URLEncoding.EncodeToString(b)
}

func decodeCursor(token string) (Cursor, error) {
    b, err := base64.URLEncoding.DecodeString(token)
    if err != nil {
        return Cursor{}, fmt.Errorf("invalid cursor: %w", err)
    }
    var c Cursor
    if err := json.Unmarshal(b, &c); err != nil {
        return Cursor{}, fmt.Errorf("invalid cursor: %w", err)
    }
    return c, nil
}

func (s *OrderStore) List(ctx context.Context, req ListRequest) (*ListResponse, error) {
    limit := req.PageSize
    if limit <= 0 || limit > 100 {
        limit = 20
    }
    // Fetch one extra to determine if there's a next page
    fetchLimit := limit + 1

    var orders []Order
    var err error

    if req.PageToken == "" {
        // First page
        orders, err = s.db.QueryContext(ctx, `
            SELECT id, user_id, status, created_at
            FROM orders
            ORDER BY created_at DESC, id DESC
            LIMIT ?`, fetchLimit)
    } else {
        cursor, err := decodeCursor(req.PageToken)
        if err != nil {
            return nil, status.Errorf(codes.InvalidArgument, "invalid page_token")
        }
        // Keyset query using cursor
        orders, err = s.db.QueryContext(ctx, `
            SELECT id, user_id, status, created_at
            FROM orders
            WHERE (created_at, id) < (?, ?)
            ORDER BY created_at DESC, id DESC
            LIMIT ?`, cursor.CreatedAt, cursor.ID, fetchLimit)
    }
    if err != nil {
        return nil, fmt.Errorf("query failed: %w", err)
    }

    hasNext := len(orders) > limit
    if hasNext {
        orders = orders[:limit] // Remove the extra item
    }

    var nextToken string
    if hasNext {
        last := orders[len(orders)-1]
        nextToken = encodeCursor(Cursor{
            ID:        last.ID,
            CreatedAt: last.CreatedAt,
        })
    }

    return &ListResponse{
        Orders:        orders,
        NextPageToken: nextToken,
    }, nil
}
```

### Page Size Guidance

Setting appropriate page size defaults and limits requires measuring your actual use cases:

| Resource Type | Default | Maximum | Rationale |
|---|---|---|---|
| List items (text) | 20 | 100 | Fast rendering, reasonable memory |
| Admin/export | 100 | 1000 | Bulk operations need more |
| Search results | 10 | 50 | Matches search UI patterns |
| Audit logs | 50 | 500 | High volume, large pages needed |
| Large objects | 10 | 50 | Response size limits |

Always clamp silently: if the client requests `page_size=99999`, return `page_size` items as configured, not an error. Errors on oversized requests break clients unnecessarily.

### Total Count Performance

If you must provide total counts, never do `SELECT COUNT(*) FROM table` on every request. Alternatives:

1. **Separate count endpoint**: `GET /orders/count` for clients that need it
2. **Approximate counts**: Use `EXPLAIN` row estimates or materialized count tables updated asynchronously
3. **Bounded counts**: Return total only when total < threshold (e.g., "showing 50 of 847" vs "showing 50 of 10,000+")
4. **Progressive disclosure**: Return `hasMore: true/false` instead of total, and compute total separately on demand

## When to Use / When NOT to Use

**Offset pagination** is appropriate for:
- Small, stable datasets (< 10,000 rows with minimal write activity)
- Admin interfaces where users need to jump to specific page numbers
- Reports and exports where the full count is a required output
- Read replicas where consistency under concurrent writes is acceptable

**Cursor pagination** is appropriate for:
- Social feeds, activity streams, news feeds — any chronological list with frequent inserts
- Large datasets (millions of rows)
- Real-time data where consistency under writes matters
- Mobile infinite scroll patterns

**Avoid cursor pagination** when:
- Users need to jump to page N by number (not possible with opaque cursors)
- The sort order changes between page requests (cursors become invalid)
- Random access into the result set is required (use search/filter instead of pagination)

## Common Mistakes

**Mistake 1: Exposing cursor internals**

Never return a cursor like `"cursor": "id=50&created_at=2024-01-15"`. Clients will parse it, build logic on it, and break when you change the cursor format. Base64-encode cursors and document them as opaque tokens that expire.

**Mistake 2: Not handling cursor expiration**

Cursors encoding database state should expire. A cursor that is 30 days old may reference a deleted record or a stale sort key. Design cursors with a TTL and return a clear error when an expired cursor is used: `INVALID_ARGUMENT: page_token has expired, please restart pagination`.

**Mistake 3: Off-by-one errors in keyset queries**

The keyset WHERE clause must be exclusive (`<`) not inclusive (`<=`) at the cursor boundary, or the first record of page N+1 will duplicate the last record of page N.

**Mistake 4: Not indexing the sort key**

Keyset pagination is only fast if the database can use an index to find the cursor position. `ORDER BY created_at DESC, id DESC` requires a composite index on `(created_at DESC, id DESC)`. Without the index, the query scans the full table on every page request.

**Mistake 5: Fetching exact page size instead of page size + 1**

To determine if a next page exists without a `COUNT(*)` query, fetch `limit + 1` rows. If you receive `limit + 1` rows, there is a next page — return only `limit` rows. If you receive fewer than `limit + 1`, you are on the last page.

## Connections

**Resource-Oriented Design** (Article 01): Pagination belongs on collection endpoints (`GET /resources`). The collection response envelope is where `next_page_token` and `page_info` live. Per Google AIP-132, List methods always return collections and always support pagination.

**API Versioning** (Article 03): Changing pagination behavior (cursor format, page size defaults, field names) is a breaking change. If you need to change pagination behavior, do it in a new API version and provide a migration guide.

**API Design Principles** (Article 10): Google's AIP-158 specifies a standard pagination interface shared across all Google Cloud APIs. Consistency in pagination — same field names, same behavior, same response structure — dramatically reduces the cognitive load for developers working across multiple APIs.

## Key Insights

Infinite scroll changed the developer expectations for pagination. When Facebook and Twitter normalized the endless feed in 2009-2012, product managers began requiring infinite scroll for every paginated list. This has a direct architectural implication: infinite scroll requires cursor pagination. Numbered pages with "Page 1 of 57" UI require offset pagination. The UI design and the API design are tightly coupled.

The "fetch N+1 to determine if there's a next page" pattern is so universal in cursor pagination that it should be the first thing you implement. It avoids the `COUNT(*)` performance cost while giving clients everything they need to render "Load More" buttons correctly.

Consistency matters more than optimality. If your API uses `next_page_token` for list responses, use `next_page_token` everywhere — not `nextCursor` in some endpoints and `continuation_token` in others. The cognitive cost of remembering which endpoint uses which field name compounds across every developer who integrates with your API. Google's decision to standardize on `page_size`, `page_token`, and `next_page_token` across all Cloud APIs is one of the highest-value API consistency decisions they made.

Finally: the `total` count problem is not solved, it is accepted. Most high-scale APIs do not return total counts. Twitter does not tell you how many tweets are in your timeline. Google does not tell you how many results are in a search query (only an estimate). The cost of an accurate count — a full table scan or a separate counter with consistency guarantees — is not worth the benefit of showing "showing page 3 of 847" in most applications. Design for "has more pages" first, and add total counts only when product requirements clearly justify the cost.
