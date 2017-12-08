'use strict';

var _templateObject = _taggedTemplateLiteral(
['<div style="margin-bottom:20px;"><h2>',
'</h2><p>',
'</p><p><img src="https://maps.googleapis.com/maps/api/streetview?size=350x120&location=',
',', '&key=',
'"></p></div>'],
['<div style="margin-left:220px; margin-bottom:20px;"><h2>',
'</h2><p>',
'</p><p><img src="https://maps.googleapis.com/maps/api/streetview?size=350x120&location=',
',',
'&key=',
'"></p></div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

// Style credit: https://snazzymaps.com/style/1/pale-dawn


// Escapes HTML characters in a template literal string, to prevent XSS.
// See https://www.owasp.org/index.php/XSS_%28Cross_Site_Scripting%29_Prevention_Cheat_Sheet#RULE_.231_-_HTML_Escape_Before_Inserting_Untrusted_Data_into_HTML_Element_Content
function sanitizeHTML(strings) {
  var entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  var result = strings[0];
  for (var i = 1; i < arguments.length; i++) {
    result += String(arguments[i]).replace(/[&<>'"]/g, function (char) {
      return entities[char];
    });
    result += strings[i];
  }
  return result;
}

function processPoints(geometry, callback, thisArg) {
  if (geometry instanceof google.maps.LatLng) {
    callback.call(thisArg, geometry);
  } else if (geometry instanceof google.maps.Data.Point) {
    callback.call(thisArg, geometry.get());
  } else {
    geometry.getArray().forEach(function (g) {
      processPoints(g, callback, thisArg);
    });
  }
}

function initMap() {
  var mapStyle = [{
    "featureType": "administrative",
    "elementType": "all",
    "stylers": [{
      "visibility": "on"
    }, {
      "lightness": 33
    }]
  }, {
    "featureType": "landscape",
    "elementType": "all",
    "stylers": [{
      "color": "#f2e5d4"
    }]
  }, {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{
      "color": "#c5dac6"
    }]
  }, {
    "featureType": "poi.park",
    "elementType": "labels",
    "stylers": [{
      "visibility": "on"
    }, {
      "lightness": 20
    }]
  }, {
    "featureType": "road",
    "elementType": "all",
    "stylers": [{
      "lightness": 20
    }]
  }, {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{
      "color": "#c5c6c6"
    }]
  }, {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{
      "color": "#e4d7c6"
    }]
  }, {
    "featureType": "road.local",
    "elementType": "geometry",
    "stylers": [{
      "color": "#fbfaf7"
    }]
  }, {
    "featureType": "water",
    "elementType": "all",
    "stylers": [{
      "visibility": "on"
    }, {
      "color": "#acbcc9"
    }]
  }];
  // Create the map.
  var map = new google.maps.Map(document.getElementsByClassName('map')[0], {
    zoom: 7,
    center: { lat: 0, lng: 0 },
    styles: mapStyle
  });

  var bounds = new google.maps.LatLngBounds();
  map.data.addListener('addfeature', function (e) {
    processPoints(e.feature.getGeometry(), bounds.extend, bounds);
    map.fitBounds(bounds);
  });
  console.log(query);
  api_url = '/api/v1/post/' + query;
  // Load the stores GeoJSON onto the map.
  map.data.loadGeoJson(api_url);

  // Define the custom marker icons, using the store's "category".
  //  map.data.setStyle(feature => {
  //    return {
  //      icon: {
  //        url: `img/icon_${feature.getProperty('category')}.png`,
  //        scaledSize: new google.maps.Size(64, 64)
  //      }
  //    };
  //  });

  var apiKey = 'AIzaSyAbcMGMULgp5l0Trav2G3OseIrNGIxHDZk';
  var infoWindow = new google.maps.InfoWindow();
  infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -30) });

  // Show the information for a store when its marker is clicked.
  map.data.addListener('click', function (event) {

    var name = event.feature.getProperty('name');
    var description = event.feature.getProperty('description');

    var position = event.feature.getGeometry().get();
    var content = sanitizeHTML(_templateObject, name, description, position.lat(), position.lng(), apiKey);

    infoWindow.setContent(content);
    infoWindow.setPosition(position);

    infoWindow.open(map);
  });
}