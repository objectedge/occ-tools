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
 * createTable "rda_response_data", deps: []
 * createTable "sch_schema", deps: []
 *
 **/

var info = {
    "revision": 1,
    "name": "local-server",
    "created": "2020-04-03T23:13:58.897Z",
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
            "rda_response_data",
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
