const Joi = require('joi');
const chalk = require('chalk');

const testCaseSchema = require('./schema/test-case-schema');
const testCases = require('./tests.json');

testCases.forEach(name => {
    const testCase = require(`./${name}`);
    Joi.validate(testCase, testCaseSchema, (err, value) => {
        if(err) {
            console.error(`${name} ${chalk.red('is not valid')}. \n`, err);
        } else {
            console.log(`${name} ${chalk.green('is valid')}`);
        }
    })
});