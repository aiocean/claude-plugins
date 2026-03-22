---
name: aio-react-minimal-effects
description: Use when reviewing React code for unnecessary useEffect usage, refactoring to React 19 patterns, or as useEffect best practices reference. Scan mode actively finds and fixes problematic effects. Also use when user has multiple useEffect calls, derived state via effect+setState, effect chains, polling patterns, or asks about React 19 patterns, React Compiler, useActionState, useOptimistic, ref as prop.
---

## Environment
- tsc: !`tsc --version 2>/dev/null || echo "NOT INSTALLED"`

# React 19 Minimal Effects

## Scan Mode (when user has existing React code)

Use this mode to actively audit a codebase for problematic useEffect patterns and fix them.

### Step 1: SCAN
Search the codebase for all `useEffect` usage:
```bash
grep -rn "useEffect" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" src/
```
Also search for related anti-patterns:
```bash
grep -rn "forwardRef\|useCallback\|useMemo" --include="*.tsx" --include="*.ts" src/
```

### Step 2: CLASSIFY
For each `useEffect` found, classify into one of these categories:

| Category | Signal | Severity |
|----------|--------|----------|
| **Unnecessary** (derived state) | `useEffect(() => setState(f(x)), [x])` | HIGH - remove entirely |
| **Resettable** (state reset on prop) | `useEffect(() => setState(init), [prop])` | HIGH - use key prop |
| **Event-driven** (user action response) | `useEffect` triggered by user interaction state | MEDIUM - move to handler |
| **Chain** (effect triggers effect) | Multiple `useEffect` with interdependent state | MEDIUM - consolidate |
| **Notification** (parent callback in effect) | `useEffect(() => onChange(val), [val])` | MEDIUM - call in event |
| **Legitimate** (external sync) | Data fetching, subscriptions, DOM listeners, third-party widgets | OK - keep or use library |

### Step 3: REPORT
Output a table sorted by severity:
```
| File:Line | Category | Current Code (summary) | Recommended Fix |
```

### Step 4: REFACTOR
For each non-legitimate useEffect, apply the specific fix from the Reference patterns below. After refactoring, verify the component still works and no render loops were introduced.

---

## Reference Mode (patterns and knowledge)

Most `useEffect` usage is wrong. Effects are for **synchronizing with external systems**, not for:

- Computing derived values
- Handling user events
- Transforming data
- Chaining state updates

## React 19 Features

### React Compiler (Auto-Memoization)

React Compiler automatically optimizes components. Manual memoization is now optional.

**Setup (Vite):**

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
});
```

**What Compiler Does Automatically:**

| Manual Code (Before)           | Compiler Handles (After)            |
| ------------------------------ | ----------------------------------- |
| `React.memo(Component)`        | Auto-memoized renders               |
| `useMemo(() => val, [deps])`   | Auto-memoized values                |
| `useCallback(fn, [deps])`      | Auto-memoized callbacks             |

**Note:** Existing `useMemo`/`useCallback` still work - compiler is smart about duplicates.

### ref as Prop (No forwardRef)

React 19 treats `ref` as a regular prop. `forwardRef` is deprecated.

```tsx
// OLD: React 18
const Button = React.forwardRef<HTMLButtonElement, Props>((props, ref) => {
  return <button ref={ref}>{props.children}</button>;
});

// NEW: React 19
function Button({ ref, children }: { ref?: React.Ref<HTMLButtonElement>; children: React.ReactNode }) {
  return <button ref={ref}>{children}</button>;
}
```

### New Hooks

#### useActionState (Async Actions)

Track pending/error state for async actions without manual useState.

```tsx
// OLD: Manual state management
function Form() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    setIsPending(true);
    setError(null);
    try {
      await submitForm(formData);
    } catch (e) {
      setError(e);
    } finally {
      setIsPending(false);
    }
  }
}

// NEW: useActionState
function Form() {
  const [state, submitAction, isPending] = useActionState(
    async (prevState, formData) => {
      const result = await submitForm(formData);
      return result;
    },
    null // initial state
  );

  return (
    <form action={submitAction}>
      <button disabled={isPending}>Submit</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

#### useOptimistic (Instant UI Feedback)

Show optimistic updates while server confirms.

```tsx
function TodoList({ todos }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }]
  );

  async function handleAdd(formData) {
    const newTodo = { text: formData.get("text") };
    addOptimisticTodo(newTodo); // Instant UI update
    await saveTodo(newTodo);    // Server confirms later
  }

  return (
    <ul>
      {optimisticTodos.map((todo) => (
        <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

#### useFormStatus (Form State Without Prop Drilling)

Access form pending state from any nested component.

```tsx
function SubmitButton() {
  const { pending } = useFormStatus(); // No props needed!
  return <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>;
}

function Form() {
  return (
    <form action={submitAction}>
      <input name="email" />
      <SubmitButton /> {/* Knows form state automatically */}
    </form>
  );
}
```

#### use() API (Conditional Context/Promise)

Read Promise or Context conditionally (unlike hooks, can be called in conditions).

```tsx
function Comments({ commentsPromise }) {
  // Can be called conditionally!
  if (someCondition) {
    const comments = use(commentsPromise); // Suspends until resolved
    return <CommentList comments={comments} />;
  }
  return null;
}

// Conditional context
function Theme({ showTheme }) {
  if (showTheme) {
    const theme = use(ThemeContext); // Conditional context read
    return <div style={{ color: theme.color }}>Themed</div>;
  }
  return <div>No theme</div>;
}
```

## Rules of React (Compiler Enforced)

These rules are enforced by React Compiler and eslint-plugin-react-hooks. Breaking them causes bugs.

### 1. Components Must Be Pure

```tsx
// BAD: Side effect during render
function Component() {
  document.title = "Hello"; // Side effect!
  return <div />;
}

// GOOD: Side effect in useEffect
function Component() {
  useEffect(() => {
    document.title = "Hello";
  }, []);
  return <div />;
}
```

### 2. Props and State Are Immutable

```tsx
// BAD: Mutating props
function Component({ items }) {
  items.push(newItem); // Mutation!
  return <List items={items} />;
}

// GOOD: Create new array
function Component({ items }) {
  const newItems = [...items, newItem];
  return <List items={newItems} />;
}
```

### 3. Hooks at Top Level Only

```tsx
// BAD: Conditional hook
function Component({ isLoggedIn }) {
  if (isLoggedIn) {
    useEffect(() => {}); // Conditional!
  }
}

// GOOD: Condition inside hook
function Component({ isLoggedIn }) {
  useEffect(() => {
    if (isLoggedIn) {
      // ...
    }
  }, [isLoggedIn]);
}
```

## Pattern 1: Derived State

**The #1 useEffect mistake.** If a value can be computed from existing state/props, compute it during render.

### BAD: useEffect + setState

```tsx
function Form() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");

  // BAD: Causes extra render, stale value flash
  useEffect(() => {
    setFullName(`${firstName} ${lastName}`);
  }, [firstName, lastName]);
}
```

### GOOD: Compute During Render

```tsx
function Form() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // GOOD: Computed inline, no extra render
  const fullName = `${firstName} ${lastName}`;
}
```

### GOOD: useMemo for Expensive Calculations

```tsx
function TodoList({ todos, filter }) {
  // Only recompute when todos or filter change
  const visibleTodos = useMemo(() => filterTodos(todos, filter), [todos, filter]);
}
```

**Rule:** If you have `useEffect(() => setState(f(x)), [x])`, replace with `useMemo` or inline computation.

## Pattern 2: Reset State on Prop Change

### BAD: useEffect to Reset

```tsx
function ProfilePage({ userId }) {
  const [comment, setComment] = useState("");

  // BAD: Renders with stale state, then resets
  useEffect(() => {
    setComment("");
  }, [userId]);
}
```

### GOOD: Use Key Prop

```tsx
function ProfilePage({ userId }) {
  // GOOD: Component remounts with fresh state
  return <Profile userId={userId} key={userId} />;
}

function Profile({ userId }) {
  const [comment, setComment] = useState(""); // Fresh on key change
}
```

## Pattern 3: Event Handlers Not Effects

User interactions should be handled in event handlers, not effects.

### BAD: Effect for User Action

```tsx
function ProductPage({ product, addToCart }) {
  // BAD: Runs on any product change, not user action
  useEffect(() => {
    if (product.isInCart) {
      showNotification("Added to cart!");
    }
  }, [product]);
}
```

### GOOD: Handle in Event

```tsx
function ProductPage({ product, addToCart }) {
  function handleBuyClick() {
    addToCart(product);
    showNotification("Added to cart!"); // Same event, clear causality
  }
}
```

**Rule:** If code runs because user did something, put it in the event handler.

## Pattern 4: No Effect Chains

Multiple effects updating state in sequence = render waterfall.

### BAD: Chain of Effects

```tsx
function Game() {
  const [card, setCard] = useState(null);
  const [goldCount, setGoldCount] = useState(0);
  const [round, setRound] = useState(1);

  // Effect 1 triggers Effect 2 triggers Effect 3...
  useEffect(() => {
    if (card?.gold) setGoldCount((c) => c + 1);
  }, [card]);

  useEffect(() => {
    if (goldCount > 3) {
      setRound((r) => r + 1);
      setGoldCount(0);
    }
  }, [goldCount]);
}
```

### GOOD: Single Event Handler

```tsx
function Game() {
  const [card, setCard] = useState(null);
  const [goldCount, setGoldCount] = useState(0);
  const [round, setRound] = useState(1);

  function handlePlaceCard(nextCard) {
    setCard(nextCard);
    if (nextCard.gold) {
      if (goldCount < 3) {
        setGoldCount(goldCount + 1);
      } else {
        setGoldCount(0);
        setRound(round + 1);
      }
    }
  }
}
```

## Pattern 5: Notify Parent in Event

### BAD: Effect to Notify Parent

```tsx
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);

  // BAD: Effect runs after render, causes parent re-render
  useEffect(() => {
    onChange(isOn);
  }, [isOn, onChange]);
}
```

### GOOD: Notify in Same Event

```tsx
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);

  function handleClick() {
    const nextIsOn = !isOn;
    setIsOn(nextIsOn);
    onChange(nextIsOn); // Same event batch
  }
}
```

## Pattern 6: Data Fetching

Use libraries instead of raw useEffect for data fetching.

### BAD: Raw useEffect

```tsx
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchResults(query).then((data) => {
      if (!ignore) {
        setResults(data);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [query]);
}
```

### GOOD: Use React Query / SWR

```tsx
function SearchResults({ query }) {
  const { data, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => fetchResults(query),
  });
}
```

**Why:** Libraries handle caching, deduplication, race conditions, background refresh.

## Pattern 7: External Subscriptions

### BAD: useEffect for Subscriptions

```tsx
function ChatIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const sub = subscribe((status) => setIsOnline(status));
    return () => sub.unsubscribe();
  }, []);
}
```

### GOOD: useSyncExternalStore

```tsx
function ChatIndicator() {
  const isOnline = useSyncExternalStore(
    subscribe, // subscribe function
    getSnapshot, // get current value
  );
}
```

## Pattern 8: One-Time Init

### BAD: Multiple Empty Effects

```tsx
function App() {
  useEffect(() => {
    initAnalytics();
  }, []);
  useEffect(() => {
    loadUser();
  }, []);
  useEffect(() => {
    checkPermissions();
  }, []);
}
```

### GOOD: useMountEffect Hook

```tsx
// hooks/useMountEffect.ts
export function useMountEffect(fn: () => void | (() => void)) {
  useEffect(fn, []);
}

// Usage
function App() {
  useMountEffect(() => {
    initAnalytics();
    loadUser();
    checkPermissions();
  });
}
```

## Pattern 9: No Polling

### BAD: setInterval Polling

```tsx
useEffect(() => {
  const interval = setInterval(checkStatus, 1000);
  return () => clearInterval(interval);
}, []);
```

### GOOD: Event-Based

```tsx
useMountEffect(() => {
  checkStatus(); // Initial

  const onVisible = () => {
    if (document.visibilityState === "visible") checkStatus();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => document.removeEventListener("visibilitychange", onVisible);
});
```

## When useEffect IS Correct

Use effects only for synchronizing with external systems:

```tsx
// 1. Browser APIs
useEffect(() => {
  const handler = (e) => setPosition({ x: e.clientX, y: e.clientY });
  window.addEventListener("mousemove", handler);
  return () => window.removeEventListener("mousemove", handler);
}, []);

// 2. Third-party widgets
useEffect(() => {
  const map = new MapWidget(ref.current);
  map.setCenter(coordinates);
  return () => map.destroy();
}, [coordinates]);

// 3. Network (if not using library)
useEffect(() => {
  let cancelled = false;
  fetch(url).then((res) => {
    if (!cancelled) setData(res);
  });
  return () => {
    cancelled = true;
  };
}, [url]);
```

## Important Nuance: Reactive Sync During Render

**"No side effects during render"** applies to EXTERNAL mutations, NOT to syncing derived state from reactive sources.

### When Render-Time Callbacks ARE Correct

When using reactive primitives like `useSyncExternalStore` or tldraw's `useValue`, calling callbacks during render is the CORRECT pattern:

```tsx
// CORRECT: Sync from reactive source during render
function ToolSyncWatcher({ onToolChange }) {
  const editor = useEditor();
  const currentToolId = useValue("tool", () => editor.getCurrentToolId(), [editor]);

  const mappedTool = TOOL_MAP[currentToolId];
  if (mappedTool) {
    onToolChange(mappedTool); // OK: syncing reactive state to parent
  }
  return null;
}
```

### Why NOT useEffect Here

```tsx
// WRONG: useEffect delays sync by 1 frame
function ToolSyncWatcher({ onToolChange }) {
  const currentToolId = useValue("tool", () => editor.getCurrentToolId(), [editor]);

  useEffect(() => {
    const mappedTool = TOOL_MAP[currentToolId];
    if (mappedTool) {
      onToolChange(mappedTool);
    }
  }, [currentToolId, onToolChange]); // Runs AFTER render = 1 frame delay = flicker
}
```

**Problems with useEffect here:**
- useEffect runs AFTER paint → 1 frame delay → UI desync/flicker
- Reactive primitives are designed for render-time sync
- You're not mutating external world, just propagating derived state

### The Distinction

| During Render | OK? | Why |
|---------------|-----|-----|
| `onToolChange(derivedValue)` | YES | Propagating derived state from reactive source |
| `document.title = "Hello"` | NO | External DOM mutation |
| `fetch("/api/log")` | NO | External API call |
| `console.log("rendered")` | NO | External I/O |
| `parent.setState(derived)` from useValue | YES | React handles batching |

**Rule:** If syncing from reactive primitives (`useValue`, `useSyncExternalStore`) to parent state, do it during render. Adding useEffect makes things worse by introducing a 1-frame delay.

## Checklist Before useEffect

1. **Is this derived from state/props?** → Compute inline or `useMemo`
2. **Is this resetting state on prop change?** → Use `key` prop
3. **Is this responding to user action?** → Put in event handler
4. **Is this a chain of state updates?** → Consolidate in single handler
5. **Is this notifying parent?** → Call in same event
6. **Is this data fetching?** → Use React Query/SWR
7. **Is this subscribing to external store?** → `useSyncExternalStore`
8. **Is this polling?** → Use events (visibility, focus, online)
9. **Is this one-time init?** → `useMountEffect` or module-level
10. **Is this async form submission?** → Use `useActionState` (React 19)
11. **Is this optimistic update?** → Use `useOptimistic` (React 19)

**Only if none of the above:** Use `useEffect`

## Code Review Checklist (React 19)

When reviewing React code, flag these patterns:

| Pattern | Issue | Fix |
| ------- | ----- | --- |
| `React.forwardRef()` | Deprecated | Use `ref` as prop |
| `useEffect(() => setState(derived), [deps])` | Derived state in effect | Compute inline or `useMemo` |
| `useState(isPending) + useState(error)` for async | Manual async state | `useActionState` |
| `useCallback` everywhere | Over-memoization | Let compiler handle (or keep, harmless) |
| `useEffect` for form submission result | Effect for event | Handle in action/event handler |
| Prop drilling for form pending state | Unnecessary complexity | `useFormStatus` |

## References

- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [Rules of React](https://react.dev/reference/rules)
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects)
- [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React 19 Blog Post](https://react.dev/blog/2024/12/05/react-19)
- [React Compiler](https://react.dev/learn/react-compiler)
