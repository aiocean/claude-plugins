# iOS Crash Patterns Reference

## Signal Types and Diagnosis

### EXC_BREAKPOINT / SIGTRAP

Swift runtime trap. Common causes:

- **`dispatch_assert_queue_fail`**: Code expected to run on a specific queue (e.g., MainActor) but ran on a different one. Stack shows `_dispatch_assert_queue_fail` -> `_swift_task_checkIsolatedSwift`. Fix: mark callbacks as `@Sendable` to break actor isolation inference, or restructure to run on correct queue.
- **Force unwrap nil**: `Optional.none` unwrapped. Stack shows `Swift runtime failure: unexpectedly found nil`.
- **Precondition/assertion failure**: `precondition()`, `assert()`, or `fatalError()` triggered.
- **Array out of bounds**: Index beyond array count.
- **Actor isolation violation**: Swift 6 strict concurrency runtime check. Closure inferred as `@MainActor` but running on background queue.

### SIGABRT

Abort signal. Common causes:

- **Uncaught NSException**: Objective-C exception not caught. Check `NSException` info in crash report.
- **`fatalError()`**: Explicit fatal error call.
- **Constraint violation**: Auto Layout conflicting constraints.
- **Missing storyboard/nib**: Referenced UI file not found in bundle.

### EXC_BAD_ACCESS / SIGSEGV

Bad memory access. Common causes:

- **Use-after-free**: Object deallocated but still referenced.
- **Dangling pointer**: Pointer to freed memory.
- **Null pointer dereference**: Accessing memory at address 0x0.
- **Zombie object**: Message sent to deallocated object.

### SIGKILL

Process killed by system. Common causes:

- **Watchdog timeout**: App took too long to launch (scene, background task).
- **Jetsam (OOM)**: Memory limit exceeded. Check `pageins` and `memoryStatus` in crash report.
- **Background task exceeded time**: Background processing window expired (~10s for BLE).
- **`0xDEAD10CC`**: App holds file lock in background (SQLite). Use append-only files.

## Swift 6 Concurrency Crashes

### Actor Isolation Violation Pattern

Stack trace:
```
_dispatch_assert_queue_fail
dispatch_assert_queue
_swift_task_checkIsolatedSwift
swift_task_isCurrentExecutorWithFlagsImpl
closure #1 in SomeClass.someMethod()
```

Root cause: Closure defined in `@MainActor` class captures `[weak self]` -> inferred as `@MainActor` -> runs on background queue -> runtime assertion fails.

Fix pattern:
```swift
// BEFORE (crashes): closure inherits @MainActor from self
manager.startUpdates(to: backgroundQueue) { [weak self] data, error in
    // This closure is inferred @MainActor because of [weak self]
    Task { @MainActor [weak self] in ... }
}

// AFTER (works): @Sendable breaks actor inference
let handler: @Sendable (DataType?, (any Error)?) -> Void = { [weak self] data, error in
    // This closure is nonisolated because @Sendable
    Task { @MainActor [weak self] in ... }
}
manager.startUpdates(to: backgroundQueue, withHandler: handler)
```

### @preconcurrency Import Limitations

`@preconcurrency import SomeFramework` suppresses compile-time warnings but does NOT suppress runtime isolation checks in Swift 6. The runtime still enforces actor isolation.

## CoreMotion Specific Issues

### Plist Permission Warning (Benign)

```
Error reading file //private/var/Managed Preferences/mobile/com.apple.CoreMotion.plist
Error Domain=NSCocoaErrorDomain Code=257 "couldn't be opened because you don't have permission"
```

This is a **benign system log** from Apple's CoreMotion framework. Not from the app. Does not cause crashes. Appears when CoreMotion framework loads. Ignore it.

### CMAltimeter Authorization (iOS 15+)

`CMAltimeter` requires checking `authorizationStatus()` before starting updates:
```swift
let status = CMAltimeter.authorizationStatus()
guard status != .denied, status != .restricted else { return }
// .notDetermined is OK — triggers permission dialog
```

### CMMotionManager Threading

- Create `CMMotionManager` on MainActor (main thread)
- Callbacks run on the provided `OperationQueue` (background)
- Update UI only via `Task { @MainActor in ... }`
- Only one `CMMotionManager` instance per app

## CoreLocation Specific Issues

### Authorization Flow

Always implement both delegate methods:
```swift
func locationManager(_:didUpdateLocations:)
func locationManager(_:didFailWithError:)  // Required to prevent unhandled errors
```

### Background Location

Requires `location` in `UIBackgroundModes` and `NSLocationAlwaysAndWhenInUseUsageDescription` for background access.

## Device IDs — Two Systems

iOS devices have two different IDs depending on the tool:

| Tool | ID Format | Example |
|------|-----------|---------|
| `xcrun devicectl` | UUID (CoreDevice) | `8DDD33FA-B10E-526A-A99C-696EACEDC072` |
| `xcodebuild -destination` | ECID (physical) | `00008140-000C359221B8801C` |

`xcodebuild` uses the ECID from `xcodebuild -showdestinations`. `devicectl` uses the CoreDevice UUID. They are NOT interchangeable.

Find xcodebuild device ID:
```bash
xcodebuild -scheme <Scheme> -showdestinations 2>/dev/null | grep "platform:iOS," | grep -v Simulator
```

Find devicectl device ID:
```bash
xcrun devicectl list devices
```

## Useful Log Filtering

### Find app PID in syslog
```bash
grep -oE 'AppName\[[0-9]+\]' /tmp/syslog.txt | sort -u
```

### Check for crash (Corpse = crash happened)
```bash
grep -E "Corpse|Process exited.*signal" /tmp/syslog.txt
```

### Filter app process logs only
```bash
grep "AppName\[PID\]" /tmp/syslog.txt | grep -v "CoreFoundation\|BaseBoard\|BackBoardServices"
```

### Find crash signal
```bash
grep -E "SIGTRAP|SIGABRT|SIGSEGV|SIGKILL|signal\(" /tmp/syslog.txt
```
