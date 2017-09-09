// Note: This example requires that you consent to location sharing when
// prompted by your browser. If you see the error "The Geolocation service
// failed.", it means you probably did not give permission for the browser to
// locate you.
var map, infoWindow;
function addMarkerAtLocation() {
	// Try HTML5 geolocation.
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			var pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			};

			// infoWindow.setPosition(pos);
			// infoWindow.setContent('Your Location');
			new google.maps.Marker({
				position: pos,
				map: map
			});
		}, function() {
			handleLocationError(true, infoWindow, map.getCenter());
		});
	} else {
		// Browser doesn't support Geolocation
		handleLocationError(false, infoWindow, map.getCenter());
	}
}


function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 33.9193213,
            lng: -84.31686020000001
        },
        zoom: 11,
        disableDefaultUI: true
    });

    var div = $("#search-menu").clone();
    var searchBox = new google.maps.places.SearchBox(div.find("#search-location")[0]);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(div[0]);
    div.show();
    
	searchBox.addListener('places_changed', function() {
		var places = searchBox.getPlaces();
		console.log("Places changed");
		if (places.length == 0) {
			return;
		}
		places.forEach(function(place) {
        	if (!place.geometry) {
				console.log("Returned place contains no geometry");
				return;
			}

			// Create a marker for each place.
			new google.maps.Marker({
				map: map,
				title: place.name,
				position: place.geometry.location
			});
		});
	});
	
	div.find("#cur-loc-button").on("click", function() {
		addMarkerAtLocation();
		return false;
	});
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {

    // infoWindow.setPosition(pos);
    // infoWindow.setContent(browserHasGeolocation ?
    //                       'Error: The Geolocation service failed.' :
    //                       'Error: Your browser doesn\'t support geolocation.');
    // infoWindow.open(map);
}
