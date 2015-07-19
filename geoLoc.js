var app = angular.module("app", []);

var currentLocation = false;
app.controller("appCtrl", function ($scope) {
    $scope.address = {};
    $scope.position = {};
    // current location
    $scope.accuracy = 0;
    $scope.loc = { lat: 23, lon: 79};
    var geocoder = new google.maps.Geocoder();

    $scope.gotoCurrentLocation = function () {
        if ("geolocation" in navigator) {
            var id;
            if(id) navigator.geolocation.clearWatch(id);
            id = navigator.geolocation.watchPosition(function (position) {
                var c = position.coords;
                var latlng = new google.maps.LatLng(c.latitude, c.longitude);

            	geocoder.geocode({'latLng': latlng}, function(results){
            		$scope.address = results;
                    $scope.specificAdd = results[0]['address_components'];
                    $scope.$digest();
            		//console.log(results);
            		//console.log(status);
            	});

                $scope.accuracy = c.accuracy;
                $scope.gotoLocation(c.latitude, c.longitude);
                $scope.position = position.coords;
            });
            console.log(id);
            currentLocation = true;
            return true;
        }
        return false;
    };

    $scope.gotoLocation = function (lat, lon, acc) {
        if ($scope.lat != lat || $scope.lon != lon) {
            $scope.loc = { lat: lat, lon: lon, accuracy: acc};
            if (!$scope.$$phase) $scope.$apply("loc");
        }
    };
    $scope.gotoCurrentLocation();
    // geo-coding
    $scope.search = "";
    $scope.geoCode = function () {
        currentLocation = false;
        if ($scope.search && $scope.search.length > 0) {
            if (!this.geocoder) this.geocoder = new google.maps.Geocoder();
            this.geocoder.geocode({ 'address': $scope.search }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var loc = results[0].geometry.location;
                    //console.log(results);
                    $scope.search = results[0].formatted_address;
                    $scope.gotoLocation(loc.lat(), loc.lng());
                    //$scope.cities.push({lat : loc.lat(),   lon : loc.lng()});
                    //console.log($scope.cities);
                } else {
                    alert("Sorry, this search produced no results.");
                }
            });
        }
    };

});

// formats a number as a latitude (e.g. 40.46... => "40°27'44"N")
app.filter('lat', function () {
    return function (input, decimals) {
        if (!decimals) decimals = 0;
        input = input * 1;
        var ns = input > 0 ? "N" : "S";
        input = Math.abs(input);
        var deg = Math.floor(input);
        var min = Math.floor((input - deg) * 60);
        var sec = ((input - deg - min / 60) * 3600).toFixed(decimals);
        return deg + "°" + min + "'" + sec + '"' + ns;
    }
});

// formats a number as a longitude (e.g. -80.02... => "80°1'24"W")
app.filter('lon', function () {
    return function (input, decimals) {
        if (!decimals) decimals = 0;
        input = input * 1;
        var ew = input > 0 ? "E" : "W";
        input = Math.abs(input);
        var deg = Math.floor(input);
        var min = Math.floor((input - deg) * 60);
        var sec = ((input - deg - min / 60) * 3600).toFixed(decimals);
        return deg + "°" + min + "'" + sec + '"' + ew;
    }
});

// - Documentation: https://developers.google.com/maps/documentation/
app.directive("appMap", function () {
    return {
        restrict: "E",
        replace: true,
        template: "<div></div>",
        scope: {
            center: "=",        // Center point on the map (e.g. <code>{ latitude: 10, longitude: 10 }</code>).
            markers: "=",       // Array of map markers (e.g. <code>[{ lat: 10, lon: 10, name: "hello" }]</code>).
            width: "@",         // Map width in pixels.
            height: "@",        // Map height in pixels.
            zoom: "@",          // Zoom level (one is totally zoomed out, 25 is very much zoomed in).
            mapTypeId: "@",     // Type of tile to show on the map (roadmap, satellite, hybrid, terrain).
            panControl: "@",    // Whether to show a pan control on the map.
            zoomControl: "@",   // Whether to show a zoom control on the map.
            scaleControl: "@"   // Whether to show scale control on the map.
        },
        link: function (scope, element, attrs) {
            var toResize, toCenter;
            var map;
            var currentMarkers;
            var centerMarker;

            // listen to changes in scope variables and update the control
            var arr = ["width", "height", "markers", "mapTypeId", "panControl", "zoomControl", "scaleControl"];
            for (var i = 0, cnt = arr.length; i < arr.length; i++) {
                scope.$watch(arr[i], function () {
                    cnt--;
                    if (cnt <= 0) {
                        updateControl();
                    }
                });
            }

            // update zoom and center without re-creating the map
            scope.$watch("zoom", function () {
                if (map && scope.zoom)
                    map.setZoom(scope.zoom * 1);
                //console.log("Success");
                updateMarkers();
                /*if (centerMarker != null) centerMarker.setMap(null);
                centerMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(scope.center.lat, scope.center.lon),
                    map: map
                });*/
            });
            scope.$watch("center", function () {
                if (map && scope.center)
                    map.setCenter(getLocation(scope.center));
                updateMarkers();
            });

            // update the control
            function updateControl() {

                // update size
                if (scope.width) element.width(scope.width);
                if (scope.height) element.height(scope.height);

                // get map options
                var options =
                {
                    center: new google.maps.LatLng(23, 79),
                    zoom: currentLocation ? 16 : 10,
                    mapTypeId: "roadmap"
                };
                if (scope.center) options.center = getLocation(scope.center);
                if (scope.zoom) options.zoom = scope.zoom * 1;
                if (scope.mapTypeId) options.mapTypeId = scope.mapTypeId;
                if (scope.panControl) options.panControl = scope.panControl;
                if (scope.zoomControl) options.zoomControl = scope.zoomControl;
                if (scope.scaleControl) options.scaleControl = scope.scaleControl;

                // create the map
                map = new google.maps.Map(element[0], options);
                // update markers
                updateMarkers();

                // listen to changes in the center property and update the scope
                /*google.maps.event.addListener(map, 'center_changed', function () {

                    // do not update while the user pans or zooms
                    if (toCenter) clearTimeout(toCenter);
                    toCenter = setTimeout(function () {
                        if (scope.center) {

                            // check if the center has really changed
                            if (map.center.lat() != scope.center.lat ||
                                map.center.lng() != scope.center.lon) {

                                // update the scope and apply the change
                                scope.center = { lat: map.center.lat(), lon: map.center.lng() };
                                if (!scope.$$phase) scope.$apply("center");
                            }
                        }
                    }, 500);
                });*/
            }

            // update map markers to match scope marker collection
            function updateMarkers() {

                if(centerMarker != null) centerMarker.setMap(null);

                centerMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(scope.center.lat, scope.center.lon),
                    map: map,
                    animation: google.maps.Animation.DROP,

                    strokeColor: '#FF0000',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,

                    icon: currentLocation ?
                        //'http://maps.google.com/mapfiles/kml/pal4/icon25.png'
                        'pin-lost.png'
                        : '',
                    shadow: null,
                    zIndex: 999,
                    clickable: true
                });
                /*if(currentMarkers)
                    currentMarkers['icon'] = new google.maps.MarkerImage('//maps.gstatic.com/mapfiles/mobile/mobileimgs2.png',
                        new google.maps.Size(22,22),
                        new google.maps.Point(0,18),
                        new google.maps.Point(11,11));
                console.log(centerMarker);*/
                /*if (map && scope.markers) {

                    // clear old markers
                    if (currentMarkers != null) {
                        for (var i = 0; i < currentMarkers.length; i++) {
                            currentMarkers[i] = m.setMap(null);
                        }
                    }

                    // create new markers
                    currentMarkers = [];
                    console.log(scope.markers);
                    var markers = scope.markers;
                    console.log(marker);
                    if (angular.isString(markers)) markers = scope.$eval(scope.markers);
                    for (var i = 0; i < markers.length; i++) {
                        var m = markers[i];
                        var loc = new google.maps.LatLng(m.lat, m.lon);
                        var mm = new google.maps.Marker({ position: loc, map: map, title: m.name });
                        currentMarkers.push(mm);
                    }
                }*/
            }

            // convert current location to Google maps location
            function getLocation(loc) {
                if (loc == null) return new google.maps.LatLng(23, 79);
                if (angular.isString(loc)) loc = scope.$eval(loc);
                return new google.maps.LatLng(loc.lat, loc.lon);
            }
        }
    };
});
