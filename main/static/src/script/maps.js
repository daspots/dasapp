'use strict';

function generateBox(image_url, location_url, location_keyword, name, keyword_urls, recommender, recommender_url, docid, website, content, google_maps_directions){
 result = '<div class="box" style="max-width:300px;"><img class="img-fluid" data-gifffer="';
 result += image_url;
 result += '"><ul class="additionalLinks" style="margin-left:0px;padding-left:0px;padding-top:3px"><div><i class="fa fa-map-marker map-marker" aria-hidden="true"></i><a class="thumbnailLocation" href="';
 result += location_url;
 result += '">';
 result += location_keyword;
 result += '</a></div><li class="iconList"><h1 class="thumbnailTitle">';
 result += name;
 result += '</h1></li></ul><div class="addPadding">';
 result += keyword_urls;
 result += '</div>';
 result +=  '<div class="tab"><br><a class="linkRecommendedBy" href="';
 result += recommender_url;
 result += '"> BY ' + recommender + "</a>";
 result += '<input id="';
 result += docid;
 result += '" class="hidden draaiknopje" type="checkbox" name="tabs">';
 result += '<label for="' + docid + '">';
 result += '<ul class="additionalLinks" style="margin-left:0px;padding-left:0px;padding-top:10px">';
 result += '<li class="iconList"><a href="' + website + '"><img src="/p/img/ic_open_in_new_black_24px.png" class="postIcon"></a></li>';
 result += '<li class="iconList"><a href="' + google_maps_directions + '"><img src="/p/img/ic_directions_black_24px.png" class="postIcon"></a></li></ul>';
 result += '</label>';
 result += '<div class="tab-content">';
 result += '<p class="pLeft">' + content + '</p>';
 result += '</div></div></div>';

 return result;

}


var _templateObject = _taggedTemplateLiteral(
['<div class="box scrollFix"><img class="img-fluid" data-gifffer="',
'"><ul class="additionalLinks" style="margin-left:0px;padding-left:0px;padding-top:3px"><div><i class="fa fa-map-marker map-marker" aria-hidden="true"></i><a class="thumbnailLocation" href="',
'">',
'</a></div><li class="iconList"><h1 class="thumbnailTitle">',
'</h1></li></ul><div class="addPadding">',
'</div>',

],

['<div style="margin-bottom:20px;"><h2>',
'</h2><p>',
'</p><p><img class="img-fluid" data-gifffer="',
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

function getKeywordUrls(mainUrl, keywordArray){
    var result = '';
    var aLen = Math.min(3,  keywordArray.length);
    for (var i = 0; i < aLen; i++) {
      result += '<a class="thumbnailHashtag" href="';
      result += mainUrl;
      result += keywordArray[i];
      result += '">#';
      result += keywordArray[i];
      result += '</a>';
    }
    console.log(result);
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
//  var mapStyle = [{
//    "featureType": "administrative",
//    "elementType": "all",
//    "stylers": [{
//      "visibility": "on"
//    }, {
//      "lightness": 33
//    }]
//  }, {
//    "featureType": "landscape",
//    "elementType": "all",
//    "stylers": [{
//      "color": "#f2e5d4"
//    }]
//  }, {
//    "featureType": "poi.park",
//    "elementType": "geometry",
//    "stylers": [{
//      "color": "#c5dac6"
//    }]
//  }, {
//    "featureType": "poi.park",
//    "elementType": "labels",
//    "stylers": [{
//      "visibility": "on"
//    }, {
//      "lightness": 20
//    }]
//  }, {
//    "featureType": "road",
//    "elementType": "all",
//    "stylers": [{
//      "lightness": 20
//    }]
//  }, {
//    "featureType": "road.highway",
//    "elementType": "geometry",
//    "stylers": [{
//      "color": "#c5c6c6"
//    }]
//  }, {
//    "featureType": "road.arterial",
//    "elementType": "geometry",
//    "stylers": [{
//      "color": "#e4d7c6"
//    }]
//  }, {
//    "featureType": "road.local",
//    "elementType": "geometry",
//    "stylers": [{
//      "color": "#fbfaf7"
//    }]
//  }, {
//    "featureType": "water",
//    "elementType": "all",
//    "stylers": [{
//      "visibility": "on"
//    }, {
//      "color": "#acbcc9"
//    }]
//  }];
  // Create the map.
  var map = new google.maps.Map(document.getElementsByClassName('map')[0], {
    zoom: 7,
    center: { lat: 0, lng: 0 },
//    styles: mapStyle
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
    var image_url = event.feature.getProperty('image_url');
    var location_keyword = event.feature.getProperty('location');
    var location_url = '/post/q/' + location_keyword;
    var keywords = event.feature.getProperty('keywords').split(',');
    var keyword_urls = getKeywordUrls('/post/q/', keywords);
    var recommender = event.feature.getProperty('recommender');
    var recommender_url = '/post/q/recommender=' + recommender;
    var docid = event.feature.getProperty('docid');
    var website = event.feature.getProperty('website');
    var address = event.feature.getProperty('address');
    var google_maps_directions = 'https://www.google.com/maps?saddr=My+Location&daddr=' + address.replace(' ', '+');

    var position = event.feature.getGeometry().get();
//    var content = sanitizeHTML(_templateObject, image_url, location_url, location_keyword, name, keyword_urls);
    var content = generateBox(image_url, location_url, location_keyword, name, keyword_urls, recommender, recommender_url, docid, website, description, google_maps_directions);
    infoWindow.setContent(content);
    infoWindow.setPosition(position);

    infoWindow.open(map);

    Gifffer({
      playButtonStyles: {
        'width': '60px',
        'height': '60px',
        'border-radius': '30px',
        'background': 'rgba(0, 0, 0, 0.3)',
        'position': 'absolute',
        'top': '50%',
        'left': '50%',
        'margin': '-30px 0 0 -30px'
      },
      playButtonIconStyles: {
        'width': '0',
        'height': '0',
        'border-top': '14px solid transparent',
        'border-bottom': '14px solid transparent',
        'border-left': '14px solid rgba(255,255,255, 0.5)',
        'position': 'absolute',
        'left': '26px',
        'top': '16px'
      }
    });

  });
}

$('.map_link').on('click',function() {
  $("#restaurant").css({"display":"none"});

  $("#map").fadeIn();
  initMap();
  $("a.lista").css({"color":"gray"});
  $("a.mapa").css({"color":"black"});


})

$('.list_link').on('click',function() {
  $("#map").css({"display":"none"});
  $("#restaurant").fadeIn();

  $("a.lista").css({"color":"black"});
  $("a.mapa").css({"color":"gray"});

})