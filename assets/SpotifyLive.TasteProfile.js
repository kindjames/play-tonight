var SpotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.SongKick = parent.SongKick || {};

    var dateToYMD = function (date) {
        var d = date.getDate();
        var m = date.getMonth() + 1;
        var y = date.getFullYear();
        return '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
    }

    var songKickApiKey = "qnqepvaYb1LXkz0T";

    self.getAllArtistsPlayingToday = function (coordinates, successCallback) {
        console.log("Contacting SongKick API for artists playing locally tonight...");

        var eventItems = [];

        function processSongKickResponse(data) {

            var totalResults = data.resultsPage.totalEntries;
            var currentPage = data.resultsPage.page;
            var perPage = data.resultsPage.perPage;

            console.log("Received response of page " + currentPage + " containing " + data.resultsPage.results.event.length + " events.");

            eventItems = eventItems.concat(data.resultsPage.results.event);

            if (currentPage * perPage < totalResults) {
                // Fetch the next pa
                callSongKick((this.page + 1), this.coordinates, this.date, this.apiKey)
            } else {
                // Loop finished.
                typeof successCallback === 'function' && successCallback(eventItems);
                $(document).trigger('all-local-artists-found', eventItems);
            }
        };

        var callSongKick = function (page, coordinates, date, apiKey) {

            console.log(" -> page " + page + "...");

            $.ajax({
                url: "http://api.songkick.com/api/3.0/events.json",
                data: {
                    apikey: apiKey,
                    location: "geo:" + coordinates.latitude + "," + coordinates.longitude,
                    min_date: date,
                    max_date: date,
                    page: page,
                },
                page: page,
                coordinates: coordinates,
                date: date,
                apiKey: apiKey
            }).done(processSongKickResponse);
        }

        callSongKick(1, coordinates, dateToYMD(new Date()), songKickApiKey);
    };

    return parent;
}(SpotifyLive || {}, jQuery));