[![Stories in Ready](https://badge.waffle.io/FENIX-Platform/fenix-ui-olap.png?label=ready&title=Ready)](https://waffle.io/FENIX-Platform/fenix-ui-olap)
=============


#FENIX UI CHART


Requirejs import : 
```javascript
define(['fenix-ui-chart-creator'], function (ChartCreator) {
...
```
From a  Fenix resource (FX in this document) and some parameters provided to the initialization function, a pivotator-based creator will perform three mains operations : 
	-denormalisation of the dataset(optional)
	-aggregation (optional)
	-renderisation of the result with an external library


Constructor :
```javascript
   this.chart = new ChartCreator(config);
   ```
with config is a json Object with these fields :
<table>
   <tbody>
      <tr>
         <th>Parameter</th>
         <th>Type</th>
         <th>Default Value</th>
         <th>Example</th>
         <th>Description</th>
      </tr>
      <tr>
         <td>type </td>
         <td>string</td>
         <td>-</td>
         <td>type:"column"</td>
         <td> type of chart we want to display
            currently available : 
            "line","column", "column_stacked", "area", "pyramide", "area_stacked", "scatter","boxplot"
         </td>
      </tr>
      <tr>
         <td>x</td>
         <td>json array</td>
         <td>[]</td>
         <td>x:["Country_EN","Indicator_EN"]</td>
         <td>List the dimensions to put in x-axis of the graph</td>
      </tr>
      <tr>
         <td>series</td>
         <td>json array</td>
         <td>[]</td>
         <td>series:["Year"]</td>
         <td>List the dimensions that will be inerpreted as series in the graph</td>
      </tr>
      <tr>
         <td>aggregations</td>
         <td>json array</td>
         <td>[]</td>
         <td>aggregations:["ElementCode_EN"]</td>
         <td>FX columns we want to aggregate,they will not appears in the
            Grid
         </td>
      </tr>
      <tr>
         <td>y</td>
         <td>json array</td>
         <td>[]</td>
         <td>y:["values"]</td>
         <td> describe wich FX columns will be aggregates and displayed as Y-axis of the chart</td>
      </tr>
      <tr>
         <td>aggregationFn</td>
         <td>json Object</td>
         <td>{}</td>
         <td> {value:"sum",Flag:"dif",Units:"dif"}</td>
         <td>This object is needed to identify which aggregation function
            have to be applied for each field on the "values" part of the dataset.
            The functions identifiers "sum" and dif in this example refer to a
            function of aggregation implemented in the functions part of the
            application and can be easily extended if needed
         </td>
      </tr>
      <tr>
         <td>formatter</td>
         <td>string</td>
         <td>-</td>
         <td> "localstring" or "value"</td>
         <td>identifier of the formater function for the value field
            localstring result will be in this format : "1 250,12", value will
            return 1250,12 ; value is  recommanded for charting
         </td>
      </tr>
      <tr>
         <td>hidden</td>
         <td> json array</td>
         <td><br></td>
         <td>hidden:["DomainCode"]</td>
         <td>this FX columns will not appear in the name of the series or of the X-axis</td>
      </tr>
      <tr>
         <td>decimals</td>
         <td>integer</td>
         <td></td>
         <td>decimals:2</td>
         <td> number of decimals in the values numbers</td>
      </tr>
      <tr>
         <td>el</td>
         <td>CSS3 Selector/JavaScript DOM element/jQuery DOM element</td>
         <td> - </td>
         <td>"#container"</td>
         <td>Optional component container. if specified items's will be searched within it otherwise within the whole document.</td>
      </tr>
      <tr>
         <td>model</td>
         <td><br></td>
         <td><br></td>
         <td><br></td>
         <td> The ressource FENIX to display</td>
      </tr>
    <tr>
       <td>createConfiguration(pivotatorModel, defaultChartConfiguration)</td>
       <td>function</td>
       <td> - </td>
       <td>- </td>
       <td>Create manually the chart configuration</td>
    </tr>
   </tbody>
</table>

Full example : 
```javascript
var FX={
  metadata:{
	dsd:{
	columns:[
		{"id" : "country","title" : {"EN" : "COUNTRY CODE"},key:true},
		{"id" : "country_EN","title" : {"EN" : "COUNTRIES"}},
		{"id" : "element","title" : { "EN" : "elementcode"},key:true},
		{"id" : "element_EN","title" : {"EN" : "element"}},
		{"id" : "item","title" : {"EN" : "Item"},key:true},
		{"id" : "item_EN","title" : {"EN" : "item"}},
		{"id" : "year","title" : {"EN" : "year"},key:true,subject:"time"},
		{"id" : "um","title" : {"EN" : "um"},subject:"um"},
		{"id" : "value","title" : {"EN" : "value"},subject:"value",dataType:"number"},
		{"id" : "flag","title" : {"EN" : "flag"},subject:"flag"},
		{"id" : "v1","title" : {"EN" : "v1"},dataType:"number",subject:"value"},
		{"id" : "v1|*v2","title" : {"EN" : "v2"},subject:"flag"}	,{"id" : "v3","title" : {"EN" : "v3"}},{"id" : "v4","title" : {"EN" : "v4"}},{"id" : "v5","title" : {"EN" : "v5"}}
		]
		}
		},
  
  "data" : [
  ["4","Algeria","5312","Area_harvested","366","Artichokes","2006","Ha","1713.00","","","003","1","007",""],
  ["4","Algeria","5312","Area_harvested","366","Artichokes","2007","Ha","1813.00","","","003","1","007",""]]};

var config={
series :["country_EN","element_EN","item_EN"],
 x :["year"],
aggregations:["item_EN"],
y:["value"],
aggregationFn:{value:"sum"},
formatter:"localstring",
model:FX,
el:"#result",
type:"line"
}


   this.chart = new ChartCreator(config);
   ```
will create a line chart in the container with the ID=result with country label, element label in row and the year in columns, group by the item: the aggregation function used will be the sum for the columns "value"


#update
the update function allow the user to modify the config file and refresh the chart : model,el have don't need to be provided.
example : 
```javascript
this.chart.update({type:"area"})

```
