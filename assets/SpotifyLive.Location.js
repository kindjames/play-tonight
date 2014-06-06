var spotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.location = parent.location || {};
    var area = null;
    var coordinates = null;

    function Coordinates(longitude, latitude, accuracy) {
        this.longitude = longitude;
        this.latitude = latitude;
        this.accuracy = accuracy;
    }

    var getAreaInfo = function (addressComponents, componentNames, getShortName) {
        // Loop through 'address_components' and return item with 'type' equal to componentName.
        var addressComponent = _.find(addressComponents, function (addressComponent) {
            return _.some(addressComponent.types, function (typeName) {
                if (_.isArray(componentNames)) {
                    return _.some(componentNames, function (componentName) {
                        return (typeName == componentName);
                    });
                } else {
                    return typeName == componentNames;
                }
            });
        });

        if (_.isUndefined(addressComponent)) {
            addressComponent = {
                short_name: "unknown",
                long_name: "unknown"
            }
        }

        return getShortName ? addressComponent.short_name : addressComponent.long_name;
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
                        getAreaInfo(data.results[0].address_components, ["postal_town", "administrative_area_level_1"], false),
                        getAreaInfo(data.results[0].address_components, "country", true)
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
}(spotifyLive || {}, jQuery));