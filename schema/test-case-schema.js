const Joi = require('joi');
const featuresSchema = require('./features-schema.js');
const contextSchema = require('./context-schema.js');

const schema = Joi.object().keys({
    name: Joi.string(),
    state: featuresSchema,
    tests: Joi.array().items(
        Joi.object().keys({
            description: Joi.string().required(),
            context: contextSchema,
            toggleName: Joi.string().required(),
            expectedResult: Joi.boolean().required(),
        })
    ),
    variantTests: Joi.array().items(
        Joi.object().keys({
            description: Joi.string().required(),
            context: contextSchema,
            toggleName: Joi.string().required(),
            expectedResult: Joi.object().required().keys({
                name: Joi.string().required(),
                payload: Joi.object().required().keys({
                    type: Joi.string().required(),
                    value: Joi.string().required().allow(""),
                }),
                enabled: Joi.boolean().required()
            }),
        })
    )
});

module.exports = schema;
