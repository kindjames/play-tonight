var spotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.util = parent.util || {};

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

    self.dateToYMD = function (date) {
        var d = date.getDate();
        var m = date.getMonth() + 1;
        var y = date.getFullYear();
        return '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
    };

    self.convertSongKickEventsToTasteProfileArtists = function (songKickEvents) {
        console.log("Converting " + songKickEvents.length + " SongKick events to EchoNest Taste Profile artists...");

        var artists = [];

        _.each(songKickEvents, function (event) {
            _.each(event.performance, function (performance) {
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

    self.extractUsableArtists = function (tasteProfile) {
        var filteredProfile = _.filter(tasteProfile, function (artist) {
            return _.has(artist, 'foreign_ids') && _.has(artist, 'terms') && artist.terms.length > 0;
        });

        console.log("Extracted " + filteredProfile.length + " 'usuable' artists from " + tasteProfile.length + ".");

        return filteredProfile;
    };

    self.getTermDataFromArtistCollection = function (artists) {
        var termData = [];

        _.chain(artists)
            .map(function (artist) {
                // Pull out only terms the artists are frequently referred to as.
                var terms = _.chain(artist.terms)
                    .filter(function (term) {
                        return term.frequency > .4;
                    })
                    .pluck('name')
                    .value();
                return {
                    id: artist.foreign_ids[0].foreign_id,
                    name: artist.artist_name,
                    popularity: artist.hotttnesss,
                    terms: terms
                };
            })
        // Build an array of terms, each containing the artists that belong to it.
        .each(function (artist) {
            _.each(artist.terms, function (term) {
                if (!_.has(termData, term)) {
                    termData[term] = [];
                }
                termData[term].push({
                    id: artist.id,
                    popularity: artist.popularity,
                    name: artist.name
                });
            });
        });

        _.each(_.keys(termData), function (key) {
            termData[key] = _.chain(termData[key])
                .sortBy(function (artist) {
                    return artist.popularity;
                })
                .last(8)
                .value()
                .reverse();
        });

        return termData;
    };

    return parent;
}(spotifyLive || {}, jQuery));