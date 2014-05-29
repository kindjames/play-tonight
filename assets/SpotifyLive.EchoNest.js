var SpotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.EchoNest = parent.EchoNest || {};

    self.convertSongKickEventsToTasteProfileArtists = function (songKickEvents) {
        console.log("Converting " + songKickEvents.length + " SongKick events to EchoNest TasteProfile artists...");

        var artists = [];

        // iterate each event
        // pull out artists
        // iterate each artist
        // if artist doesn't exist, add meta data and push to the pile
        // else if add additional metadata to existing artist
        $.each(songKickEvents, function (index, event) {
            $.each(event.performance, function (index, performance) {
                // Check if any of the artists are already in the list.
                var existingArtist = _.where(artists, {
                    artist_id: performance.artist.id
                });

                if (existingArtist.length == 0) {
                    artists.push(new Artist(performance.artist.id,
                        performance.artist.displayName, event.id));
                } else {
                    console.log("Duplicate artist found - " + performance.artist.displayName);
                    existingArtist[0].addEventId(event.id);
                }
            });
        });

        console.log(JSON.stringify(artists));

        return artists;
    };

    return parent;
}(SpotifyLive || {}, jQuery));