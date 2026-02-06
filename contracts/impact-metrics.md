# Impact Metrics Client Specification

This document specifies how Unleash SDKs should implement impact metrics.

## Overview

Impact metrics allow applications to track counters, gauges, and histograms that are sent alongside regular feature flag metrics. These metrics enable measuring the business impact of feature releases
and provide data points for safeguards.

## Audience

This spec covers different implementation layers. Read the sections relevant to your work:

| Section                 | Yggdrasil core | SDK using Yggdrasil | SDK without Yggdrasil |
|-------------------------|----------------|--------------------|-----------------------|
| Public API              | | ✓ | ✓ |
| Metric Types            | ✓ | | ✓ |
| Automatic Labels        | | ✓ | ✓ |
| Metric Storage Behavior | ✓ | | ✓ |
| Transmission            | | ✓ | ✓ |
| JSON Serialization      | ✓ | | ✓ |

Yggdrasil bindings just wrap FFI calls - see the method list in Registry Interface.

## Numeric Types

Throughout this spec:
- **float** means an IEEE 754 binary64 floating-point number
- **integer** means a 64-bit unsigned integer 

Consistent types across SDKs, Edge, and Unleash are critical for correct metric collation across the FFI boundary.

**Invalid values:** `+Infinity`, `-Infinity`, and `NaN` MUST be silently dropped when passed as a value to any metric operation (counter increment, gauge set/increment/decrement, histogram observe). The operation MUST have no effect.

**Overflow:** Accumulated counter values and histogram counts/sums may overflow in long-running processes. SDKs SHOULD use the language's idiomatic overflow behavior (e.g., wrapping arithmetic in Rust, precision loss in JavaScript). No special handling is required.

## Public API

SDKs MUST expose the following interface. Naming conventions may vary by language (e.g., Python uses snake_case: `define_counter`, `increment_counter`). Where multiple signatures are listed, languages without overloading should use separate function names.

### Definition Methods

```
defineCounter(name: string, help: string) -> void
defineGauge(name: string, help: string) -> void
defineHistogram(name: string, help: string) -> void
defineHistogram(name: string, help: string, buckets: float[]) -> void
```

### Recording Methods

```
incrementCounter(name: string) -> void
incrementCounter(name: string, value: integer) -> void
updateGauge(name: string, value: float) -> void
observeHistogram(name: string, value: float) -> void
```

## Metric Types

### Counter

A monotonically increasing value.

| Property | Type | Description |
|----------|------|-------------|
| value | **integer** | Accumulated count |
| labels | map<string, string> | Optional dimensional labels |

**Operations:**
- `increment()` - Add 1 to counter
- `increment(value: integer)` - Add to counter
- `increment(value: integer, labels: map<string, string>)` - Add with labels

### Gauge

A value that can increase or decrease.

| Property | Type | Description |
|----------|------|-------------|
| value | **float** | Current value |
| labels | map<string, string> | Optional dimensional labels |

**Operations:**
- `set(value: float)` - Set absolute value
- `set(value: float, labels: map<string, string>)` - Set with labels
- `increment()` - Add 1.0 to gauge
- `increment(value: float)` - Add to gauge
- `increment(value: float, labels: map<string, string>)` - Add with labels
- `decrement()` - Subtract 1.0 from gauge
- `decrement(value: float)` - Subtract from gauge
- `decrement(value: float, labels: map<string, string>)` - Subtract with labels

### Histogram

Distribution of observed values across bucket boundaries.

| Property | Type | Description |
|----------|------|-------------|
| count | **integer** | Total number of observations |
| sum | **float** | Sum of all observed values |
| buckets | array | Cumulative bucket counts |
| labels | map<string, string> | Optional dimensional labels |

**Bucket structure:**

| Property | Type | Description |
|----------|------|-------------|
| le | float or "+Inf" | Upper boundary (less-than-or-equal) |
| count | integer | Cumulative count of observations ≤ le |

**Default buckets:** `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]`

The `+Infinity` bucket MUST always be appended programmatically, regardless of custom bucket configuration.

**Operations:**
- `observe(value: float)` - Record an observation
- `observe(value: float, labels: map<string, string>)` - Record with labels

**Observation logic:**
- Increment `count` by 1
- Add `value` to `sum`
- For each bucket where `value <= le`, increment that bucket's count

## Automatic Labels

SDKs MUST automatically add these labels to all metrics:
- `appName` - From SDK configuration.
- `environment` - The effective environment used for fetching and evaluating toggles.

**Resolving the `environment` label:**

1. If the SDK uses a dynamic API key resolver, the environment MUST be resolved via that resolver at the time of metric construction.
2. Otherwise, the environment MUST be extracted from the API key specified at startup.
3. **Deprecated fallback:** If the SDK configuration specifies an explicit `environment` field, it MAY be used as a fallback when the API key does not provide an environment. 

## Metric Storage Behavior

The SDK MUST store defined metrics so they can be collected for transmission and restored on failure.

### Defining metrics

Defining a metric that already exists MUST return the existing metric.

### Collection

`collect()` MUST return a snapshot of all currently defined metrics and their accumulated values since the previous successful `collect()`. It MUST also reset the collected state so that subsequent metric operations accumulate into the next interval. Updates racing with `collect()` MUST NOT be double-counted.

**Post-collection state:**

After `collect()` completes, internal accumulated values MUST be reset as follows:

- **Counters:** the label-set entry is removed. On the next collection with no intervening increments, the counter emits a single zero-value sample with empty labels.
- **Histograms:** the label-set entry is removed. On the next collection with no intervening observations, the histogram emits a single zero-value sample with empty labels, default bucket boundaries, and all counts/sum at 0. Bucket boundaries are preserved at the metric level (not per label-set).
- **Gauges:** behave as unset for each label-set (no sample emitted until updated again).

**Empty collection:**

- If no metrics have ever been defined, `collect()` MUST return an empty array.
- If metrics are defined but no samples exist after reset:
  - Counters and histograms MUST still be included with a single zero-value sample (empty labels).
  - Gauges MUST return an empty samples array.

### Restore

- Restoring MUST repopulate metrics from a previous collection.
- This is used for retry logic when metric transmission fails (see Error Handling).
- Histogram bucket state MUST be correctly reconstructed, including all bucket boundaries and cumulative counts.

> **Yggdrasil implementers:** The corresponding FFI methods are `define_counter`, `inc_counter`, `define_gauge`, `set_gauge`, `define_histogram`, `observe_histogram`, `collect_impact_metrics`, `restore_impact_metrics`.

## Transmission

### Endpoint

`POST {baseUrl}/client/metrics`

### Payload

Impact metrics are included in the existing metrics payload:

```json
{
  "appName": "my-app",
  "instanceId": "instance-123",
  "connectionId": "connection-456",
  "environment": "production",
  "bucket": {
    "start": "2024-01-01T00:00:00Z",
    "stop": "2024-01-01T00:01:00Z",
    "toggles": {}
  },
  "platformName": "node",
  "platformVersion": "20.0.0",
  "yggdrasilVersion": "0.14.0",
  "specVersion": "5.2.2",
  "impactMetrics": [
    {
      "name": "purchases",
      "help": "Number of purchases",
      "type": "counter",
      "samples": [
        {
          "labels": {"appName": "my-app", "environment": "prod"},
          "value": 42
        }
      ]
    },
    {
      "name": "response_time_seconds",
      "help": "API response time",
      "type": "histogram",
      "samples": [
        {
          "labels": {"appName": "my-app", "environment": "prod"},
          "count": 100,
          "sum": 25.5,
          "buckets": [
            {"le": 0.1, "count": 50},
            {"le": 0.5, "count": 85},
            {"le": 1.0, "count": 95},
            {"le": "+Inf", "count": 100}
          ]
        }
      ]
    }
  ]
}
```

### Error Handling

Impact metrics are transmitted as part of the existing metrics payload. This section only covers failure semantics specific to impact metrics — general retry and backoff behavior is out of scope.

**Fault isolation:**

Failure to collect or serialize impact metrics MUST NOT prevent base toggle metrics from being sent. If impact metric collection raises an error, the SDK MUST still transmit the regular metrics payload without the `impactMetrics` field.

## JSON Serialization

### Infinity Handling

The histogram bucket boundary `+Infinity` MUST be serialized as the string `"+Inf"`:

```json
{"le": "+Inf", "count": 100}
```

When deserializing, `"+Inf"` MUST be mapped to a value that represents positive infinity in IEEE 754 binary64 semantics.

### Labels Serialization

Labels are serialized as a JSON object:

```json
{"appName": "my-app", "environment": "prod", "feature-x": "variant-a"}
```

## Example Public API

```javascript
// Initialize
const unleash = initialize({ url: '...', appName: 'my-app' });

// Define metrics
unleash.impactMetrics.defineCounter('purchases', 'Number of completed purchases');
unleash.impactMetrics.defineGauge('active_users', 'Currently active users');
unleash.impactMetrics.defineHistogram('checkout_duration_seconds', 'Checkout flow duration');

// Record metrics
unleash.impactMetrics.incrementCounter('purchases', 1);
unleash.impactMetrics.updateGauge('active_users', 150.0);
unleash.impactMetrics.observeHistogram('checkout_duration_seconds', 2.3);
```

