const Joi = require('joi');

const schema = Joi.object().keys({
    userId: Joi.string(),
    sessionId: Joi.string(),
    remoteAddress: Joi.string(),
    environment: Joi.string(),
    appName: Joi.string(),
    properties: Joi.object().pattern(/\w+/, Joi.string()),
}).unknown(true)

module.exports = schema;