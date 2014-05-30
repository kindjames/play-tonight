var SpotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.EchoNest = parent.EchoNest || {};

    var echoNestApiKey = "TADM7C6U9DKHCUBJD";
    var tasteProfileId = "";
    var echoNestProfileUploadCallbackDelay = 1000;

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
                artist.artist_id = "songkick:artist:" + artist.artist_id;
                artistActions.push({
                    action: "update",
                    item: artist
                });
            });

            console.log("Adding " + artistActions.length + " artists to Taste Profile (id: " + tasteProfileId + ").");

            $.post("http://developer.echonest.com/api/v4/tasteprofile/update", {
                api_key: echoNestApiKey,
                format: "json",
                id: tasteProfileId,
                data: JSON.stringify(artistActions),
            }, function () {

                // Artificial delay of 1 sec to give EchoNest a chance to get their ducks in a row.
                setTimeout(function () {

                    typeof successCallback === 'function' && successCallback(tasteProfileId);
                    $(document).trigger('taste-profile-completed', tasteProfileId);
                    console.log("Artists added to EchoNest Taste Profile (id: " + tasteProfileId + ").");

                }, echoNestProfileUploadCallbackDelay);
            });
        });
    };

    self.getTasteProfile = function (tasteProfileId, successCallback) {
        console.log("Contacting EchoNest API for Taste Profile (id: " + tasteProfileId + ")...");

        var artistItems = [];

        function processGetTasteProfileResponse(data) {

            var totalResults = data.response.catalog.total;
            var currentIndex = data.response.catalog.start;
            var artistCount = data.response.catalog.items.length;

            console.log("Received response containing " + data.response.catalog.items.length + " artists.");

            artistItems = artistItems.concat(data.response.catalog.items);

            if (artistCount < this.resultsPerPage) {
                // Loop finished.
                typeof successCallback === 'function' && successCallback({
                    artists: artistItems
                });
            } else {
                // Fetch the next page.
                getTasteProfileDataPage((this.index + artistCount), this.apiKey, this.tasteProfileId, this.resultsPerPage);
            }
        };

        var getTasteProfileDataPage = function (index, apiKey, tasteProfileId, resultsPerPage) {

            console.log(" -> index " + index + "...");

            $.ajax({
                url: "http://developer.echonest.com/api/v4/tasteprofile/read",
                data: {
                    api_key: apiKey,
                    id: tasteProfileId,
                    bucket: ["genre", "id:spotify-WW"],
                    results: resultsPerPage,
                    start: index
                },
                apiKey: apiKey,
                index: index,
                resultsPerPage: resultsPerPage,
                tasteProfileId: tasteProfileId,
                traditional: true,

            }).done(processGetTasteProfileResponse);
        };

        getTasteProfileDataPage(0, echoNestApiKey, tasteProfileId, 100);
    }

    return parent;
}(SpotifyLive || {}, jQuery));