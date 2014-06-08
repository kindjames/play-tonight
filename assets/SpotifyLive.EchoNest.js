var spotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.echoNest = parent.echoNest || {},
        echoNestApiKey = "TADM7C6U9DKHCUBJD",
        tasteProfileId = "",
        echoNestProfileUploadCallbackDelay = 500;

    function isEmpty(str) {
        return (!str || 0 === str.length);
    }

    var _createTasteProfileId = function (successCallback) {
        $.post("http://developer.echonest.com/api/v4/tasteprofile/create", {
            api_key: echoNestApiKey,
            format: "json",
            type: "artist",
            name: new Date().getTime(),
        }, function (data) {
            typeof successCallback === 'function' && successCallback(data.response.id);
        });
    };

    var _getSongIds = function (songs) {
        var songIds = [];

        _.each(songs, function (song) {
            if (song.tracks && song.tracks.length > 0) {
                songIds.push(song.tracks[0].foreign_id);
            }
        });

        return songIds;
    };

    self.getTasteProfileId = function (successCallback) {
        if (isEmpty(tasteProfileId)) {
            _createTasteProfileId(successCallback);
        } else {
            typeof successCallback === 'function' && successCallback(tasteProfileId);
        }
    };

    self.uploadArtistsToTasteProfile = function (artists, successCallback) {
        self.getTasteProfileId(function (tasteProfileId) {
            var artistActions = _.map(artists, function (artist) {
                artist.artist_id = "songkick:artist:" + artist.artist_id;
                return {
                    action: "update",
                    item: artist
                };
            });

            spotifyLive.util.debug("Adding " + artistActions.length + " artists to Taste Profile (id: " + tasteProfileId + ").");

            $.post("http://developer.echonest.com/api/v4/tasteprofile/update", {
                api_key: echoNestApiKey,
                format: "json",
                id: tasteProfileId,
                data: JSON.stringify(artistActions),
            }, function () {
                // Artificial delay to give EchoNest a chance to get their ducks in a row.
                setTimeout(function () {
                    typeof successCallback === 'function' && successCallback(tasteProfileId);
                    $(document).trigger('taste-profile-completed', tasteProfileId);
                    spotifyLive.util.debug("Artists added to EchoNest Taste Profile (id: " + tasteProfileId + ").");

                }, echoNestProfileUploadCallbackDelay);
            });
        });
    };

    self.getTasteProfile = function (tasteProfileId, successCallback) {
        spotifyLive.util.debug("Contacting EchoNest API for Taste Profile (id: " + tasteProfileId + ")...");

        var artistItems = [];

        function processGetTasteProfileResponse(data) {
            var artistCount = data.response.catalog.items.length;
            spotifyLive.util.debug("Received response containing " + data.response.catalog.items.length + " artists.");
            artistItems = artistItems.concat(data.response.catalog.items);

            if (artistCount < this.resultsPerPage) {
                // Loop finished.
                typeof successCallback === 'function' && successCallback(artistItems);
            } else {
                // Fetch the next page.
                getTasteProfileDataPage((this.index + artistCount), this.apiKey, this.tasteProfileId, this.resultsPerPage);
            }
        };

        var getTasteProfileDataPage = function (index, apiKey, tasteProfileId, resultsPerPage) {
            spotifyLive.util.debug(" -> index " + index + "...");
            $.ajax({
                url: "http://developer.echonest.com/api/v4/tasteprofile/read",
                data: {
                    api_key: apiKey,
                    id: tasteProfileId,
                    bucket: ["terms", "id:spotify-WW", "hotttnesss"],
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

    self.getPopularSongsForArtists = function (artists, successCallback, errorCallback) {
        var allSongIds = [],
            maxArtists = 10,
            songResults = 3;

        $.each(artists, function (index, artist) {
            spotifyLive.util.debug("Getting " + songResults + " most popular songs for " + artist.name + "...");
            $.ajax({
                url: "http://developer.echonest.com/api/v4/song/search",
                data: {
                    api_key: echoNestApiKey,
                    bucket: ["tracks", "id:spotify-WW", "song_hotttnesss"],
                    artist_id: artist.id,
                    sort: "song_hotttnesss-desc",
                    limit: true,
                    results: songResults,
                },
                cache: true,
                traditional: true
            })
                .done(function (data) {
                    var songIds = _getSongIds(data.response.songs);

                    spotifyLive.util.debug("Received " + songIds.length + " song id's for " + artist.name);

                    allSongIds.push(songIds);

                    if ((index + 1) == (artists.length || maxArtists)) {
                        typeof successCallback === 'function' && successCallback(_.flatten(allSongIds));
                    }
                })
                .error(function () {
                    if (allSongIds.length == 0) {
                        spotifyLive.util.debug("Error retreiving song id's.");
                        typeof errorCallback === 'function' && errorCallback();
                    } else {
                        spotifyLive.util.debug("Error retreiving some id's - using what we've got.");
                        typeof successCallback === 'function' && successCallback(_.flatten(allSongIds));
                    }
                });
        });
    };

    return parent;
}(spotifyLive || {}, jQuery));