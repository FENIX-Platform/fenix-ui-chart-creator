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