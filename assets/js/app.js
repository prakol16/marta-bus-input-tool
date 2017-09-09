// Note: This example requires that you consent to location sharing when
// prompted by your browser. If you see the error "The Geolocation service
// failed.", it means you probably did not give permission for the browser to
// locate you.
var map, infoWindow;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 33.9193213,
            lng: -84.31686020000001
        },
        zoom: 11,
        disableDefaultUI: true
    });
    
	var ctaLayer = new google.maps.KmlLayer({
		url: 'http://googlemaps.github.io/js-v2-samples/ggeoxml/cta.kml',
		map: map
	});
    // infoWindow = new google.maps.InfoWindow;

    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // infoWindow.setPosition(pos);
            // infoWindow.setContent('Your Location');
            var marker = new google.maps.Marker({
                position: pos,
                map: map
            })

            // infoWindow.open(map);
            map.setCenter(pos);
        }, function() {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }
    var div = $("#search-menu").clone();
    var searchBox = new google.maps.places.SearchBox(div.find("#search-location")[0]);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(div[0]);
    div.show();
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {

    // infoWindow.setPosition(pos);
    // infoWindow.setContent(browserHasGeolocation ?
    //                       'Error: The Geolocation service failed.' :
    //                       'Error: Your browser doesn\'t support geolocation.');
    // infoWindow.open(map);
}
