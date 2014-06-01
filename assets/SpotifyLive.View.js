var SpotifyLive = (function (parent, $) {
    "use strict";
    var self = parent.View = parent.View || {};

    var onGenreClicked = function () {

        $(this).toggleClass('selected-genre');

        var selectedGenre = $('span', this).text();

        var selectedGenres = [];
        $('li.selected-genre', this.parentNode).each(function (index, selectedGenre) {
            selectedGenres.push($('span', this).text());
        });

        console.log('Genres changed - selected: ' + selectedGenres.join(", "));

        $(document).trigger('genre-selected', {
            genre: selectedGenre
        });
        $(document).trigger('genres-changed', {
            genres: selectedGenres
        });
    };

    self.displayGenres = function (elem, genres) {
        $(elem).fadeOut(function () {
            var genreElements = [];

            $.each(genres, function (index, genre) {
                genreElements.push("<li><span>" + genre[0] + "</span></li>");
            });

            var events = $._data(this, 'events');
            if (!events) {
                $('li', this).off('click');
            }

            $(this).html(genreElements.join("")).fadeIn();

            $('li', this).on('click', onGenreClicked);
        });
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