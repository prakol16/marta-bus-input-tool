var config = {
	apiKey: "AIzaSyAuwQTJv_PwhhhWa8-jZOFUuLYmLHkQx-U",
	authDomain: "marta-input-f296d.firebaseapp.com",
	databaseURL: "https://marta-input-f296d.firebaseio.com",
	projectId: "marta-input-f296d",
	storageBucket: "marta-input-f296d.appspot.com",
	messagingSenderId: "629280625623"
};
firebase.initializeApp(config);

function getDateString() {
    var temp = new Date();
    var dateStr = padStr(temp.getFullYear()) +
                  padStr(1 + temp.getMonth()) +
                  padStr(temp.getDate()) +
                  padStr(temp.getHours()) +
                  padStr(temp.getMinutes()) +
                  padStr(temp.getSeconds());
    return dateStr;
}

function padStr(i) {
    return (i < 10) ? "0" + i : "" + i;
}

var storageRef = firebase.storage().ref();
var uniqueFileNameEnd =  getDateString() + "-id-" + Math.random().toString().slice(2);
var addStopChildFile = storageRef.child("submission-stops-" + uniqueFileNameEnd + ".txt");
var map, infoWindow, lines = [], successfulLines = [], gmarkers = [], locationMarkers = [], modifiedLines = {}, otherUserLines = [], originalRoutes;

var MAX_RESOLUTION = 150;

var getColor = function(x) { return "rgb(" + (x % 256) + "," + (x*31 % 256) + "," + (x*123 % 256)+")"; };

function uploadCurrentDesiredStops() {
	var str = [];
	for (var i = 0; i < locationMarkers.length; ++i) {
		var marker = locationMarkers[i];
		str.push([marker.get("stopName"), marker.position.lat(), marker.position.lng()].join());
	}
	addStopChildFile.putString(str.join("\n")).then(function(snapshot) {
		console.log("Successfully uploaded!");
	});
	$("#search-menu #add-stop").attr("disabled", true).addClass("ui-state-disabled").text("Submit suggested stop");
}

function clearOtherUserLines() {
	while (otherUserLines.length)
		otherUserLines.pop().setMap(null);
}

function drawOtherUserLine(line) {
	clearOtherUserLines();
	var finalPath = [], orig = originalRoutes[line.id];
	for (var i = 0; i < orig.length; ++i) {
		if (line.pts[i]) {
			var spl = line.pts[i];
			finalPath.push({lat: spl[0], lng: spl[1]});
		} else {
			finalPath.push(orig[i]);
		}
	}
	var ln = new google.maps.Polyline({
		path: finalPath,
		geodesic: true,
		strokeColor: getColor(line.id),
		strokeOpacity: 0.5,
		strokeWeight: 2
	});
	console.log(window.FINALPATH = finalPath);
	ln.setMap(map);
	otherUserLines.push(ln);
}

function uploadRoutes() {
	for (var id in modifiedLines) {
		if (modifiedLines[id].modified) {
			var str = [];
			var path = lines.filter(x => x.id === id)[0].getPath().getArray();
			var modifiedLine = modifiedLines[id].modifications;
			for (var num in modifiedLine) {
				str.push([num, path[num].lat(), path[num].lng()].join());
			}
			var directory = "route-" + id + "/"
			var p = "submission-" + uniqueFileNameEnd + ".txt";
			var routeFile = storageRef.child(directory + p);
			routeFile.putString(str.join("\n")).then(function(snapshot) { console.log("Successfully uploaded id " + id); });
			firebase.database().ref(directory).push(p);
			modifiedLines[id].modified = false; 
		}
	}
	$("#search-menu #suggest-new-routes").attr("disabled", true).addClass("ui-state-disabled");
}

function readRoute(callback) {
	return $.ajax("SHAPES.txt").done(function(result) {
		var routes = {};
		
		var lines = result.split("\n").slice(1);
		for (var i = 0; i < lines.length; i += 1) {
			var data = lines[i].split(",");
			var routeNum = data[0],
				lat = parseFloat(data[1]),
				lng = parseFloat(data[2]);
			if (!routes[routeNum]) {
				routes[routeNum] = [];
			}
			routes[routeNum].push({lat: lat, lng: lng});
		}
		callback(routes);
	});
}

var rad = function(x) {
  return x * Math.PI / 180;
};

var gmarkers = [];

function addLatLng(line, path, event, i, res) {
	var marker = new google.maps.Marker({
		position: event.latLng,
		title: '#' + (i+1),
		map: map,
		icon: {
			url: "https://maps.gstatic.com/intl/en_us/mapfiles/markers2/measle.png",
			size: new google.maps.Size(7,7),
			anchor: new google.maps.Point(4,4)
		},
		draggable : true
	});
	gmarkers.push(marker);
	marker.bindTo('position', line.binder, [i, res, line.get("id")].join());
}

function clearEditable() {
	while (gmarkers.length)
		gmarkers.pop().setMap(null);
}

function makeEditable(line) {
	clearEditable();
	var path = line.getPath();
	var locations = path.getArray();
	line.binder = new MVCArrayBinder(path);
	var resolution = Math.max(1, Math.round(Math.min(MAX_RESOLUTION, locations.length / 20)));
	for(var i = 0; i < locations.length; i+=resolution) {
		var evt = {};
		evt.latLng = locations[i];
		addLatLng(line, path, evt, i, resolution);
  	}
}

function MVCArrayBinder(mvcArray){
	this.array_ = mvcArray;
}

$(window).on("load", function() {
	MVCArrayBinder.prototype = new google.maps.MVCObject();
	MVCArrayBinder.prototype.get = function(key) {
		if (!isNaN(parseInt(key))){
			return this.array_.getAt(parseInt(key));
		} else {
			this.array_.get(key);
		}
	}
	MVCArrayBinder.prototype.set = function(key, val) {
		if (/^\d+,\d+,\d+$/.test(key)) {
			var splitKey = key.split(",");
			var resolution = parseInt(splitKey[1]);
			var ikey = parseInt(splitKey[0]);
			var id = splitKey[2];
			$("#search-menu #suggest-new-routes").attr("disabled", false).removeClass("ui-state-disabled");
			if (!modifiedLines[id]) modifiedLines[id] = {modified: true, modifications: {}};
			modifiedLines[id].modified = true;		
			var start = Math.max(0, ikey - resolution), startPos = this.array_.getAt(start);
			var end = Math.min(this.array_.length, ikey + resolution), endPos = this.array_.getAt(end - 1);
			for (var i = start; i < end; ++i) {
				var newPos;	
				modifiedLines[id].modifications[i] = true;
				if (i < ikey) {
					var lat = (val.lat() - startPos.lat()) * (i - start) / resolution + startPos.lat(),
						lng = (val.lng() - startPos.lng()) * (i - start) / resolution + startPos.lng();
					newPos = new google.maps.LatLng(lat, lng);
				} else if (i > ikey) {
					var diff = ikey+resolution > this.array_.length ? end - ikey : resolution;
					var lat = (endPos.lat() - val.lat()) * (i - ikey) / diff + val.lat(),
						lng = (endPos.lng() - val.lng()) * (i - ikey) / diff + val.lng();
					newPos = new google.maps.LatLng(lat, lng);
				} else {
					newPos = val;
				}
				this.array_.setAt(i, newPos);
			}
		} else {
			this.array_.set(key, val);
		}
	}
});

var getDistance = function(p1, p2) {
  var R = 6378137; // Earth’s mean radius in meter
  var dLat = rad(p2.lat() - p1.lat());
  var dLong = rad(p2.lng() - p1.lng());
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d; // returns the distance in meter
};

function findClosestLine(pnt) {
	var MIN_DIST = 500; //meters
	console.log(pnt.lat(), pnt.lng());
	successfulLines = [];
	var bestBestDist = Infinity;
	var bestLine = null;
	for (var i = 0; i < lines.length; ++i) {
		var line = lines[i];
		var path = line.getPath().getArray();
		var bestDist = Infinity;
		lines[i].setVisible(true);
		for (var j = 0; j < path.length; ++j) {
			var dist = getDistance(path[j], pnt);
			if (dist < bestDist) {
				bestDist = dist;
			}
		}
		if (bestDist < MIN_DIST) {
			successfulLines.push(lines[i]);
		} else if (bestDist < bestBestDist && successfulLines.length === 0) {
			bestBestDist = bestDist;
			if (bestLine !== null) bestLine.setVisible(false);
			bestLine = lines[i];
		} else {
			lines[i].setVisible(false);
		}
	}
}

function addMarkerAtCurrentLocation() {
	// Try HTML5 geolocation.
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			var pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			};
			// infoWindow.setPosition(pos);
			// infoWindow.setContent('Your Location');
			addMarkerAtLocation(pos, "your location");
		}, function() {
			handleLocationError(true, infoWindow, map.getCenter());
		});
	} else {
		// Browser doesn't support Geolocation
		handleLocationError(false, infoWindow, map.getCenter());
	}
}

function addMarkerAtLocation(pos, name) {
	console.log("Position", pos);
	var latLng = pos instanceof google.maps.LatLng ? pos : new google.maps.LatLng(pos);
	for (var i = 0; i < locationMarkers.length; ++i) {
		if (getDistance(locationMarkers[i].position, latLng) < 5) {
			// already placed marker
			google.maps.event.trigger(locationMarkers[i], "click");
			return;
		}
	}
	var marker = new google.maps.Marker({
		position: pos,
		map: map
	});
	marker.set("stopName", name);
	locationMarkers.push(marker);
	marker.addListener("click", function() {
		map.setCenter(latLng);
		findClosestLine(this.position);
		var len = locationMarkers.length;
		// show submit button
		$("#search-menu #add-stop").attr("disabled", false).removeClass("ui-state-disabled")
			.text(len === 1 ? "Submit suggested stop" : "Submit " + len + " suggested stops");
	});
	google.maps.event.trigger(marker, "click");
}


function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 33.9193213,
            lng: -84.3168602
        },
        zoom: 10,
        disableDefaultUI: true
    });
	readRoute(function(routes) {
		var ind = 0;
		for (var id in routes) {
			lines.push(new google.maps.Polyline({
				path: routes[id],
				geodesic: true,
				strokeColor: getColor(id),
				strokeOpacity: 1.0,
				strokeWeight: 3
        	}));
			lines[ind].set("id", id);
        	lines[ind].setMap(map);
			lines[ind].addListener("click", function() {
				makeEditable(this);
				var routeId = this.get("id");
				var route = "route-" + this.get("id");
				var otherRoutes = firebase.database().ref(route).orderByKey();
				otherRoutes.on("value", function(snap) {
					snap.forEach(function(otherRoute) {
						var fileName = otherRoute.val();
						console.log("Should load", fileName);
						storageRef.child(route + "/" + fileName).getDownloadURL().then(function(url) {
							console.log("Downloading resource at", url);
							$.ajax(url).done(function(result) {
								var lines = result.split("\n");
								var res = {id: routeId, pts: {}};
								for (var i = 0; i < lines.length; ++i) {
									var line = lines[i].split(",");
									res.pts[line[0]] = [parseFloat(line[1]), parseFloat(line[2])];
								}
								drawOtherUserLine(res);
							});
						});
					});
				});
			});
        	ind++;
		}
	});
	readRoute(function(routes) {
		originalRoutes = routes;
	});

    var div = $("#search-menu-clone").clone();
	div.attr("id", "search-menu");
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(div[0]);
	div.show();
    var searchBox = new google.maps.places.SearchBox(div.find("#search-location")[0]);
	searchBox.setBounds(map.getBounds());

	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});
    
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
			addMarkerAtLocation(place.geometry.location, place.name);
		});
	});
	
	div.find("#cur-loc-button").on("click", function() {
		addMarkerAtCurrentLocation();
		return false;
	});

	map.addListener("click", function() {
		clearEditable();
		clearOtherUserLines();
	});

	div.find("#dialog").dialog({
		position: {
			my: "right top",
			at: "right top"
		}
	});

	div.find("#add-stop").on("click", function(e) {
		console.log("Submitting");
		uploadCurrentDesiredStops();
		return false;
	});

	div.find("#suggest-new-routes").on("click", function() {
		console.log("Submitting");
		uploadRoutes();
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
