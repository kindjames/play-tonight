var SpotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.Location = parent.Location || {};
    var area = null;
    var coordinates = null;

    function Coordinates(longitude, latitude, accuracy) {
        this.longitude = longitude;
        this.latitude = latitude;
        this.accuracy = accuracy;
    }

    var getAreaInfo = function (addressComponents, componentName, getShortName) {
        // Loop through 'address_components' and return item with 'type' equal to componentName.
        var addressComponent = addressComponents.filter(function (item, index) {
            return ($.inArray(componentName, item.types) !== -1);
        });

        return getShortName ? addressComponent[0].short_name : addressComponent[0].long_name;
    };

    function Area(city, country) {
        this.city = city;
        this.country = country;
    }

    self.getCurrentCoordinates = function (successCallback, errorCallback) {
        if (!!coordinates) {
            typeof successCallback === 'function' && successCallback(coords);
        } else {
            console.log("Attempting to obtain coordinates...");
            var opts = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            var success = function (position) {
                var coords = new Coordinates(
                    position.coords.longitude,
                    position.coords.latitude,
                    position.coords.accuracy);

                console.log(coords);

                typeof successCallback === 'function' && successCallback(coords);
                $(document).trigger('coordinates-found', coords);
            };
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(success, errorCallback, opts);
            } else {
                typeof successCallback === 'function' && errorCallback();
            }
        }
    };

    self.getCurrentCityAndCountryFromCoordinates = function (coordinates, successCallback) {

        if (!!area) {
            typeof successCallback === 'function' && successCallback(area);
        } else {
            console.log("Calling Google Geo Code API... (Lat:" + coordinates.latitude + ", Long:" + coordinates.longitude + ")");
            $.getJSON("http://maps.googleapis.com/maps/api/geocode/json", {
                    latlng: coordinates.latitude + "," + coordinates.longitude,
                    sensor: false
                },
                function (data) {
                    area = new Area(
                        getAreaInfo(data.results[0].address_components, "postal_town", true),
                        getAreaInfo(data.results[0].address_components, "country", false)
                    );

                    console.log("Found area to be " + area.city + " in " + area.country);
                    $(document).trigger('area-found', area);
                    typeof successCallback === 'function' && successCallback(area);
                });
        }
    };

    self.getCurrentCityAndCountry = function (successCallback) {
        if (!!area) {
            typeof successCallback === 'function' && successCallback(area);
        } else {
            self.getCurrentCoordinates(function (coordinates) {
                self.getCurrentCityAndCountryFromCoordinates(coordinates, successCallback)
            });
        }
    };
    return parent;
}(SpotifyLive || {}, jQuery));