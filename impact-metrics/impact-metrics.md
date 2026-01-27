# Impact Metrics Client Specification

This document specifies how Unleash SDKs should implement impact metrics.

## Overview

Impact metrics allow applications to track counters, gauges, and histograms that are sent alongside regular feature flag metrics. These metrics enable measuring the business impact of feature releases
and provide data points for safeguards.

## Audience

This spec covers different implementation layers. Read the sections relevant to your work:

| Section | Yggdrasil core | SDK using Yggdrasil | SDK without Yggdrasil |
|---------|----------------|--------------------|-----------------------|
| Public API | | ✓ | ✓ |
| Metric Types | ✓ | | ✓ |
| Automatic Labels | | ✓ | ✓ |
| Registry Interface | ✓ | | ✓ |
| Transmission | | ✓ | ✓ |
| JSON Serialization | ✓ | | ✓ |
| Thread Safety | ✓ | | ✓ |

Yggdrasil bindings just wrap FFI calls - see the method list in Registry Interface.

## Numeric Types

Throughout this spec:
- **float** means a 64-bit floating-point number 
- **integer** means a 64-bit unsigned integer 

Consistent types across SDKs, Edge, and Unleash are critical for correct metric collation across the FFI boundary.

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
incrementCounter(name: string, value: integer, flagContext: MetricFlagContext) -> void
updateGauge(name: string, value: float) -> void
updateGauge(name: string, value: float, flagContext: MetricFlagContext) -> void
observeHistogram(name: string, value: float) -> void
observeHistogram(name: string, value: float, flagContext: MetricFlagContext) -> void
```

### MetricFlagContext

Optional context for correlating metrics with feature flag states.

```json
{
  "flagNames": ["feature-a", "feature-b"],
  "context": {
    "userId": "user-123",
    "sessionId": "session-456"
  }
}
```

When provided, the SDK resolves each flag and adds labels:
- If flag has variant: `{"featureName": "variantName"}`
- If flag enabled without variant: `{"featureName": "enabled"}`
- If flag disabled: `{"featureName": "disabled"}`

## Metric Types

### Counter

A monotonically increasing value.

| Property | Type | Description |
|----------|------|-------------|
| value | **integer** | Accumulated count. Must NOT be floating-point. |
| labels | map<string, string> | Optional dimensional labels |

**Operations:**
- `increment()` - Add 1 to counter
- `increment(value: integer)` - Add to counter
- `increment(value: integer, labels: map<string, string>)` - Add with labels

### Gauge

A value that can increase or decrease.

| Property | Type | Description |
|----------|------|-------------|
| value | **float** | Current value. Must NOT be integer. |
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

> **IMPORTANT:** Gauge values MUST be float, not integers. This is a common implementation error.

### Histogram

Distribution of observed values across bucket boundaries.

| Property | Type | Description |
|----------|------|-------------|
| count | **integer** | Total number of observations |
| sum | **float** | Sum of all observed values |
| buckets | array | Cumulative bucket counts |

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
- Ignore NaN and infinite values

## Automatic Labels

SDKs MUST automatically add these labels to all metrics:
- `appName` - From SDK configuration
- `environment` - From SDK configuration or extracted from API key

## Registry Interface

Internal registry for storing metrics. Must be thread-safe.

**Yggdrasil FFI methods:** `define_counter`, `inc_counter`, `define_gauge`, `set_gauge`, `define_histogram`, `observe_histogram`, `collect_impact_metrics`, `restore_impact_metrics`

```
// Registration (creates if not exists, returns existing if already defined)
counter(options: MetricOptions) -> Counter
gauge(options: MetricOptions) -> Gauge
histogram(options: BucketMetricOptions) -> Histogram

// Retrieval
getCounter(name: string) -> Counter | undefined
getGauge(name: string) -> Gauge | undefined
getHistogram(name: string) -> Histogram | undefined

// Collection
collect() -> CollectedMetric[]
restore(metrics: CollectedMetric[]) -> void
```

### Collection Behavior

- `collect()` returns all metrics and clears all values (counters, gauges, and histograms)
- When empty after collection: counters and histograms return zero-value samples; gauges return empty samples array
- If no metrics have been defined, `collect()` returns an empty array

### Restore Behavior

- `restore()` repopulates metrics from a previous collection
- Used for retry logic when metric transmission fails
- Must reconstruct histogram bucket state correctly

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

### Transmission Interval

Send metrics at the same interval as regular SDK metrics (default: 60 seconds).

### Error Handling

1. On successful transmission (HTTP 2xx): Reset/clear collected metrics
2. On failure (HTTP 4xx/5xx): Call `restore()` to preserve metrics for next attempt
3. Use exponential backoff for repeated failures from your regular metrics

## JSON Serialization

### Type Field

The `type` field MUST be serialized as lowercase string:
- `"counter"`
- `"gauge"`
- `"histogram"`

### Infinity Handling

The histogram bucket boundary `+Infinity` MUST be serialized as the string `"+Inf"`:

```json
{"le": "+Inf", "count": 100}
```

When deserializing, `"+Inf"` MUST be converted to the language's infinity value.

### Labels Serialization

Labels are serialized as a JSON object:

```json
{"appName": "my-app", "environment": "prod", "feature-x": "variant-a"}
```

## Thread Safety

For multi-threaded languages, metric operations MUST be thread-safe:
- Use concurrent data structures (ConcurrentHashMap, DashMap, etc.)
- Use atomic operations for counter increments
- Avoid locks where possible for performance

## Common Implementation Errors

1. **Using integer type for gauge values** - Gauges MUST use float
2. **Not appending +Infinity bucket** - Histograms MUST always have +Inf as final bucket
3. **Not clearing metrics after collection** - Counters and gauges must be cleared after collect()
4. **Not restoring metrics on transmission failure** - Metrics would be lost
5. **Non-thread-safe registry** - Will cause race conditions in concurrent applications

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

// With feature flag context
unleash.impactMetrics.incrementCounter('purchases', 1, {
  flagNames: ['new-checkout-flow'],
  context: { userId: 'user-123' }
});
// Results in labels: {"appName": "my-app", "environment": "prod", "new-checkout-flow": "enabled"}
```


