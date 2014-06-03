var SpotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.View = parent.View || {};

    var _maxSelectedTerms = 3;
    var _selectedTerms = [];


    self.Controls = {
        root: $(document),
        parentContainer: $('#container'),
        screensContainer: $('#screens-container'),
        allScreens: $('#screens-container > div'),
        findArtistsButton: $('#find-artists-button'),
        makePlaylistButton: $('#make-playlist-button'),
        notificationModal: $('#notification-modal'),
        termGrid: $('#term-grid'),
        loaderLabel: $('#notification-label'),
        landingScreen: $('#landing-screen'),
        termScreen: $('#term-screen'),
        playerScreen: $('#player-screen')
    };

    self.ControlActions = {
        setLoaderLabel: function (text) {
            SpotifyLive.View.Controls.loaderLabel.fadeOut('fast', function () {
                $(this).text(text).fadeIn('fast');
            });
        },
        showLoadingScreen: function (text) {
            SpotifyLive.View.Controls.screensContainer.fadeOut(function () {
                SpotifyLive.View.ControlActions.setLoaderLabel(text);
                SpotifyLive.View.Controls.notificationModal.fadeIn();
            });
        },
        hideLoadingScreen: function (callback) {
            SpotifyLive.View.Controls.notificationModal.fadeOut(callback).hide();
        },
        showScreen: function ($screen, callback) {
            SpotifyLive.View.ControlActions.hideLoadingScreen(function () {
                SpotifyLive.View.Controls.allScreens.removeClass('active').hide();
                $screen.addClass('active').show();
                SpotifyLive.View.Controls.screensContainer.fadeIn('fast', callback);
            });
        }
    };

    self.Actions = {
        init: function () {
            SpotifyLive.View.ControlActions.showScreen(SpotifyLive.View.Controls.allScreens.first());
            SpotifyLive.View.Controls.findArtistsButton.on('click', SpotifyLive.View.Actions.onFindArtistsClick);
            SpotifyLive.View.Controls.root.on('coordinates-found', SpotifyLive.View.Actions.onCoordinatesFound);
            SpotifyLive.View.Controls.root.on('all-local-events-found', SpotifyLive.View.Actions.onAllEventsFound);
            SpotifyLive.View.Controls.root.on('no-local-events-found', SpotifyLive.View.Actions.onNoEventsFound);
            SpotifyLive.View.Controls.root.on('taste-profile-completed', SpotifyLive.View.Actions.onTasteProfileUploaded);
            SpotifyLive.View.Controls.root.on('term-selected', SpotifyLive.View.Actions.onTermSelected);
        },
        onFindArtistsClick: function () {
            SpotifyLive.View.ControlActions.showLoadingScreen('Finding your location...');
            SpotifyLive.Location.getCurrentCoordinates();
        },
        onMakePlaylistClick: function () {
            SpotifyLive.View.ControlActions.showLoadingScreen('Finding songs...');
        },
        onCoordinatesFound: function (event, coordinates) {
            SpotifyLive.View.ControlActions.setLoaderLabel('Looking for events...');
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
            SpotifyLive.View.ControlActions.setLoaderLabel('No events found in your town :(');
            console.log("No events found - checking for events on the next day...");
            var newDate = new Date();
            newDate.setDate(data.date.getDate() + 1);
            SpotifyLive.SongKick.getAllEventsForDate(newDate, data.coordinates);
        },
        onTasteProfileUploaded: function (event, tasteProfileId) {
            SpotifyLive.EchoNest.getTasteProfile(tasteProfileId, SpotifyLive.View.Actions.processTasteProfile);
        },
        onTermSelected: function (event, data) {

        },
        processTasteProfile: function (artists) {
            var usableArtists = SpotifyLive.Util.extractUsableArtists(artists);
            if (usableArtists.length > 0) {
                SpotifyLive.View.ControlActions.setLoaderLabel("Getting metadata on " + usableArtists.length + " artists...");
                var termData = SpotifyLive.Util.getTermDataFromArtistCollection(usableArtists);
                SpotifyLive.View.Actions.displayTerms(termData);
            } else {
                SpotifyLive.View.ControlActions.setLoaderLabel('No artists found in your town :(');
            }
        },
        displayTerms: function (termData) {
            SpotifyLive.View.injectTerms(SpotifyLive.View.Controls.termGrid, termData, 15);
            SpotifyLive.View.ControlActions.showScreen(SpotifyLive.View.Controls.termScreen);
        }
    };

    var onTermClicked = function () {
        var $selectedTerm = $(this).toggleClass('selected-term');
        _selectedTerms.push($selectedTerm);

        if (_selectedTerms.length > _maxSelectedTerms) {
            _.first(_selectedTerms).removeClass('selected-term');
            _selectedTerms = _.rest(_selectedTerms, 1);
        }

        //        var termText = $('span', this).text();
        //
        //        var $selectedTerms = $('li.selected-term', this.parentNode);
        //
        //        $selectedTerms.each(function (index, selectedTerm) {
        //            selectedTerms.push($('span', this).text());
        //        });
        //
        //        console.log('Terms changed - selected: ' + selectedTerms.join(", "));
        //
        //        $(document).trigger('term-selected', {
        //            term: selectedTerm
        //        });
        //
        //        $(document).trigger('terms-changed', {
        //            terms: selectedTerms
        //        });
    };

    self.injectTerms = function ($termGrid, termData, amount) {
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

        var events = $._data(this, 'events');
        if (!events) {
            $('li', this).off('click');
        }

        $termGrid.html(termElementsHtml).fadeIn();

        $('li', $termGrid).on('click', onTermClicked).tooltip();
    };

    self.displaySpotifyTrackset = function (elem, songIds, title) {
        var $elem = $(elem);

        var spotifySongIds = _.map(songIds, function (songId) {
            return songId.replace('spotify-WW:track:', '');
        });

        $elem.html('<iframe src="https://embed.spotify.com/?uri=spotify:trackset:' + title + ':' + spotifySongIds.join(',') + '" width="300" height="380" frameborder="0" allowtransparency="true"></iframe>');
    };

    self.removeSpotifyTrackset = function (elem) {
        $(elem).html('');
    };

    return parent;

}(SpotifyLive || {}, jQuery));