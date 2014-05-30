var SpotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.Util = parent.Util || {};

    function Artist(artistId, artistName, eventId) {

        function ArtistMetaData(artist_name, eventIds) {
            this.artist_name = artist_name;
            this.eventIds = eventIds;
        }

        this.addEventId = function (eventId) {
            this.item_keyvalues.eventIds.push(eventId.toString());
        };

        this.artist_id = artistId;
        this.item_keyvalues = new ArtistMetaData(artistName, [eventId.toString()]);
    }

    self.convertSongKickEventsToTasteProfileArtists = function (songKickEvents) {
        console.log("Converting " + songKickEvents.length + " SongKick events to EchoNest Taste Profile artists...");

        var artists = [];

        $.each(songKickEvents, function (index, event) {
            $.each(event.performance, function (index, performance) {
                // Check if any of the artists are already in the list.
                var existingArtist = _.where(artists, {
                    artist_id: performance.artist.id
                });

                if (existingArtist.length == 0) {
                    // Push new artist to results array.
                    artists.push(new Artist(performance.artist.id,
                        performance.artist.displayName, event.id));
                } else {
                    // Artist's playing at more than one event that day, so add the additional event id.
                    console.log("Duplicate found - " + performance.artist.displayName);
                    existingArtist[0].addEventId(event.id);
                }
            });
        });

        return artists;
    };

    self.extractWorkableArtists = function (tasteProfile) {
        var workableArtists = [];

        var filteredProfile = _.filter(tasteProfile, function (artist) {
            return _.has(artist, 'foreign_ids') && _.has(artist, 'genres');
        });

        console.log("From " + tasteProfile.length + " to " + filteredProfile.length);

        return workableArtists;
    };

    return parent;
}(SpotifyLive || {}, jQuery));