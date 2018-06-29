const Joi = require('joi');
const chalk = require('chalk');

const testCaseSchema = require('./schema/test-case-schema');
const testCases = require('./specifications/index.json');

testCases.forEach(name => {
    const testCase = require(`./specifications/${name}`);
    Joi.validate(testCase, testCaseSchema, err => {
        if (err) {
            console.error(`${name} ${chalk.red('is not valid')}. \n`, err);
        } else {
            console.log(`${name} ${chalk.green('is valid')}`);
        }
    });
});
