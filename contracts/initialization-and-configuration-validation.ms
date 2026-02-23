# Initialization & Configuration Validation Specification

This document specifies how Unleash SDKs MUST behave during initialization when configuration is missing or invalid.

## Overview

Unleash SDKs are frequently configured via environment variables. At runtime, required configuration such as url and token may be null, undefined, or otherwise invalid.

SDKs MUST be resilient in production environments. Misconfiguration MUST NOT cause the host application process to crash by default. Instead, SDKs MUST start in a degraded state, emit appropriate warnings or errors through existing mechanisms, and provide predictable default behavior.

This specification defines:

- Default (soft) initialization behavior
- Hard initialization behavior
- Debug/development mode behavior
- Public API behavior in degraded state
- Backup state loading semantics
- Event and logging requirements

## Definitions

Required configuration parameters:

- **URL** - A URL specifying the base path of the Unleash client API
- **Token** - An Unleash token that allows access to the relevant client API

These parameters are required for communication with Unleash.

**Soft initialization**:

The default SDK initialization method.

**Hard initialization**:

An explicit, non-default initialization method that enforces successful initial synchronization before returning control.

**Debug/Development mode**:

A runtime mode provided by the host ecosystem (e.g., Rust debug_assertions, Node NODE_ENV !== "production"), indicating the application is not running in production. Only relevant where the ecosystem supports this idiomatically.

**Degraded State**:

The SDK is initialized and callable, but has not successfully synchronized with Unleash due to missing or invalid configuration.


## Default (Soft) Initialization

### Required Behavior

When initialized using the default initialization method:

1) The SDK MUST NOT throw, panic, or terminate the host process due to missing or invalid required configuration.
2) The SDK MUST start and enter a running state, even if url and/or token are missing or invalid.
3) The SDK MUST emit its normal ready (or equivalent) event once initialization completes.

`ready` in this context means:
The SDK has initialized and public API methods are callable.
It does NOT guarantee that toggles have been fetched from Unleash, only that the SDK has made a best effort attempt to retrieve toggles.

### Validation Semantics

- Soft validation MUST check only for presence of required configuration parameters.
- SDKs MUST NOT reject URLs purely based on format validation. Communication success is determined by whether Unleash responds successfully.
- Missing or invalid required configuration MUST be surfaced through existing logging or error-event mechanisms.
- Configuration that is not required but missing should default to safe, known values.

### Network Behavior

- The SDK MAY proceed with its normal fetch or streaming scheduling.
- Resulting network failures MUST be surfaced via existing error/logging mechanisms.
- Repeated failures MUST NOT cause process termination.

Rate limiting and retry behavior are governed by existing SDK mechanisms and MUST NOT be bypassed.

### Backup State Loading

1) The SDK MUST attempt to load persisted toggle state during initialization, regardless of configuration validity.
2) Backup loading MUST occur before emitting the ready event.

Backup loading failure MUST NOT prevent SDK startup.

## Degraded Public API Behavior

If the SDK has not successfully fetched toggle state from Unleash and bootstrapping and backup loading have failed:

`isEnabled` (or equivalent SDK method)
- MUST return false
- If a caller-provided fallback value is supplied, that fallback MUST be returned.

`getVariant` (or equivalent SDK method)
- MUST return the SDK’s canonical default variant (disabled).
- If a caller-provided fallback variant is supplied, that fallback MUST be returned.

`listToggles` (or equivalent SDK method)
- MUST return an empty list.

## Periodic Warnings

If required configuration is missing or invalid:
- The SDK MUST emit at least one clear warning during startup identifying which required parameters are missing.
- Continued connectivity failures MUST be surfaced using existing logging/event mechanisms.
- Emission MUST use existing rate-limiting or retry controls provided by the SDK.

## Hard Initialization

SDKs MAY provide an explicit, non-default initialization method that enforces strict validation.

### Required Behavior

When using a hard initialization method:

1) url and token MUST be treated as required.
2) The SDK MUST attempt a full fetch from Unleash. If retries are supported in the SDK then the retry limit must be exceeded.
3) The method MUST NOT resolve/return until at least one successful toggle fetch has occurred.

If the initial fetch fails:
- The method MUST reject, throw, or return an error.
- The SDK MUST NOT silently downgrade into degraded state.

Timeout behavior and retry semantics are governed by existing SDK implementation.

## Debug / Development Mode Behavior

SDK ecosystems that provide a clear debug or development mode (e.g., Rust debug_assertions, Node non-production environments) MAY enforce stricter validation semantics during soft initialization.

When operating in debug/development mode:
- The SDK MAY treat missing required configuration (url, token) as fatal during soft initialization.
- This MAY result in throwing, panicking, or otherwise failing initialization.
- This behavior MUST NOT apply in production mode.

This provision exists to enable fail-fast behavior during local development while preserving resilience in production environments.

SDKs implementing this behavior MUST document:
- How debug/development mode is detected.
- That strict validation applies only in that mode.

## Event and Logging Semantics

All validation and connectivity failures MUST be surfaced via existing SDK mechanisms:
- SDKs that emit error events MUST use those events.
- SDKs that rely on logging MUST log appropriately.
- SDKs MUST NOT introduce new event types unless separately specified.

At minimum:
- A clear warning identifying missing required configuration MUST be emitted during startup.
- Network failures resulting from invalid configuration MUST be surfaced normally.
