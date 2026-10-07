# SDK lifecycle design

This documents specifies a series of design decisions that affect the lifecycle of SDKs across languages.

## Dropping events is acceptable under load

Our SDKs let users subscribe to events emitted by the SDK via a callback.
This callback can be too slow, or fail for whatever other reason.
We've reached the decision that it's not acceptable to degrade 
the performance of the `is_enabled/get_variant` methods for event handling.

The bus of events will be lossy, since we've seen that the engineering it takes to make
delivery guarantees isn't sustainable

## Ready is sent at least once

All SDKs emit a sort of "READY" event. We've decided that we will guarantee at-least-once
delivery, and that the event will signify that the SDK has hydrated from at least one of it's API, bootstrap or backup sources.

## SDK makes no guarantees about functionality before initialize is called

When an SDK provides an initialize method that is expected to guarantee 
the SDK is in a hydrated and functional state, that SDK will not guarantee
 proper functioning before that method is called.

We cannot guarantee that any SDK will work before `initialize()` or after `stop()`.