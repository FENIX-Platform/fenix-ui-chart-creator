/*global require, define*/
define([
    'jquery',
    'underscore',
    'loglevel',
    '../config/errors',
    '../config/events',
    '../config/config',
    'fenix-ui-pivotator',
    'fenix-ui-pivotator-utils'
], function ($, _, log, ERR, EVT, C, Pivotator, fenixtool) {

    'use strict';

    var selectorPath = "./renderers/";

    function Chart(o) {

        log.info("FENIX Chart");
        log.info(o);
        $.extend(true, this, C, {initial: o});
        this._parseInput(o);
        var valid = this._validateInput();
        if (valid === true) {
            this._initVariables();
            this._bindEventListeners();
            this._renderChart();
            return this;
        } else {
            log.error("Impossible to create Chart");
            log.error(valid);
        }
    }

    // API
    /**
     * Update chart
     * @return {Object} Chart instance
     */
    Chart.prototype.update = function (config) {

        this._parseInputUpdate(config);

        var pivotatorConfig = this.fenixTool.parseInput(this.initial.model.metadata.dsd, this.pivotatorConfig);

        this.chart.model = this.pivotator.pivot(this.initial.model, pivotatorConfig);

        this.chart.update(config);
    };

    /**
     * pub/sub
     * @return {Object} component instance
     */
    Chart.prototype.on = function (channel, fn, context) {
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
    Chart.prototype.redraw = function () {

        if (this.chart && $.isFunction(this.chart.redraw)) {
            this.chart.redraw();
        } else {
            log.warn("Abort redraw");
        }

    };

    Chart.prototype._trigger = function (channel) {
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

    Chart.prototype._parseInput = function () {

        this._parseInputUpdate(this.initial);
    };

    Chart.prototype._parseInputUpdate = function (param) {

        var format = param.useDimensionLabelsIfExist === true ? "fenixtool" : "raw";

        this.$el = $(param.el);
        this.type = param.type;
        this.model = param.model;
        var pc = {};
        pc.inputFormat = format;
        pc.aggregationFn = param.aggregationFn;
        pc.aggregations = param.aggregations || [];
        pc.hidden = param.hidden || [];
        pc.columns = param.x;
        pc.values = param.y || ["value"];
        pc.rows = param.series;
        pc.formatter = param.formatter || "value";
        pc.valueOutputType = param.valueOutputType;
        pc.showRowHeaders = param.showRowHeaders || false;
        pc.decimals = param.decimals || 2;
        pc.showCode = param.showCode || false;
        pc.showFlag = param.showFlag || false;
        pc.showUnit = param.showUnit || false;
        // add more pivotator config
        this.pivotatorConfig = pc;
        this.renderer = param.renderer || C.renderer;
        this.lang = param.lang || 'EN';
        this.config = param.config;
        this.id = param.id;
        if (typeof param.createConfiguration === 'function') {
            this.createConfiguration = param.createConfiguration;
        }
    };

    Chart.prototype._validateInput = function () {
        var valid = true, errors = [];
        //set Chart id
        if (!this.id) {
            window.fx_chart_id = window.fx_chart_id >= 0 ? window.fx_chart_id++ : 0;
            this.id = String(window.fx_chart_id);
            log.warn("Impossible to find Chart id. Set auto id to: " + this.id);
        }
        if (!this.$el) {
            errors.push({code: ERR.MISSING_CONTAINER});
            log.warn("Impossible to find Chart container");
        }
        //Check if $el exist
        if (this.$el.length === 0) {
            errors.push({code: ERR.MISSING_CONTAINER});
            log.warn("Impossible to find box container");
        }
        //add validation
        return errors.length > 0 ? errors : valid;

    };

    Chart.prototype._initVariables = function () {
        //pub/sub
        this.channels = {};
        this.pivotator = new Pivotator();
        this.fenixTool = new fenixtool();
    };

    Chart.prototype._bindEventListeners = function () {

        //amplify.subscribe(this._getEventName(EVT.SELECTOR_READY), this, this._onSelectorReady);

    };

    // Preload scripts

    Chart.prototype._getPluginPath = function (name) {

        var registeredSelectors = $.extend(true, {}, this.pluginRegistry),
            path;

        var conf = registeredSelectors[name];

        if (!conf) {
            log.error('Registration not found for "' + name + ' plugin".');
        }

        if (conf.path) {
            path = conf.path;
        } else {
            log.error('Impossible to find path configuration for "' + name + ' plugin".');
        }

        return selectorPath + path;

    };

    Chart.prototype._renderChart = function () {

        var Renderer = this._getRenderer(this.renderer);
        var myPivotatorConfig = this.fenixTool.parseInput(this.model.metadata.dsd, this.pivotatorConfig);

        var model = this.pivotator.pivot(this.model, myPivotatorConfig);

        var config = $.extend(true, {}, {
            pivotatorConfig: this.pivotatorConfig,
            el: this.$el,
            model: model,
            lang: this.lang,
            type: this.type,
            id: this.id,
            config: this.config,
            createConfiguration: this.createConfiguration,
            controller: this
        });

        this.chart = new Renderer(config);
        this._trigger("ready");
    };

    Chart.prototype._getEventName = function (evt) {
        return this.id.concat(evt);
    };

    Chart.prototype._getRenderer = function (name) {
        return require(this._getPluginPath(name) + ".js");
    };

    //disposition

    Chart.prototype._unbindEventListeners = function () {
         //amplify.unsubscribe(this._getEventName(EVT.SELECTOR_READY), this._onSelectorReady);
    };

    Chart.prototype.dispose = function () {
        this.chart.dispose();
        //unbind event listeners
        this._unbindEventListeners();
    };

    Chart.prototype._callSelectorInstanceMethod = function (name, method, opts1, opts2) {
        var Instance = this.chart;
        if ($.isFunction(Instance[method])) {
            return Instance[method](opts1, opts2);
        }
        else {
            log.error(name + " selector does not implement the mandatory " + method + "() fn");
        }
    };
    return Chart;
});