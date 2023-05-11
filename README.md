# autodesk-forks-swagger-node-runner

This package is a fork of [apigee-127/swagger-node-runner](https://github.com/apigee-127/swagger-node-runner). 
The purpose of this fork is to update dependencies and continue to maintain the original package.

Would you like to contribute? Read [our contribution guidelines](./CONTRIBUTING.md).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NodeJS with Gulp](https://github.com/autodesk-forks/swagger-node-runner/actions/workflows/npm-gulp.yml/badge.svg)](https://github.com/autodesk-forks/swagger-node-runner/actions/workflows/npm-gulp.yml)
![semver](https://img.shields.io/badge/semver-2.0.0-blue)
[![npm version](https://badgen.net/npm/v/autodesk-forks-swagger-node-runner)](https://www.npmjs.com/package/autodesk-forks-swagger-node-runner)
[![contributors](https://img.shields.io/github/contributors/autodesk-forks/swagger-node-runner)](https://github.com/autodesk-forks/swagger-node-runner/graphs/contributors)

## :book: Resources

- [Documentation](./docs/API.md)
- [Typescript definitions](./index.d.ts)
- [Changelog](https://github.com/autodesk-forks/swagger-node-runner/releases)

## Getting started

You can install this fork via npm:
```bash
npm i autodesk-forks-swagger-node-runner
```

Sample usage with express server:
```javascript
const SwaggerRunner = require("swagger-node-runner");
const request = require("supertest");
const express = require('express')();
const axios = require('axios');

SwaggerRunner.create({
    appRoot: './test/assets/project'
}, async (err, runner) => {
    if (err) console.error(err);

    runner.expressMiddleware().register(express);

    const {statusCode: goodRequest} = await request(express)
        .put('/expect_integer')
        .query({
            name: 123123,
        });
    console.log(goodRequest); // will output 200

    const {statusCode: badRequest} = await request(express)
        .put('/expect_integer')
        .query({
            name: 'string',
        });
    console.log(badRequest); // will output 400
})
```
