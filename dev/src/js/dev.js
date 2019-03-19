/*global requirejs, define, console*/
define([
    'loglevel',
    'jquery',
    'underscore',
    '../../../src/js/index',
    'fenix-ui-filter',
    'fenix-ui-pivotator-utils',
    'dev/src/models/UNECA_Inflation2.json',
    'dev/src/models/filter-interaction'
], function (log, $, _, ChartCreator, Filter, FenixTool, Model, FilterModel) {

    'use strict';

    var s = {
        CONFIGURATION_EXPORT: "#configuration-export",
        FILTER_INTERACTION: "#filter-interaction",
        CHART_INTERACTION: "#chart-interaction"
    };

    function Dev() {

        console.clear();

        this._importThirdPartyCss();

        log.setLevel('trace');

        this.fenixTool = new FenixTool();

        this.start();
    }

    Dev.prototype.start = function () {

        log.info("Test started");

        this._testFilterInteraction();
    };

    Dev.prototype._testFilterInteraction = function () {


        var itemsFromFenixTool = this.fenixTool.toFilter(Model, {
                rowLabel: "Series",
                columnsLabel: "X-Axis",
                valuesLabel: "Y-axis"
            }),
            items = $.extend(true, {}, FilterModel, itemsFromFenixTool);

        log.info("Filter configuration from FenixTool", items);

        this.filter = new Filter({
            el: s.FILTER_INTERACTION,
            selectors: items
        });

        this.filter.on("ready", _.bind(function () {

            var config = this._getChartConfigFromFilter();

            config = $.extend(true, {}, {
                model: Model,
                el: s.CHART_INTERACTION,
                config: {
                    tooltip: {shared: true}
                },
                lang: 'FR'
            }, config);

            log.info("Init chart");
            log.info(config);
            this.chart = new ChartCreator(config);
        }, this));

        this.filter.on("change", _.bind(function () {

            var config = this._getChartConfigFromFilter();

            log.info("Update chart");
            log.info(config);

            this.chart.update(config);
        }, this));

    };

    Dev.prototype._getChartConfigFromFilter = function () {

        var values = this.filter.getValues(),
            config = this.fenixTool.toChartConfig(values);

        this._printChartConfiguration(config);

        return config;

    };

    Dev.prototype._printChartConfiguration = function () {

        var values = this.filter.getValues(),
            config = this.fenixTool.toChartConfig(values);

        //Export configuration
        $(s.CONFIGURATION_EXPORT).html(JSON.stringify(config));

        return config;
    };

    Dev.prototype._getConfigBubbleCircle = function (model, config) {

        var obj = {};
        var incrementalAngle = 360 / model.rows.length;
        var currentAngle = 0;
        for (var i in model.rows) {
            var Z = model.row[i][0];

            var X = Math.cos(currentAngle);
            var Y = Math.sin(currentAngle);
            obj = {x: X, y: Y, name: model.rows[i].join(" "), z: Z/*country:'?????'*/}


            /*  if (model.data[i][0] && model.data[i][1] && model.data[i][2]) {
             obj = {
             x: model.data[i][0],
             y: model.data[i][1],
             z: model.data[i][2],
             name: model.rows[i].join(" "),
             country: ''
             };


             }*/

            config.series[0].data.push(obj);
            console.log('model row: ', obj);
        }

        config.tooltip = {
            useHTML: true,
            headerFormat: '<table>',
            pointFormat: '<tr><th colspan="2"><h3>{point.name}</h3></th></tr>' +
            '<tr><th>' + model.cols2[0] + ':</th><td>{point.x}</td></tr>' +
            '<tr><th>' + model.cols2[1] + ':</th><td>{point.y}</td></tr>' +
            '<tr><th>' + model.cols2[2] + ':</th><td>{point.z}</td></tr>',
            footerFormat: '</table>',
            followPointer: true
        };

        return config;
    };

    // utils

    Dev.prototype._importThirdPartyCss = function () {

        //Bootstrap
        require('bootstrap/dist/css/bootstrap.css');
        //dropdown selector
        require("../../../node_modules/selectize/dist/css/selectize.bootstrap3.css");
        //tree selector
        require("../../../node_modules/jstree/dist/themes/default/style.min.css");
        //range selector
        //require("../../../node_modules/ion-rangeslider/css/ion.rangeSlider.skinHTML5.css");
        //time selector
        require("../../../node_modules/eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min.css");
        // fenix-ui-filter
        require("../../../node_modules/fenix-ui-filter/dist/fenix-ui-filter.min.css");

    };

    return new Dev();
});