'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "apa_allowed_parameters", deps: []
 * createTable "des_descriptor", deps: []
 * createTable "met_method", deps: []
 * createTable "mty_method_type", deps: []
 * createTable "oce_occ_env", deps: []
 * createTable "rqb_request_body", deps: []
 * createTable "rqh_request_headers", deps: []
 * createTable "rqp_request_parameters", deps: []
 * createTable "rda_response_data", deps: []
 * createTable "rph_response_headers", deps: []
 * createTable "sch_schema", deps: []
 *
 **/

var info = {
    "revision": 1,
    "name": "local-server",
    "created": "2020-04-06T21:13:33.862Z",
    "comment": ""
};

var migrationCommands = [{
        fn: "createTable",
        params: [
            "apa_allowed_parameters",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "des_descriptor",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "met_method",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "mty_method_type",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "oce_occ_env",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "rqb_request_body",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "rqh_request_headers",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "rqp_request_parameters",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "rda_response_data",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "rph_response_headers",
            {

            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "sch_schema",
            {

            },
            {}
        ]
    }
];

module.exports = {
    pos: 0,
    up: function(queryInterface, Sequelize)
    {
        var index = this.pos;
        return new Promise(function(resolve, reject) {
            function next() {
                if (index < migrationCommands.length)
                {
                    let command = migrationCommands[index];
                    console.log("[#"+index+"] execute: " + command.fn);
                    index++;
                    queryInterface[command.fn].apply(queryInterface, command.params).then(next, reject);
                }
                else
                    resolve();
            }
            next();
        });
    },
    info: info
};
