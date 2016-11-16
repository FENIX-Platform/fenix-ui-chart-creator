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
    'highcharts',
    'highcharts-more',
    'highcharts-treemap',
    "highcharts-no-data-to-display",
    'amplify-pubsub'
], function ($, _, log, ERR, EVT, C, Pivotator, templates, templateStyle, i18n, Highcharts) {

    'use strict';

    function HC(o) {
        log.info("FENIX Highcharts");
        log.info(o);

        // Load Exporting Module after Highcharts loaded
        require('highcharts/modules/exporting')(Highcharts);

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

        if (this.chart.length > 0) {
            this.chart.highcharts().reflow();
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

        var highchartsConfig = $.extend(true, highchartsConfig, this.config);

        try {
            this.chart = Highcharts.chart(this.el[0], highchartsConfig);
        }
        catch (er) {
            console.log("error", er, config)
        }
        this._trigger("ready");

    };

    HC.prototype._populateData = function (type, model, config) {

        switch (type.toLowerCase()) {
            //add type process
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

                        //if(count<150 /*&& model.data[i][j]*/)
                        {
                            count++;
                            config.series[0].data.push([parseFloat(i), parseFloat(j), model.data[i][j]]);
                        }
                    }
                }
                /*
                 config.series[0].data.push([0,0,2]);
                 config.series[0].data.push(		[0,1,3]	);

                 config.series[0].data.push([1,0,5]);
                 config.series[0].data.push(		[1,1,4]	);
                 console.log('et alrs la');
                 */
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
                    //if (i >20) {break;}
                    config.xAxis.categories.push(model.rows[i].join("_"));
                    // config.xAxis.categories.push("test"+i);

                    var ddata = [jStat(model.data[i]).min() + 0].concat(jStat(model.data[i]).quartiles().concat(jStat(model.data[i]).max()))
                    tempData.push(ddata);

                }

                config.series.push({data: tempData});

                break;
            case "donut":
                var tempData = [];
                //console.log(model)
                var innerSize = Math.floor(100 / model.cols2.length);
                var innerBegin = 0;
                //console.log("innerSize",innerSize)
                for (var i in model.cols2) {

                    var myData = [];
                    for (var j in model.rows) {
                        if (model.data[j][i] > 0)
                            myData.push({name: model.rows[j].join("-"), y: model.data[j][i]})
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
                //console.log("config",config)
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
                //console.log("Model",model);

                var model2 = {rows: this.pivotator.toTree(model.rows, 1), cols: this.pivotator.toTree(model.cols2, 1)};
                //console.log("mod2",model2)
                config = {
                    series: [{
                        type: 'treemap',
                        layoutAlgorithm: 'squarified',
                        allowDrillToNode: true,
                        animationLimit: 1000, turboThreshold: 0,
                        dataLabels: {enabled: false},
                        levelIsConstant: false,
                        levels: [{level: 1, dataLabels: {enabled: true}, borderWidth: 3}],
                        data: []
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

            case "bubblecircle":


                var obj = {};
                var countRow=0;
                
                var orderRow=[];
                for(var i in model.data) {
                    orderRow.push( (model.data[i][0]?model.data[i][0].toFixed(10):-1) +"_"+i);
                }

                console.log("orderRow",orderRow);

                orderRow.sort(function(a,b) {
                    return a.split('_')[0] - b.split('_')[0];
                });
//console.log("orderRow",orderRow)

                for(var i in orderRow)
                {
                    var v=orderRow[i].split("_");

                    if(parseFloat(v[0])!==null && parseFloat(v[0])>=0)
                        countRow++;
                }

                var incrementalAngle = 2*Math.PI/countRow;

                var currentAngle=0;
                for (var i in orderRow)
                {
                    var v=orderRow[i].split("_");
                    var Z = parseFloat(v[0]);
                    var I=parseInt(v[1]);
                    if(Z!==null && Z>=0) {

                        var X=Math.cos(currentAngle);
                        var Y=Math.sin(currentAngle);
                        obj = {
                            x: X,
                            y: Y,
                            z: Z,                            
                            name: model.rows[I].join(" " ),
                            country: model.rows[I].join(" " )
                        };

                        currentAngle+=incrementalAngle;
                        
                        config.series[0].data.push(obj);
                    }
                }
                //console.log('model row: ', obj);

                config.tooltip = {
                    useHTML: true,
                    headerFormat: '<table>',
                    pointFormat: '<tr><th colspan="2">{point.country}</th></tr>' +
                    '<tr><th>' + model.cols2[0] + ':</th><td>{point.z}</td></tr>',
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