var SpotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.View = parent.View || {};

    var _maxSelectedTerms = 3;
    var _termData = [];

    self.Controls = {
        root: $(document),
        parentContainer: $('#container'),
        screensContainer: $('#screens-container'),
        allScreens: $('#screens-container > div'),
        findArtistsButton: $('#find-artists-button'),
        makePlaylistButton: $('#make-playlist-button'),
        backButton: $('#back-button'),
        notificationModal: $('#notification-modal'),
        loadingAnimation: $('#bar-loader'),
        termGrid: $('#term-grid'),
        loaderLabel: $('#notification-label'),
        landingScreen: $('#landing-screen'),
        termScreen: $('#term-screen'),
        playerScreen: $('#player-screen'),
        playerContainer: $('#spotify-player')
    };

    self.ControlActions = {
        setLoaderLabel: function (text) {
            self.Controls.loaderLabel.fadeOut('fast', function () {
                $(this).text(text).fadeIn('fast');
            });
        },
        setErrorLabel: function (text) {
            self.Controls.loaderLabel.fadeOut('fast', function () {
                self.Controls.loadingAnimation.hide();
                $(this).text(text).fadeIn('fast');
            });
        },
        showLoadingScreen: function (text) {
            self.Controls.screensContainer.fadeOut(function () {
                self.ControlActions.setLoaderLabel(text);
                self.Controls.notificationModal.fadeIn();
            });
        },
        hideLoadingScreen: function (callback) {
            self.Controls.notificationModal.fadeOut(callback).hide();
        },
        showScreen: function ($screen, callback) {
            self.Controls.screensContainer.fadeOut(function () {
                self.ControlActions.hideLoadingScreen(function () {
                    self.Controls.allScreens.removeClass('active').hide();
                    $screen.addClass('active').show();
                    self.Controls.screensContainer.fadeIn('fast', callback);
                });
            });
        }
    };

    self.Actions = {
        init: function () {
            self.ControlActions.showScreen(self.Controls.allScreens.first());
            self.Controls.findArtistsButton.on('click', self.Actions.onFindArtistsClick);
            self.Controls.makePlaylistButton.on('click', self.Actions.onMakePlaylistClick);
            self.Controls.backButton.on('click', self.Actions.onBackClick);
            self.Controls.root.on('coordinates-found', self.Actions.onCoordinatesFound);
            self.Controls.root.on('all-local-events-found', self.Actions.onAllEventsFound);
            self.Controls.root.on('no-local-events-found', self.Actions.onNoEventsFound);
            self.Controls.root.on('taste-profile-completed', self.Actions.onTasteProfileUploaded);
        },
        onFindArtistsClick: function () {
            self.ControlActions.showLoadingScreen('Finding your location...');
            SpotifyLive.Location.getCurrentCoordinates();
        },
        onMakePlaylistClick: function () {
            self.ControlActions.showLoadingScreen('Finding songs...');
            var key = $('li.selected', self.Controls.termGrid).text();

            SpotifyLive.EchoNest.getPopularSongsForArtists(_termData[key], function (songIds) {
                SpotifyLive.Location.getCurrentCityAndCountry(function (area) {
                    var title = _ucfirst(key) + " in " + area.city + " tonight.";
                    self.displaySpotifyTrackset(songIds, title);
                    self.ControlActions.showScreen(self.Controls.playerScreen);
                });
            });
        },
        onBackClick: function () {
            self.ControlActions.showScreen(self.Controls.termScreen, function () {
                self.removeSpotifyTrackset();
            });
        },
        onCoordinatesFound: function (event, coordinates) {
            self.ControlActions.setLoaderLabel('Looking for events...');
            SpotifyLive.Location.getCurrentCityAndCountryFromCoordinates(coordinates);
            SpotifyLive.SongKick.getAllEventsForDate(new Date(), coordinates);
        },
        onAllEventsFound: function (event, data) {
            SpotifyLive.Location.getCurrentCityAndCountry(function (area) {
                var normalisedArtists = SpotifyLive.Util.convertSongKickEventsToTasteProfileArtists(data.events);
                SpotifyLive.EchoNest.uploadArtistsToTasteProfile(normalisedArtists);
            });
        },
        onNoEventsFound: function (event, data) {
            self.ControlActions.setErrorLabel('Seems no one\'s playing in town tonight :(');
            console.log("No events found - checking for events on the next day...");
            var newDate = new Date();
            newDate.setDate(data.date.getDate() + 1);
            SpotifyLive.SongKick.getAllEventsForDate(newDate, data.coordinates);
        },
        onTasteProfileUploaded: function (event, tasteProfileId) {
            SpotifyLive.EchoNest.getTasteProfile(tasteProfileId, self.Actions.processTasteProfile);
        },
        processTasteProfile: function (artists) {
            var usableArtists = SpotifyLive.Util.extractUsableArtists(artists);
            if (usableArtists.length > 0) {
                self.ControlActions.setLoaderLabel("Getting metadata on " + usableArtists.length + " artists...");
                _termData = SpotifyLive.Util.getTermDataFromArtistCollection(usableArtists);

                _injectTerms(_termData, 15);
                self.ControlActions.showScreen(self.Controls.termScreen);
            } else {
                self.ControlActions.setErrorLabel('Seems no one\'s playing in town tonight :(');
            }
        }
    };

    var _injectTerms = function (termData, amount) {
        var termElementsHtml = _
            .chain(termData)
            .pairs()
            .sortBy(function (term) {
                return term[1].length;
            })
            .last(amount)
            .map(function (term) {
                var artistList = _.pluck(term[1], 'name').join("\r\n");
                return "<li data-toggle=tooltip title='" + artistList + "'><span>" + term[0] + "</span></li>";
            })
            .value()
            .reverse()
            .join("");

        self.Controls.termGrid.html(termElementsHtml).fadeIn();

        $('li', self.Controls.termGrid).on('click', function () {
            self.Controls.makePlaylistButton.prop('disabled', false);

            var $this = $(this);
            var $selectedTermTile = $('#term-grid li.selected');

            if ($selectedTermTile.text() != $this.text()) {
                $selectedTermTile.removeClass('selected');
                $this.addClass('selected');
            }
        }).tooltip();
    };

    var _ucfirst = function (str, force) {
        str = force ? str.toLowerCase() : str;
        return str.replace(/(\b)([a-zA-Z])/,
            function (firstLetter) {
                return firstLetter.toUpperCase();
            });
    }

    self.displaySpotifyTrackset = function (songIds, title) {

        var spotifySongIds = _.map(songIds, function (songId) {
            return songId.replace('spotify-WW:track:', '');
        });

        self.Controls.playerContainer.html(
            '<iframe src="https://embed.spotify.com/?uri=spotify:trackset:' + title + ':' + spotifySongIds.join(',') + '" width="300" height="380" frameborder="0" allowtransparency="true"></iframe>');
    };

    self.removeSpotifyTrackset = function () {
        self.Controls.playerContainer.html('');
    };

    return parent;

}(SpotifyLive || {}, jQuery));