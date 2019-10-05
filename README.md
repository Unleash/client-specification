[![Build Status](https://travis-ci.org/Unleash/client-specification.svg?branch=master)](https://travis-ci.org/Unleash/client-specification)

# Unleash Client Specifications
Implementing a Unleash client for a specific platfrom can be a challenge in it's own. And we want the clients to follow specific platform and language conventions, but at the same time we want the clients to adhere to the unleash contract, and give predictable results across platforms. 

This project tries to define the expected results of certain predefined set of feature toggles, usign the  [built-in activation strategies](https://github.com/Unleash/unleash/blob/master/docs/activation-strategies.md) and with a given [unleash context](https://github.com/Unleash/unleash/blob/master/docs/unleash-context.md). 


### Test structure
All the tests are located in the [/specifications](specifications) folder. 

There is an entry point for all the tests, which will include a list of all the defined specification test cases, [/specifications/index.json](https://github.com/Unleash/client-specification/blob/master/specifications/index.json). Clients should parse this entry-point in order to discover all specifications to run. 

```json
[
  "01-simple-examples.json",
  "02-user-with-id-strategy.json",
  "03-gradual-rollout-user-id-strategy.json",
  "04-gradual-rollout-session-id-strategy.json",
  "05-gradual-rollout-random-strategy.json",
  "06-remote-address-strategy.json",
  "07-multiple-strategies.json",
  "08-variants.json",
  "09-strategy-constraints.json"
]
```

A Test Specifications will have the following shape:

```json
{
    "name": "Example Test Case",
    "state": {
        "version": 1,
        "features": []
    },
    "tests": [
        {
            "description": "Unknown toggle should be disabled",
            "context": {},
            "toggleName": "Unknown.Toggle",
            "expectedResult": false
        }
    ],
    "variantTests": [
        {
            "description": "Feature with variants",
            "context": {
                "userId": "1234"
            },
            "toggleName": "Feature.Variants",
            "expectedResult": {
                "name": "variant",
                "payload": {
                    "type": "string",
                    "value": "value"
                },
                "enabled": true
            }
        }
    ]
}
``` 

Fields description:

- **name** - The name of the specification
- **state** - The list of toggles comming from the unleash-server. Would be the same response as the client will see when requesting `http://unleash-apu/client/features`. The state will be used for all test cases in this specification. 
- **tests** - The list of `isEnabled` tests cases to run. 
  - **description** - Describes what this test case is testing. Suitable to output as the error message if the test case fails. 
  - **context** - The [unleash context](https://github.com/Unleash/unleash/blob/master/docs/unleash-context.md) the client should setup. 
  - **toggleName** - The toggle name to send in to the `isEnabled` call in this test case. 
  - **expectedResult** - The expected result of the `isEnabled` call with the given `toggleName`. 
- **variantTests** - The list of `getVariant` tests cases to run. 
  - **description** - Describes what this test case is testing. Suitable to output as the error message if the test case fails. 
  - **context** - The [unleash context](https://github.com/Unleash/unleash/blob/master/docs/unleash-context.md) the client should setup. 
  - **toggleName** - The toggle name to send in to the `isEnabled` call in this test case. 
  - **expectedResult** - The expected result of the `getVariant` call with the given `toggleName`. 
