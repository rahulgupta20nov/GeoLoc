var app = angular.module("app", []);
var oldCenter = undefined;
var currentLocation = false;
//var global_server_url = "http://localhost/jacktrade/api/";
var global_server_url = "http://3ms.dev1.jacktrade.net/jacktrade/api/";
app.controller("appCtrl", function ($scope, $interval, $http) {
    $scope.cities = [];
    $scope.enableHighAccuracy = false;
    $scope.address = {};
    $scope.position = {};
    // current location
    $scope.accuracy = 0;
    $scope.loc = [{id: 'abcd', lat: 23, lon: 79}];
    $scope.search = "";
    $scope.tabs = ['Current Location', 'Watch Location', 'Navigation'];
    $scope.tab = $scope.tabs[0];

    $scope.changeTab = function (tab) {
        $scope.tab = tab;
        if(stopTime) $interval.cancel(stopTime);
        stopTime = undefined;
        if(tab != $scope.tabs[2]){
            if(id) navigator.geolocation.clearWatch(id);
            $scope.gotoCurrentLocation();
        }else{
            $scope.getAllLocation();
        }
    }


    $scope.getAllLocation = function () {
        var url = global_server_url + 'geoLocApi.php/fetchAllLocations';
        $scope.cities = [];
        $http({
            url: url,
            method: 'POST'
        }).success(function (data) {
            angular.forEach(data.result, function (value, key) {
                $scope.cities.push({id: key, lat: value.latitude, lon: value.longitute});
            });
            $scope.gotoLocation($scope.cities);
        }).error(function (error) {
            console.log(error);
        });
        stopTime = $interval(function () {
            $scope.cities = [];
            $http({
                url: url,
                method: 'POST'
            }).success(function (data) {
                angular.forEach(data.result, function (value, key) {
                    $scope.cities.push({id: key, lat: value.latitude, lon: value.longitute});
                });
                $scope.gotoLocation($scope.cities);
            }).error(function (error) {
                console.log(error);
            });
        }, 3000);

    }

    var geocoder = new google.maps.Geocoder();
    var id;
    var stopTime;
    $scope.gotoCurrentLocation = function () {
        if ("geolocation" in navigator) {
            var option = {
                enableHighAccuracy: $scope.enableHighAccuracy,
                maximumAge: 2000
            };
            var error = function (error){
                navigator.geolocation.clearWatch(id);
                switch(error.code){
                    case 1:
                        alert('permission denied');
                        break;
                    case 2:
                        alert('position unavailable');
                        break;
                    case 3:
                        alert('timeout');
                        break;
                    default:
                        alert('unknown error');
                        break;
                }
                calling();
            }
            var success = function(position){
                //console.log(position);
                var c = position.coords;

                var latlng = new google.maps.LatLng(c.latitude, c.longitude);
                if($scope.tab == $scope.tabs[0]){
                    geocoder.geocode({'latLng': latlng}, function(results){
                        if(results){
                            $scope.address = results;
                            $scope.specificAdd = results[0]['address_components'];
                            $scope.$digest();
                        }
                    });
                }
                $scope.accuracy = c.accuracy;
                if($scope.loc.lat != c.latitude || $scope.loc.lon != c.longitude){
                    //console.log("Success");

                    $scope.gotoLocation([{id: 'abcd', lat: c.latitude, lon: c.longitude}]);
                    $scope.position = position.coords;
                }
            }

            var watchPosition = function () {
                if(id) navigator.geolocation.clearWatch(id);
                id = navigator.geolocation.watchPosition(success, error, option)
            }

            var calling = function(){
                if($scope.tab == $scope.tabs[0]){
                    if(stopTime) $interval.cancel(stopTime);
                    navigator.geolocation.getCurrentPosition(success);
                }else{
                    watchPosition();
                    stopTime = $interval(watchPosition, 3000);
                }
            }
            calling();


            currentLocation = true;
            return true;
        }
        return false;
    };

    $scope.gotoLocation = function (data) {
        $scope.loc = data;
        if (!$scope.$$phase) $scope.$apply("loc");
    };
    $scope.gotoCurrentLocation();

    // geo-coding
    $scope.geoCode = function () {
        currentLocation = false;
        if ($scope.search && $scope.search.length > 0) {
            if (!this.geocoder) this.geocoder = new google.maps.Geocoder();
            this.geocoder.geocode({ 'address': $scope.search }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var loc = results[0].geometry.location;
                    $scope.search = results[0].formatted_address;
                    $scope.gotoLocation([{id: 'abcd', lat: loc.lat(), lon: loc.lng()}]);
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
            });

            scope.$watch("center", function () {
                if(oldCenter != scope.$parent.tab)
                    updateControl();
                if (map && scope.center[0]){
                    var total = scope.center[0];
                    if(scope.center.length > 1){
                        total = {lat: 0, lon: 0}
                        angular.forEach(scope.center, function (value, key) {
                            total['lat'] += parseFloat(value.lat);
                            total['lon'] += parseFloat(value.lon);
                        });
                        total['lat'] = parseFloat(total.lat / scope.center.length);
                        total['lon'] = parseFloat(total.lon / scope.center.length);
                    }
                    map.setCenter(getLocation(total));
                }
                updateMarkers(scope.center);
                oldCenter = scope.$parent.tab;
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
                    zoom: scope.$parent.tab != scope.$parent.tabs[2] ? currentLocation ? 16 : 10 : 4,
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
            }

            // update map markers to match scope marker collection
            function updateMarkers(markers) {
                markers = markers ? markers : scope.center;
                if(centerMarker != null) centerMarker.setMap(null);
                angular.forEach(markers, function (value, key) {
                    var icon = "";
                    if(scope.$parent.tab == scope.$parent.tabs[0]){
                        icon = currentLocation ? 'images/location_map_pin_light_blue3_small.png' : '';
                    }else if(scope.$parent.tab == scope.$parent.tabs[1]){
                        icon = 'images/50px-Wikimap-blue-dot.png';
                    }
                    centerMarker = new google.maps.Marker({
                        position: new google.maps.LatLng(value.lat, value.lon),
                        map: map,
                        animation: scope.$parent.tab == scope.$parent.tabs[0] ? google.maps.Animation.DROP : '',

                        strokeColor: '#FF0000',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        icon: icon,
                        shadow: null,
                        zIndex: 999,
                        clickable: true
                    });
                })

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
