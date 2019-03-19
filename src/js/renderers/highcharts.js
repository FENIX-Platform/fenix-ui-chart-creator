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
    '../../config/renderers/highcharts',
    '../../config/renderers/highcharts_shared',
    '../../nls/labels',
    'highcharts/highstock',
    'highcharts-more',
    'highcharts-treemap',
    "highcharts-no-data-to-display",
    'amplify-pubsub'
], function ($, _, log, ERR, EVT, C, Pivotator, templates, templateStyle, i18n, Highcharts) {

    'use strict';

    function HC(o) {
        log.info("FENIX Highcharts");
        log.info(o);
        require('highcharts/modules/exporting')(Highcharts);
        /*
        console.log("0")

        require('highcharts-no-data-to-display')(Highcharts);
        require('highcharts-exporting')(Highcharts);

        console.log("0.5")
        if (!require.cache[require.resolveWeak("highcharts-no-data-to-display")]) {
            require('highcharts-no-data-to-display')(Highcharts);
        }

        if (!require.cache[require.resolveWeak("highcharts-exporting")]) {
            require('highcharts-exporting')(Highcharts);
        }
        console.log("1")
        */
        $.extend(true, this, C, o);
        var valid = this._validateInput();
        if (valid === true) {
            this._initVariables();
            this._bindEventListeners();
            this._renderHighcharts(this.pivotatorConfig);

            return this;

        } else {
            log.error("Impossible to create Highcharts");
            log.error(valid)
        }
    }

    // API

    /**
     * pub/sub
     * @return {Object} component instance
     */
    HC.prototype.on = function (channel, fn, context) {
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
    HC.prototype.redraw = function () {

        if (this.chart.hasRendered == true) {
            this.chart.reflow();
        } else {
            log.warn("Abort redraw");
        }

    };

    HC.prototype.update = function (config) {

        //TODO add validation
        this.type = config.type ? config.type : this.type;

        this._renderHighcharts(config);
    };

    HC.prototype._renderHighcharts = function (config) {

        log.info("FENIX Highcharts: _renderHighcharts");

        var model = this.model;

        var chartConfig = templates[this.type];

        if (!config) {
            alert("Impossible to find chart configuration: " + this.type);
        }

        var defaultRenderOptions = $.extend(true, {}, templateStyle, chartConfig);

        var highchartsConfig;

        if (typeof this.createConfiguration === 'function') {
            highchartsConfig = this.createConfiguration(model, defaultRenderOptions);
        } else {
            highchartsConfig = this._populateData(this.type, model, defaultRenderOptions);
        }

        highchartsConfig = $.extend(true, highchartsConfig, this.config);

        try {

            var typeExtend = this.type.split("_");

            switch (typeExtend[0]) {
                case "highstock":
                    this.chart = Highcharts.StockChart(this.el[0], highchartsConfig);

                    break;
                default :
                    this.chart = Highcharts.chart(this.el[0], highchartsConfig);

            }


        }
        catch (er) {
            console.log("error", er, config)
        }
        this._trigger("ready");

    };

    HC.prototype._populateData = function (type, model, config) {


        var typeExtend = type.toLowerCase().split("_");
        switch (typeExtend[0]) {

            case "highstock":

                var seriesOptions = [];
                for (var i in model.rows) {
                    var series = model.rows[i].join(" ");
                    var myData = [];
                    for (var j in model.cols2) {

                        var month = parseInt(model.cols2[j][0].substring(4, 6)) - 1;

                        /*for(var i in a){for(var j in a[i].data){var b=a[i].data[j];if(b[0]==null)console.log(b)}}*/

                        var myStandartData = new Date(model.cols2[j][0].substring(0, 4), month.toString(), model.cols2[j][0].substring(6, 8));


                        myData.push([myStandartData.getTime(), model.data[i][j]])
                    }
                    seriesOptions.push(
                        {name: series, data: myData}
                    );


                }
                //  console.log("higchart input",seriesOptions)
                config.series = seriesOptions;

                break

            case "heatmap":
                var count = 0;
                //console.log("model",model)
                for (var i in model.rows) {
                    config.xAxis.categories.push(model.rows[i].join(" "))
                }

                for (var i in model.cols2) {
                    config.yAxis.categories.push(model.cols2[i].join(" "))
                }
                for (var i in model.data) {
                    for (var j in model.data[i]) {

                        count++;
                        config.series[0].data.push([parseFloat(i), parseFloat(j), model.data[i][j]]);

                    }
                }

                break;

            case "scatter":
                for (var j in model.cols2) {
                    if (j > 0) {
                        var data = [];
                        for (var i in model.data) {
                            data.push([model.data[i][j - 1], model.data[i][j]])
                        }
                        config.series.push({name: model.cols2[j - 1] + " X " + model.cols2[j], data: data})
                    }
                }
                break;
            case "pyramid":
                var tempData = [];

                var nameM = "";
                if (model.cols2.length > 2) {
                    nameM = model.cols2[0].join("_");
                }
                var Male = {
                    name: nameM, data: jStat(model.data).col(0).alter(function (x) {
                        //console.log('x',x);
                        return x * -1;
                    })
                };
                var nameF = "";
                if (model.cols2.length > 2) {
                    nameF = model.cols2[1].join("_")
                }
                var Female = {
                    name: nameF,
                    data: jStat(model.data).col(1) || []
                };
                for (var i in model.rows) {
                    //if (i >20) {break;}
                    config.xAxis[0].categories.push(model.rows[i].join("_"));

                    config.xAxis[1].categories.push(model.rows[i].join("_"));
                    // config.xAxis.categories.push("test"+i);

                    /*    var ddata = [model.data[i][0],model.data[i][1]]
                     //console.log("JSTAT",ddata)
                     tempData.push(ddata);
                     */
                }
                config.series.push(Male);
                config.series.push(Female);

                break;
            case "boxplot":

                var tempData = [];
                for (var i in model.rows) {
                    config.xAxis.categories.push(model.rows[i].join("_"));
                    var ddata = [jStat(model.data[i]).min() + 0].concat(jStat(model.data[i]).quartiles().concat(jStat(model.data[i]).max()))
                    tempData.push(ddata);
                }
                config.series.push({data: tempData});

                break;
            case "donut":
                var tempData = [];
                var innerSize = Math.floor(100 / model.cols2.length);
                var innerBegin = 0;
                if (model.cols2.length == 1) {
                    innerBegin = 30;
                    innerSize = 70
                }
                for (var i in model.cols2) {
                    var myData = [];
                    for (var j in model.rows) {
                        if (model.data[j][i] > 0) {
                            myData.push({name: model.rows[j].join("-"), y: model.data[j][i]});
                        }
                    }

                    config.series.push({
                        name: model.cols2[i].join("-"),
                        data: myData,
                        size: (innerBegin + innerSize) + '%',
                        innerSize: innerBegin + '%',
                        dataLabels: {
                            formatter: function () {
                                return this.y > 5 ? this.point.name : null;
                            },
                            color: '#ffffff',
                            distance: -30
                        }
                    })
                    innerBegin += innerSize;

                    //console.log("JSTAT",ddata)

                    //	config.series.push({data: tempData,name:model.rows[i].join("_")});
                    //	config.series[0].data.push({y: ddata,name:model.rows[i].join("<br>")});


                }
                //console.log("config",config)
                break;
            case "pie":
                var tempData = [];
                for (var i in model.rows) {
                    //if (i > 20) {break;}
                    //config.xAxis.categories.push(model.rows[i].join("_"));
                    // config.xAxis.categories.push("test"+i);

                    var ddata = jStat(model.data[i]).sum();
//				var ddata = model.data[i][0];

                    //console.log("JSTAT",ddata)
                    tempData.push(ddata);
                    //	config.series.push({data: tempData,name:model.rows[i].join("_")});
                    //if(ddata>0)
                    config.series[0].data.push({
                        y: ddata,
                        name: model.rows[i].join("<br>"),
                        drilldown: model.rows[i].join("_")
                    });
                    var drilldata = [];

                    for (var j in model.cols2) {
                        if (model.data[i][j] > 0)
                            drilldata.push([model.cols2[j].join(" "), model.data[i][j]]);

                    }
                    var drillD = {
                        name: model.rows[i].join("<br>"),
                        id: model.rows[i].join("_"),
                        data: drilldata
                    };
                    config.drilldown.series.push(drillD)
                }
                break;


            case "pieold":
                config.chart.type = 'pie'; // temp fix to enable pieold to work
                for (var ii in model.cols) {
                    if (model.cols.hasOwnProperty(ii)) {
                        i = model.cols[ii];

                        config.xAxis.categories.push(i.title[this.lang]);

                    }
                }

                var dataArray = [];

                for (var k in model.rows) {
                    for (var j in config.xAxis.categories) {

                        var dataObj = {};
                        dataObj.y = model.data[k][j];
                        dataObj.name = config.xAxis.categories[j];
                        dataArray.push(dataObj);
                    }

                    config.series.push({name: model.rows[k].join(" "), data: dataArray});
                }

                break;

            case "treemapold":
                config = {
                    series: [{
                        type: 'treemap',
                        layoutAlgorithm: 'squarified',
                        allowDrillToNode: true,
                        animationLimit: 1000, turboThreshold: 0,
                        dataLabels: {
                            enabled: false
                        },
                        levelIsConstant: false,
                        levels: [{
                            level: 1,
                            dataLabels: {
                                enabled: true
                            },
                            borderWidth: 3
                        }],
                        data: []
                    }],
                    title: {
                        text: ''
                    }
                };
                for (var i in model.rows) {
                    //if(i<500 )
                    {
                        var ii = model.rows[i];
                        config.series[0].data.push({
                            name: ii.join(" "),
                            id: "id_" + i/*,value:jStat(model.data[i]).sum()*/
                        })

                        for (var j in model.cols2label) {
                            var jj = model.cols2label[j];
                            if (model.data[i][j] && model.data[i][j] >= 0)
                                config.series[0].data.push({
                                    name: jj.join(" "),
                                    id: "id_" + i + "_" + j,
                                    parent: "id_" + i,
                                    value: model.data[i][j]
                                })
                        }


                    }
                }
                //console.log(config.series);

                break;


            case "treemap":

                var model2 = {rows: this.pivotator.toTree(model.rows, 1), cols: this.pivotator.toTree(model.cols2, 1)};
                config = {
                    series: [{
                        type: 'treemap',
                        layoutAlgorithm: 'squarified',
                        allowDrillToNode: true,
                        animationLimit: 1000, turboThreshold: 0,
                        dataLabels: {enabled: false},
                        levelIsConstant: false,
                        levels: [{level: 1, dataLabels: {enabled: true}, borderWidth: 3}],
                        data: [],
                        title: ''
                    }]
                };

                for (var j in model2.rows) {
                    for (var i in model2.rows[j]) {
                        //console.log(model2.rows[j][i])
                        var ii = model2.rows[j][i];
                        config.series[0].data.push({
                            name: ii.id,
                            id: ii.id,
                            parent: ii.id.split("_").slice(0, ii.id.split("_").length - 1).join("_")/*,value:jStat(model.data[i]).sum()*/
                        })
                    }
                }


                for (var i in model.rows) {
                    //if(i<10 )
                    {
                        var ii = model.rows[i];
                        //config.series[0].data.push({name:ii.join(" "),id:"id_"+i/*,value:jStat(model.data[i]).sum()*/})

                        for (var j in model.cols2label) {
                            var jj = model.cols2label[j];
                            if (model.data[i][j] && model.data[i][j] >= 0)
                                config.series[0].data.push({
                                    name: jj.join(" "),
                                    id: "id_" + i + "_" + j,
                                    parent: ii.join("_"),
                                    value: model.data[i][j]
                                })
                        }


                    }
                }
                //console.log(config.series);

                break;

            case "bubble":

                for (var i in model.rows) {
                    if (model.data[i][0] && model.data[i][1] && model.data[i][2])
                        config.series[0].data.push(
                            {
                                x: model.data[i][0],
                                y: model.data[i][1],
                                z: model.data[i][2],
                                name: model.rows[i].join(" "),
                                country: ''
                            }
                        )
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
                //console.log("config",config)
                /*
                 config.series=[{
                 data: [
                 { x: 95, y: 95, z: 13.8, name: 'BE', country: 'Belgium' },
                 { x: 86.5, y: 102.9, z: 14.7, name: 'DE', country: 'Germany' },
                 { x: 80.8, y: 91.5, z: 15.8, name: 'FI', country: 'Finland' },
                 { x: 80.4, y: 102.5, z: 12, name: 'NL', country: 'Netherlands' },
                 { x: 80.3, y: 86.1, z: 11.8, name: 'SE', country: 'Sweden' },
                 { x: 78.4, y: 70.1, z: 16.6, name: 'ES', country: 'Spain' },
                 { x: 74.2, y: 68.5, z: 14.5, name: 'FR', country: 'France' },
                 { x: 73.5, y: 83.1, z: 10, name: 'NO', country: 'Norway' },
                 { x: 71, y: 93.2, z: 24.7, name: 'UK', country: 'United Kingdom' },
                 { x: 69.2, y: 57.6, z: 10.4, name: 'IT', country: 'Italy' },
                 { x: 68.6, y: 20, z: 16, name: 'RU', country: 'Russia' },
                 { x: 65.5, y: 126.4, z: 35.3, name: 'US', country: 'United States' },
                 { x: 65.4, y: 50.8, z: 28.5, name: 'HU', country: 'Hungary' },
                 { x: 63.4, y: 51.8, z: 15.4, name: 'PT', country: 'Portugal' },
                 { x: 64, y: 82.9, z: 31.3, name: 'NZ', country: 'New Zealand' }
                 ]
                 }]*/
                break;
            case "bubblecirclep":


                var I = 0;
                var II = [0, 0, 0, 0];
                for (var i in model.data) {
                    var jstatValeur = jStat(model.data[i]).sum();
//console.log(jstatValeur,i)
                    if (jstatValeur >= 0) {

                        var layer = 0;
                        if (I > 15) {
                            layer = 3
                        }
                        else if (I > 7) {
                            layer = 2
                        }
                        else if (I > 0) {
                            layer = 1
                        }
                        I++;

                        config.series[layer].data.push({
                            y: layer,
                            x: II[layer] / (layer * layer + 1),
                            z: jstatValeur,
                            name: model.rows[i].join("<br>"),
                            country: model.rows[i].join("<br>"),
                            drilldown: model.rows[i].join("_")
                        });
                        II[layer]++;
                        var DrillData = [];
                        for (var j in model.data[i]) {
                            var realData = model.data[i][j];
                            if (realData !== null && realData >= 0) {
                                //console.log("realData",realData)
                                DrillData.push(
                                    {
                                        name: model.cols2[j].join("<br>"),
                                        country: model.cols2[j].join("<br>"),
                                        x: parseInt(j),
                                        y: 1,
                                        z: realData
                                    }
                                )
                            }
                        }
                        config.drilldown.series.push(
                            {
                                name: model.cols2[j].join("_"),
                                id: model.rows[i].join("_"),
                                data: DrillData
                            });

                    }
                }
                config.tooltip = {
                    useHTML: true,
                    headerFormat: '<table>',
                    pointFormat: '<tr><th colspan="2"><h3>{point.name}</h3></th></tr>' +
                    '<tr><th>{point.x}/{point.y}:</th><td>{point.z}</td></tr>',
                    footerFormat: '</table>',
                    followPointer: true
                };

                break;


            case "bubblecircle":


                var obj = {};
                var countRow = 0;

                var orderRow = [];
                for (var i in model.data) {
                    var jstatValeur = jStat(model.data[i]).sum();
                    if (jstatValeur >= 0) {
                        orderRow.push(jstatValeur/*.toFixed(10)*/ + "_" + i)
                    }
//						orderRow.push( (jstatValeur>=0?jstatValeur.toFixed(10):-1) +"_"+i);
                }
                orderRow.sort(function (a, b) {
                    if (b.split('_')[0] < 0) {
                        return -1
                    }
                    return b.split('_')[0] - a.split('_')[0];
                });

                var incrementalAngle = 2 * Math.PI / (orderRow.length - 1);
                var currentAngle = 0;

                for (var i in orderRow) {
                    var v = orderRow[i].split("_");
                    var Z = parseFloat(v[0]);
                    var I = parseInt(v[1]);
                    //console.log("befor I",i,countRow)
                    //if(i<countRow){
                    //console.log("creation de I	",v,I)

                    if (i == 0) {
                        obj = {
                            x: 0,
                            y: 0,
                            z: Z, name: model.rows[I].join("<br>"),
                            country: model.rows[I].join("<br>"),
                            drilldown: model.rows[I].join("_")
                        };
                    }
                    else {
                        obj = {
                            x: Math.cos(currentAngle),
                            y: Math.sin(currentAngle),
                            z: Z, name: model.rows[I].join("<br>"),
                            country: model.rows[I].join("<br>"),
                            drilldown: model.rows[I].join("_")
                        };
                        currentAngle += incrementalAngle;
                    }


                    config.series[0].data.push(obj);
                    //}

                    var drillData = [];
                    var secondCount = 0;
                    var currentAngle2 = 0;
                    var orderRow2 = 0;
                    for (var j in model.data[I]) {
                        if (model.data[I][j] >= 0) {
                            orderRow2++;
                        }
                    }
                    var incrementalAngle2 = 2 * Math.PI / (orderRow2);
                    //console.log("incrementalAngle2",incrementalAngle2)

                    for (var j in model.data[I]) {
                        //console.log("currentA ngle2",currentAngle2)
                        if (model.data[I][j] !== null && model.data[I][j] >= 0) {

                            if (secondCount == 0) {
                                drillData.push({
                                    name: model.cols2[j].join("<br>"),
                                    country: model.cols2[j].join("<br>"),
                                    x: 0,
                                    y: 0,
                                    z: model.data[I][j]
                                });
                                //console.log(" b ",j);
                            }
                            else {
                                //console.log("currentAngle2",currentAngle2)
                                drillData.push({
                                    name: model.cols2[j].join("<br>"),
                                    country: model.cols2[j].join("<br>"),
                                    x: Math.cos(currentAngle2),
                                    y: Math.sin(currentAngle2),
                                    z: model.data[I][j]
                                });
                            }
                            secondCount++;
                            currentAngle2 += incrementalAngle2;
                        }

                    }
                    config.drilldown.series.push(
                        {
                            name: model.cols2[j].join("_"),
                            id: model.rows[I].join("_"),
                            data: drillData
                        });
                }
                //console.log("config",config)
                config.plotOptions = {
                    series: {
                        dataLabels: {
                            enabled: true,
                            format: '{point.name}'
                        },
                        bubble: {maxSize: "33%"}
                    }
                };

                config.tooltip = {
                    useHTML: true,
                    headerFormat: '<table>',
                    pointFormat: '<tr><th colspan="2">{point.country}</th></tr>' +
                    '<tr><th>' + ':</th><td>{point.z}</td></tr>',
                    footerFormat: '</table>',
                    followPointer: true
                };

                break;
            default:

                for (var ii in model.cols) {

                    if (model.cols.hasOwnProperty(ii)) {
                        i = model.cols[ii];
                        config.xAxis.categories.push(i.title[this.lang]);
                    }
                }

                for (var i in model.rows) {

                    //	 console.log("1 ",config.series)
                    config.series.push({name: model.rows[i].join(" "), data: model.data[i]});
                    //	 console.log("2 ",config.series)

                }
        }

        //	console.log("config",config)
        return config;
    };


    HC.prototype._trigger = function (channel) {

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

    HC.prototype._validateInput = function () {

        var valid = true,
            errors = [];

        return errors.length > 0 ? errors : valid;

    };

    HC.prototype._initVariables = function () {

        log.info("FENIX Highcharts: _initVariables");

        //pub/sub
        this.channels = {};

        this.pivotator = new Pivotator();

        //i18n
        Highcharts.setOptions({
            lang: {
                downloadJPEG: i18n[this.lang.toLowerCase()]['downloadJPEG'],
                downloadPDF: i18n[this.lang.toLowerCase()]['downloadPDF'],
                downloadPNG: i18n[this.lang.toLowerCase()]['downloadPNG'],
                downloadSVG: i18n[this.lang.toLowerCase()]['downloadSVG'],
                printChart: i18n[this.lang.toLowerCase()]['printChart']
            }
        });

    };

    HC.prototype._bindEventListeners = function () {

        //amplify.subscribe(this._getEventName(EVT.SELECTOR_READY), this, this._onSelectorReady);

    };

    HC.prototype._getEventName = function (evt) {

        return this.id.concat(evt);
    };

    //disposition
    HC.prototype._unbindEventListeners = function () {

        //amplify.unsubscribe(this._getEventName(EVT.SELECTOR_READY), this._onSelectorReady);

    };

    HC.prototype.dispose = function () {

        //this.chart.dispose(); change in highchart destroy

        //unbind event listeners
        this._unbindEventListeners();

    };

    // utils

    return HC;
});