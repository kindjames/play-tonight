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

    self.getAllEventsForToday = function (coordinates, successCallback) {
        console.log("Contacting SongKick API for artists playing locally tonight...");

        var eventItems = [];

        // Processes the data response from SongKick. Once complete, calls successCallback.
        function processSongKickResponse(data) {

            var totalResults = data.resultsPage.totalEntries;
            var currentPage = data.resultsPage.page;
            var perPage = data.resultsPage.perPage;

            if (totalResults == 0) {
                console.log("No events happening in your area tonight :(");
            } else {
                console.log("Received response of page " + currentPage + " containing " + data.resultsPage.results.event.length + " events.");

                eventItems = eventItems.concat(data.resultsPage.results.event);

                if (currentPage * perPage < totalResults) {
                    // Fetch the next page.
                    callSongKick(this.nextPage, this.coordinates, this.date, this.apiKey)
                } else {
                    // Loop finished.
                    var callbackData = {
                        events: eventItems
                    };
                    typeof successCallback === 'function' && successCallback(callbackData);
                    $(document).trigger('all-local-events-found', callbackData);
                }
            }
        };

        // Re-usable call to SongKick to get data page.
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
                nextPage: (page + 1),
                coordinates: coordinates,
                date: date,
                apiKey: apiKey
            }).done(processSongKickResponse);
        }

        // Initial call to start the loop through data pages.
        callSongKick(1, coordinates, dateToYMD(new Date()), songKickApiKey);
    };

    return parent;
}(SpotifyLive || {}, jQuery));