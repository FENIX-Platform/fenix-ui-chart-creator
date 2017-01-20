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

        this.baseConfig = $.extend(true, this._populateData(model, templates), this.config);

        this.chart = this.el.jvenn(this.baseConfig);

        this._trigger("ready");

    };


    JVenn.prototype._populateData = function (model, config) {

        // reset series
        config.series = []

        for (var ii in model.cols) {
            if (model.cols.hasOwnProperty(ii)) {
                var i = model.cols[ii];

                config.xAxis.categories.push(i.title[this.lang]);
            }
        }

        for (var k in model.rows) {
                var data = model.data[k];
                var processedArry = [];
                var processedCodeList = [];

                for(var x in data){
                     if(data[x] != null) {
                        var codeObj = {};
                         codeObj.id = model.cols[x].id;
                         codeObj.title = data[x];
                         processedArry.push(data[x]);
                         processedCodeList.push(codeObj);
                    }
                 }

            config.series.push({
                name: model.rows[k].join(" "),
                data: processedArry,
                codelist: processedCodeList
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

        var self = this;

        this.config.fnClickCallback = function() {

            var obj = {
             list: this.list,
             listnames: this.listnames,
             series:  self.baseConfig.series,
             selected: this,
             id:   self.id
            };

           // console.log(obj)
            self.controller._trigger('click', obj);

            //amplify.publish(self._getEventName(EVT.CHART_CLICK), {id: self.id, values: obj});

          };

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