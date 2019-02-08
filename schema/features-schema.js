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
                    }).optional(),
                    weight: Joi.number().min(0).max(100000),
                    overrides: Joi.array().items(
                        Joi
                            .object()
                            .keys({
                                contextName: Joi.string().required(),
                                values: Joi.array().items(Joi.string()),
                            })
                            .optional()
                    ),
                })
            )
        })
    ),
});

module.exports = schema;
