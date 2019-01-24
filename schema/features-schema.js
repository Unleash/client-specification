const Joi = require('joi');

const schema = Joi.object().keys({
    version: Joi.number()
        .min(1)
        .required(),
    features: Joi.array().items(
        Joi.object().keys({
            name: Joi.string().required(),
            description: Joi.string().optional(),
            enabled: Joi.boolean().required(),
            strategies: Joi.array().items(
                Joi.object().keys({
                    name: Joi.string().required(),
                    parameters: Joi.object(),
                })
            ),
            variants: Joi.array().items(
                Joi.object().keys({
                    name: Joi.string().required(),
                    payload: Joi.object().required().keys({
                        type: Joi.string().required(),
                        value: Joi.string().required().allow(""),
                    }),
                    weight: Joi.number().min(0).max(100000),
                })
            )
        })
    ),
});

module.exports = schema;
