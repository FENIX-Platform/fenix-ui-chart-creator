if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([
    'jquery',
    'underscore',
    'loglevel',
    '../../config/errors',
    '../../config/events',
    '../../config/config',
    'fenix-ui-pivotator',
    '../../config/renderers/jvenn',
    'canvas2svg',
    'jvenn',
    'amplify-pubsub'
], function ($, _, log, ERR, EVT, C, Pivotator, templates, canvas2svg, jvenn) {

    'use strict';

    function JVenn(o) {
        log.info("FENIX JVenn");
        log.info(o);

        $.extend(true, this, C, o);

        var valid = this._validateInput();

        if (valid === true) {

            this._initVariables();

            this._bindEventListeners();

            this._renderJVenn(this.pivotatorConfig);

            return this;

        } else {
            log.error("Impossible to create JVenn");
            log.error(valid)
        }
    }

    // API

    /**
     * pub/sub
     * @return {Object} component instance
     */
    JVenn.prototype.on = function (channel, fn, context) {
        var _context = context || this;
        if (!this.channels[channel]) {
            this.channels[channel] = [];
        }
        this.channels[channel].push({context: _context, callback: fn});
        return this;
    };

    /**
     * Force redrawing
     * @return {Object} filter instance
     */
    JVenn.prototype.redraw = function () {

        if (this.chart.length > 0){
           // this.chart.highcharts().reflow();
        } else {
            log.warn("Abort redraw");
        }

    };

    JVenn.prototype.update = function (config) {

        //TODO add validation
        this.type = config.type ? config.type : this.type;
        this._renderJVenn(config);

    };

    JVenn.prototype._renderJVenn = function (config) {
        var model = this.model;

        if (!config) {
            alert("Impossible to find chart configuration: " + this.type);
        }

        var config = $.extend(true, this._populateData(model, templates), config);
        this.chart = this.el.jvenn(config);

        this._trigger("ready");

    };

    JVenn.prototype._populateData = function (model, config) {

        for (var ii in model.cols) {
            if (model.cols.hasOwnProperty(ii)) {
                var i = model.cols[ii];


               // console.log(i.title[this.lang]);
                config.xAxis.categories.push(i.title[this.lang]);

            }
        }

        var dataArray = [];

        for (var k in model.rows) {
                var data = model.data[k];

                var processedArry = [];
                for(var x in data){
                     if(data[x] != null) {
                         processedArry.push(data[x]);
                     }
                 }

            config.series.push({
                name: model.rows[k].join(" "),
                data: processedArry
            });
        }

        return config;
    };


    JVenn.prototype._trigger = function (channel) {

        if (!this.channels[channel]) {
            return false;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0, l = this.channels[channel].length; i < l; i++) {
            var subscription = this.channels[channel][i];
            subscription.callback.apply(subscription.context, args);
        }

        return this;
    };

    // end API

    JVenn.prototype._validateInput = function () {

        var valid = true,
            errors = [];

        return errors.length > 0 ? errors : valid;

    };

    JVenn.prototype._initVariables = function () {

        //pub/sub
        this.channels = {};

        this.pivotator = new Pivotator();

    };

    JVenn.prototype._bindEventListeners = function () {

        //amplify.subscribe(this._getEventName(EVT.SELECTOR_READY), this, this._onSelectorReady);

    };

    JVenn.prototype._getEventName = function (evt) {

        return this.id.concat(evt);
    };

    //disposition
    JVenn.prototype._unbindEventListeners = function () {

        //amplify.unsubscribe(this._getEventName(EVT.SELECTOR_READY), this._onSelectorReady);

    };

    JVenn.prototype.dispose = function () {

        //this.chart.dispose(); change in highchart destroy

        //unbind event listeners
        this._unbindEventListeners();

    };

    // utils

    return JVenn;
});