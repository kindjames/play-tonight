var SpotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.EchoNest = parent.EchoNest || {};

    var echoNestApiKey = "TADM7C6U9DKHCUBJD";
    var tasteProfileId = "";

    function isEmpty(str) {
        return (!str || 0 === str.length);
    }

    var getTasteProfile = function (successCallback) {

        if (isEmpty(tasteProfileId)) {
            $.post("http://developer.echonest.com/api/v4/tasteprofile/create", {
                api_key: echoNestApiKey,
                format: "json",
                type: "artist",
                name: new Date().getTime(),
            }, function (data) {
                typeof successCallback === 'function' && successCallback(data.response.id);
            });
        } else {
            typeof successCallback === 'function' && successCallback(tasteProfileId);
        }
    };

    self.uploadArtistsToTasteProfile = function (artists, successCallback) {
        getTasteProfile(function (tasteProfileId) {
            var artistActions = [];

            $.each(artists, function (index, artist) {
                artistActions.push({
                    action: "update",
                    item: artist
                });
            });

            console.log("Adding " + artistActions.length + " artists to Taste Profile (id: " + tasteProfileId + ").");
            console.log(JSON.stringify(artistActions));

            $.post("http://developer.echonest.com/api/v4/tasteprofile/update", {
                api_key: echoNestApiKey,
                format: "json",
                id: tasteProfileId,
                data: JSON.stringify(artistActions),
            }, function () {
                typeof successCallback === 'function' && successCallback(tasteProfileId);
                $(document).trigger('taste-profile-completed', tasteProfileId);
                console.log("Artists added to EchoNest Taste Profile (id: " + tasteProfileId + ").");
            });
        });
    };

    return parent;
}(SpotifyLive || {}, jQuery));