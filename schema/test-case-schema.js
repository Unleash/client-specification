const Joi = require('joi');
const featuresSchema = require('./features-schema.js');

const schema = Joi.object().keys({
    name: Joi.string(),
    state: featuresSchema,
    tests: Joi.array().items(
        Joi.object().keys({
            description: Joi.string().required(),
            context: Joi.object().keys({
                userId: Joi.string(),
                sessionId: Joi.string(),
            }),
            toggleName: Joi.string().required(),
            expectedResult: Joi.boolean().required(),
        })
    ),
});

module.exports = schema;
