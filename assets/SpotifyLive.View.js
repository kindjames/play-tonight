var spotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.view = parent.view || {},
        _maxSelectedTerms = 3,
        _termData = [];

    self.controls = {
        root: $(document),
        parentContainer: $('#container'),
        screensContainer: $('#screens-container'),
        allScreens: $('#screens-container > div > div'),
        findArtistsButton: $('#find-artists-button'),
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

    self.controlActions = {
        setLoaderLabel: function (text) {
            self.controls.loaderLabel.fadeOut('fast', function () {
                $(this).text(text).fadeIn('fast');
            });
        },
        setErrorLabel: function (text) {
            self.controls.loaderLabel.fadeOut('fast', function () {
                self.controls.loadingAnimation.hide();
                $(this).text(text).fadeIn('fast');
            });
        },
        showLoadingScreen: function (text) {
            self.controls.screensContainer.fadeOut(function () {
                self.controlActions.setLoaderLabel(text);
                self.controls.notificationModal.fadeIn();
            });
        },
        hideLoadingScreen: function (callback) {
            self.controls.notificationModal.fadeOut(callback).hide();
        },
        showScreen: function ($screen, callback) {
            self.controls.screensContainer.fadeOut(function () {
                self.controlActions.hideLoadingScreen(function () {
                    self.controls.allScreens.removeClass('active').hide();
                    $screen.addClass('active').show();
                    self.controls.screensContainer.fadeIn('fast', callback);
                });
            });
        }
    };

    self.actions = {
        init: function () {
            self.controlActions.showScreen(self.controls.allScreens.first());
            self.controls.findArtistsButton.on('click', self.actions.onFindArtistsClick);
            self.controls.backButton.on('click', self.actions.onBackClick);
            self.controls.root.on('all-local-events-found', self.actions.onAllEventsFound);
            self.controls.root.on('taste-profile-completed', self.actions.onTasteProfileUploaded);
            self.controls.root.on('no-local-events-found', self.actions.onNoLocalEventsFound);
            self.controls.root.on('term-selected', self.actions.onTermSelected);
        },
        onFindArtistsClick: function () {
            self.controlActions.setLoaderLabel('Looking for local events...');
            spotifyLive.util.debug("Contacting SongKick API for artists playing locally tonight...");
            spotifyLive.songKick.getAllEvents("qnqepvaYb1LXkz0T", new Date());
        },
        onTermSelected: function (event, data) {
            self.controlActions.showLoadingScreen('Finding songs...');
            var key = data;
            spotifyLive.echoNest.getPopularSongsForArtists(_termData[key], function (songIds) {
                var area = spotifyLive.util.getLocation();
                var title = _ucfirst(key) + " in " + area.city + " tonight";
                self.displaySpotifyTrackset(songIds, title);
                self.controlActions.showScreen(self.controls.playerScreen);
            });
        },
        onBackClick: function () {
            self.controlActions.showScreen(self.controls.termScreen, function () {
                self.removeSpotifyTrackset();
            });
        },
        onAllEventsFound: function (event, data) {
            var normalisedArtists = spotifyLive.util.convertSongKickEventsToTasteProfileArtists(data.events);
            spotifyLive.echoNest.uploadArtistsToTasteProfile(normalisedArtists);
        },
        onNoLocalEventsFound: function (event, data) {
            self.controlActions.setErrorLabel('Seems no one\'s playing in town tonight :(');
        },
        onTasteProfileUploaded: function (event, tasteProfileId) {
            spotifyLive.echoNest.getTasteProfile(tasteProfileId, self.actions.processTasteProfile);
        },
        processTasteProfile: function (artists) {
            var usableArtists = spotifyLive.util.extractUsableArtists(artists);
            if (usableArtists.length > 0) {
                self.controlActions.setLoaderLabel("Getting metadata on " + usableArtists.length + " artists...");
                _termData = spotifyLive.util.getTermDataFromArtistCollection(usableArtists);

                _injectTerms(_termData, 15);
                self.controlActions.showScreen(self.controls.termScreen);
            } else {
                self.controlActions.setErrorLabel('Seems no one\'s playing in town tonight :(');
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

        self.controls.termGrid.html(termElementsHtml).fadeIn();

        var $termTiles = $('li', self.controls.termGrid).on('click', function () {
            spotifyLive.view.controls.root.trigger('term-selected', $(this).text());
        });

        if (!spotifyLive.util.isTouchDevice()) {
            $termTiles.tooltip({
                placement: 'auto top'
            });
        }
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

        self.controls.playerContainer.html(
            '<iframe src="https://embed.spotify.com/?uri=spotify:trackset:' + title + ':' + spotifySongIds.join(',') + '" width="300" height="380" frameborder="0" allowtransparency="true"></iframe>');
    };

    self.removeSpotifyTrackset = function () {
        self.controls.playerContainer.html('');
    };

    return parent;

}(spotifyLive || {}, jQuery));