var spotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.songKick = parent.songKick || {};

    self.getAllEvents = function (apiKey, date) {

        var _date = date,
            _formattedDate = spotifyLive.util.dateToYMD(date),
            _eventItems = [],
            _apiKey = apiKey;

        function getSongKickEventsPage(page) {
            spotifyLive.util.debug(" -> page " + page + "...");
            $.ajax({
                url: "http://api.songkick.com/api/3.0/events.json",
                dataType: "jsonp",
                data: {
                    apikey: _apiKey,
                    location: "clientip",
                    min_date: _formattedDate,
                    max_date: _formattedDate,
                    page: page,
                },
                context: this,
                currentPage: page,
                jsonp: "jsoncallback",
                success: successCallback,
            });
        };

        function successCallback(data) {
            var totalResults = data.resultsPage.totalEntries,
                currentPage = data.resultsPage.page,
                perPage = data.resultsPage.perPage;

            if (totalResults == 0) {
                $(document).trigger('no-local-events-found');
                spotifyLive.util.debug("No events found.");
            } else {
                spotifyLive.util.debug("Received response of page " + currentPage + " containing " + data.resultsPage.results.event.length + " events.");
                _eventItems = _eventItems.concat(data.resultsPage.results.event);
                if (currentPage * perPage < totalResults) {
                    getSongKickEventsPage(this.currentPage + 1);
                } else {
                    $(document).trigger('all-local-events-found', {
                        events: _eventItems
                    });
                }
            }
        };

        getSongKickEventsPage(1);
    };

    return parent;

}(spotifyLive || {}, jQuery));