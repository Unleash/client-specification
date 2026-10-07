# SDK performance assumptions

This documents specifies a series of design decisions that affect all SDKs across languages.

## Dropping events is acceptable under load

Our SDKs let users subscribe to events emitted by the SDK via a callback.
This callback can be too slow, or fail for whatever other reason.
We've reached the decisions that dropping events if the callback cannot keep up is acceptable.

The bus of events will be lossy, since we've seen that the engineering it takes to make
delivery guarantees

## Ready is sent at least once and will always be the first event sent

All SDKs emit a sort of "READY" event. We've decided that we will guarantee at-least-once
delivery, and that the event will signify that the SDK is ready to be used.

Therefore, it will be the first event that an SDK will emit.

## SDK makes no guarantees about functionality before initialize is called

Our SDKs all expect the caller to manage the lifecycle of the SDK with methods
similar to `initialize()` and `stop()`.

We cannot guarantee that any SDK will work before `initialize()` or after `stop()`.