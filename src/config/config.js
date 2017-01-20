if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function () {

    'use strict';

    return {

        renderer: "highcharts",

        pluginRegistry: {
            'highcharts': {
                path: 'highcharts'
            },
            'jvenn': {
                path: 'jvenn'
            }
        }
    }
});