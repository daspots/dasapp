'use strict';

function escapeHTML(string) {
    return string.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getCleanName(feature, property){
    //return string stipped of html codes
    return escapeHTML(feature.getProperty(property));
}

function getKeywordUrls(mainUrl, keywordArray){
    // Returns a string of html links based on array of keywords
    var result = '';
    var aLen = Math.min(3,  keywordArray.length);
    for (var i = 0; i < aLen; i++) {
      html = [
        '<a class="thumbnailHashtag" href="' + mainUrl + keywordArray[i] + '">',
            '#' + keywordArray[i],
         '</a>'
      ].join("\n");
      result += html;
    }
    return result;
}


function generateBox(feature){
 // Generates the HTML code for the map info window
 var search_page_url = '/post/q/';

 var name = getCleanName(feature, 'name');
 var description = getCleanName(feature, 'description');
 var image_url = getCleanName(feature, 'image_url');
 var location_keyword = getCleanName(feature, 'location');
 var keywords = getCleanName(feature, 'keywords').split(',');
 var recommender = getCleanName(feature, 'recommender');
 var docid = getCleanName(feature, 'docid');
 var website = getCleanName(feature, 'website');
 var address = getCleanName(feature, 'address');


 var location_url = search_page_url + location_keyword;
 var keyword_urls = getKeywordUrls(search_page_url, keywords);
 var recommender_url = search_page_url + 'recommender=' + recommender.replace(',', '');
 var google_maps_directions = 'https://www.google.com/maps?saddr=My+Location&daddr=' + address.replace(' ', '+');

 var html = [
 '<div class="box" style="max-width:300px;">',
    '<img class="img-fluid" data-gifffer="' + image_url + '">',
    '<ul class="additionalLinks" style="margin-left:0px;padding-left:0px;padding-top:3px">',
        '<div>',
            '<i class="fa fa-map-marker map-marker" aria-hidden="true"></i>',
            '<a class="thumbnailLocation" href="' + location_url + '">',
                location_keyword,
             '</a>',
        '</div>',
        '<li class="iconList">',
            '<h1 class="thumbnailTitle">' + name + '</h1>',
         '</li>',
    '</ul>',
    '<div class="addPadding">' + keyword_urls + '</div>',
    '<div class="tab">',
        '<br><a class="linkRecommendedBy" href="' + recommender_url + '"> BY ' + recommender + '</a>',
        '<input id="' + docid + '" class="hidden draaiknopje" type="checkbox" name="tabs">',
        '<label for="' + docid + '">',
            '<ul class="additionalLinks" style="margin-left:0px;padding-left:0px;padding-top:10px">',
                '<li class="iconList"><a href="' + website + '">',
                    '<img src="/p/img/ic_open_in_new_black_24px.png" class="postIcon">',
                '</a></li>',
                '<li class="iconList"><a href="' + google_maps_directions + '">',
                    '<img src="/p/img/ic_directions_black_24px.png" class="postIcon">',
                 '</a></li>',
            '</ul>',
        '</label>',
        '<div class="tab-content">',
            '<p class="pLeft">' + description + '</p>',
        '</div>',
    '</div>',
 '</div>'
  ];
 return html.join("\n");

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
  // Create the map.
  var map = new google.maps.Map(document.getElementsByClassName('map')[0], {
    zoom: 7,
    center: { lat: 0, lng: 0 },
  });

  var bounds = new google.maps.LatLngBounds();
  map.data.addListener('addfeature', function (e) {
    processPoints(e.feature.getGeometry(), bounds.extend, bounds);

    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
       var extendPoint1 = new google.maps.LatLng(bounds.getNorthEast().lat() + 0.01, bounds.getNorthEast().lng() + 0.01);
       var extendPoint2 = new google.maps.LatLng(bounds.getNorthEast().lat() - 0.01, bounds.getNorthEast().lng() - 0.01);
       bounds.extend(extendPoint1);
       bounds.extend(extendPoint2);
    }

    map.fitBounds(bounds);
  });
  console.log(query);

  api_url = '/api/v1/post/' + query;
  // Load the stores GeoJSON onto the map.
  map.data.loadGeoJson(api_url);

  var apiKey = 'AIzaSyAbcMGMULgp5l0Trav2G3OseIrNGIxHDZk';
  var infoWindow = new google.maps.InfoWindow();
  infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -30) });

  // Show the information for a store when its marker is clicked.
  map.data.addListener('click', function (event) {
  var position = event.feature.getGeometry().get();
  var content = generateBox(event.feature);

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