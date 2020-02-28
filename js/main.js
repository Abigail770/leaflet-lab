/* Script by Abigail Gleason, 2020 */
//leaflet tutorial
var mymap = L.map('mapid',{
    maxZoom: 18,
}).setView([39.8283, -98.5795], 4);

//mapbox tile layer
//L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWJpZ2FpbDc3MCIsImEiOiJjazYyZDFqa24wZDl1M2tyd3NnMTdnZjQyIn0.XC5wZaakqpSNfHIJjW8vCQ', {
//    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
//    maxZoom: 18,
//    id: 'mapbox/streets-v11',
//    accessToken: 'pk.eyJ1IjoiYWJpZ2FpbDc3MCIsImEiOiJjazYyZDFqa24wZDl1M2tyd3NnMTdnZjQyIn0.XC5wZaakqpSNfHIJjW8vCQ'
//}).addTo(mymap);

L.esri.basemapLayer('DarkGray').addTo(mymap);
L.esri.basemapLayer('DarkGrayLabels').addTo(mymap);

var webpageText = "To use the map's interactive features, click the 'skip' and 'reverse' buttons or drag the slider bar to view temporal changes.";

//hide text with zoom
mymap.on('zoomend', function() {
    var zoomLevel = mymap.getZoom()
    hideTextOnZoom(zoomLevel, webpageText);
}) 

function hideTextOnZoom (zoomLevel, webpageText){
    if (zoomLevel > 4){
        $("#webpage-text").html("");
        $("#webpage-text").css("padding", "0px");
    }
    else{
        $("#webpage-text").html(webpageText);
        $("#webpage-text").css("padding", "10px");
    }
}

//collapsible content
var accordion = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < accordion.length; i++) {
  accordion[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var panel = this.nextElementSibling;
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
    }
  });
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 30;
    //area based on attribute value and scale factor
    var area = attValue *scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;
};

//create popup
function Popup(properties, attribute, layer, radius){
    this.properties = properties;
    this.attribute = attribute;
    this.layer = layer;
    this.year = attribute.split("_")[1];
    this.costOfLiving = this.properties[attribute];
    this.content = "<p><b>City:</b> " + this.properties.City + "</p><p><b>Cost of Living Index in " + this.year + "<p><b>was " + this.costOfLiving;

    this.bindToLayer = function(){
        this.layer.bindPopup(this.content, {
            offset: new L.Point(0,-radius)
        });
    };
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){

    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "black",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    var panelContent = "<p><b>City:</b> " + feature.properties.city + "</p>";

    //create new popup
    var popup = new Popup(feature.properties, attribute, layer, options.radius);

    //add popup to circle marker
    popup.bindToLayer();

    //event listeners to open popup on hover
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        },
        click: function(){
            $("#panel").html(popup);
        }
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, map, attributes){
    
    //create a Leaflet GeoJSON layer and add it to the map
    var searchLayer = L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    });
    
    //... adding data in searchLayer ...
    L.map('map', { searchControl: {layer: searchLayer} });
    
    var searchControl = new L.control.search({
        layer: searchLayer,
        initial: false,
        propertyName: 'City', // Specify which property is searched into.
       
    })
    
    .addTo(map);
    
    searchControl.on('search:locationfound', function(event) {
        event.layer.openPopup();
    });
    
};

//Create new sequence controls
function createSequenceControls(map, attributes){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            $(container).append('<input class="range-slider" type="range">');
            
             //add skip buttons
            $("#panel").append('<button class="skip" id="reverse"></button>');
            $("#panel").append('<button class="skip" id="forward"></button>');
            $(container).append($('#reverse').html('<img src="images/reverse.png">'));
            $(container).append($('#forward').html('<img src="images/forward.png">'));
            
            //kill any mouse event listeners on the map
            $(container).on('mousedown dblclick', function(e){
                L.DomEvent.stopPropagation(e);
            });

            return container;
        }
    });

    map.addControl(new SequenceControl());
    //set slider attributes
    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1
    });
    
    //click listener for buttons
    $('.skip').click(function(){
        //sequence
        var index = $('.range-slider').val();

        //increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            //if past the last attribute, wrap around to first attribute
            index = index > 6 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //if past the first attribute, wrap around to last attribute
            index = index < 0 ? 6 : index;
        };

        //update slider
        $('.range-slider').val(index);
        updatePropSymbols(map, attributes[index]);
        });
    
    $('.range-slider').on('input', function(){
        //Step 6: get the new index value
        var index = $(this).val();
         updatePropSymbols(map, attributes[index]);
    });
};

function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            // create temporal legend
             $(container).append('<div id="temporal-legend">')

            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="200px" height="90px">';

            //array of circle names to base loop on
            var circles = {
            max: 20,
            mean: 40,
            min: 60
        };

        //loop to add each circle and text to svg string
        for (var circle in circles){
            //circle string
            svg += '<circle class="legend-circle" id="' + circle + '" fill="black" fill-opacity="0.8" stroke="green" cx="45"/>';

            //text string
            svg += '<text id="' + circle + '-text" x="95" y="' + circles[circle] + '"></text>';
        };
            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            $(container).append(svg);
            
            return container;
        }
    });

    map.addControl(new LegendControl());
    
    updateLegend(map, attributes[0]);
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

//Update the legend with new attribute
function updateLegend(map, attribute){
    //create content for legend
    var year = attribute.split("_")[1];
    var content = "Cost of living index in " + year;

    //replace legend content
    $('#temporal-legend').html(content);
    
    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);

    for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        //assign the cy and r attributes
        $('#'+key).attr({
            cy: 85 - radius,
            r: radius
            
         });
        //add legend text
        $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + " COL index");
    };
};

function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            var popup = new Popup(props, attribute, layer, radius);

            //add popup to circle marker
            popup.bindToLayer();
            updateLegend(map, attribute);
        };
    });
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("COL") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};

//Import GeoJSON data
function getData(map){
    //load the data
    $.ajax("data/CostOfLivingIndex.geojson", {
        dataType: "json",
        success: function(response){
            //create an attributes array
            var attributes = processData(response);
            
            //call functions to create map items
            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
            createLegend(map, attributes);
        }
    });
};

getData(mymap);