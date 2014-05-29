jQuery(function ($) {
    Array.prototype.contains = function (artistId) {
        if (this !== undefined && this.length > 0) {
            for (i in this) {
                if (this[i].artistId === artistId) {
                    return true;
                }
            }
        }
        return false;
    }

    Array.prototype.find = function (filter) {
        if (this !== undefined) {
            for (var i = 0; i < this.length; i++) {
                if (filter(this[i], i, this)) return i;
            }
        }
        return -1;
    }

    var $loadArtistsButton = $('#find-artists-button');
    var $artistGrid = $('#artist-grid');
    var $termGrid = $('#term-grid');

    var allArtistsPlaying = [];
    var echoNestApiKey = "TADM7C6U9DKHCUBJD";
    var songKickApiKey = "qnqepvaYb1LXkz0T";
    var currentDate = dateToYMD(new Date()); // TODO: move
    var currentCoords = null;

    $loadArtistsButton.on('click', getLocation);

    function getGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getLocation() {
        $loadArtistsButton.text("Loading...");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition, showError, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        } else {
            $loadArtistsButton.removeClass('btn-primary').addClass('btn-danger');
            $loadArtistsButton.text("Location not supported.");
        }
    }

    function dateToYMD(date) {
        var d = date.getDate();
        var m = date.getMonth() + 1;
        var y = date.getFullYear();
        return '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
    }

    function showPosition(position) {
        currentCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
        };

        // Override for Bath
        //        currentCoords.latitude = 51.345099;
        //        currentCoords.longitude = -2.316377;

        console.log('Your current position is:');
        console.log('Latitude: ' + currentCoords.latitude);
        console.log('Longitude: ' + currentCoords.longitude);
        console.log('More or less ' + currentCoords.accuracy + ' meters.');
        $loadArtistsButton.removeClass('btn-primary').addClass('btn-success');
        $loadArtistsButton.text("Loading artists...");

        getAreaName(currentCoords, function (area) {
            $pageHeader = $('#page-header');
            var text = $pageHeader.text();
            $pageHeader.text(text.replace("near me", "in " + area.city));
        });

        createTasteProfile(function (profileId) {
            callSongKick(currentCoords, 1, profileId);
        });
    }

    function getArtistsFromEvent(eventItem) {
        var artists = [];

        $.each(eventItem.performance, function (index, performanceItem) {
            artists.push({
                eventId: eventItem.id,
                artistId: performanceItem.artist.id,
                name: performanceItem.artist.displayName,
                billing: performanceItem.billing
            });
        });

        return artists;
    }

    function loadTopTermsFromArtists(tasteProfileId, callback) {

        _(function () {
            var dataParams = {
                api_key: echoNestApiKey,
                id: tasteProfileId,
                results: 10,
                start: 0
            };

            $.getJSON("http://developer.echonest.com/api/v4/tasteprofile/read?bucket=genre&bucket=id:spotify-WW", $.param(dataParams, true))
                .done(function (data) {
                    console.log("Received Taste Pofile (id: " + tasteProfileId + ")...");
                    console.log(data);
                    debugger;
                });
        }).delay(1000);
    }

    function loadTopTerms(count, callback) {

        $.getJSON("http://developer.echonest.com/api/v4/artist/top_terms", {
            api_key: echoNestApiKey,
            results: count,
        })
            .done(function (data) {
                console.log("Got top terms...");
                console.log(data);
                // Push genres to markup.
                var terms = [];
                $.each(data.response.terms, function (index, genre) {
                    terms.push("<li data-event-id='" + genre.name + "'>" + genre.name + "</li>");
                });
                $termGrid.append(terms.join(""));

                callback();
            });
    }

    function addArtistsToTasteProfile(profileId, artists) {
        var artistActions = [];
        $.each(artists, function (index, artist) {
            if (!allArtistsPlaying.contains(artist.id)) {
                artistActions.push({
                    action: "update",
                    item: {
                        artist_id: "songkick:artist:" + artist.artistId,
                        item_keyvalues: {
                            event_id: artist.eventId,
                            billing: artist.billing,
                            name: artist.name,
                        }
                    }
                });
            }
        });

        console.log("Adding " + artistActions.length + " artists to Taste Profile (id: " + profileId + ").");
        console.log(JSON.stringify(artistActions));

        $.post("http://developer.echonest.com/api/v4/tasteprofile/update", {
            api_key: echoNestApiKey,
            format: "json",
            id: profileId,
            data: JSON.stringify(artistActions),
        })
            .done(function () {
                console.log("Artists added to EchoNest Taste Profile (id: " + profileId + ").");
                allArtistsPlaying.push(artists);
            });
    }

    function processEventsCallback(data) {
        var totalResults = data.resultsPage.totalEntries;
        var currentPage = data.resultsPage.page;
        var perPage = data.resultsPage.perPage;
        console.log("Received response of page " + currentPage + " containing " + data.resultsPage.results.event.length);
        console.log(data);

        var items = [];
        var artistsPlaying = [];

        $.each(data.resultsPage.results.event, function (index, eventItem) {
            items.push("<li data-event-id='" + eventItem.id + "'>" + eventItem.displayName + "</li>");
            var extractedArtists = getArtistsFromEvent(eventItem);

            artistsPlaying = artistsPlaying.concat(extractedArtists);
        });

        // Filter out duplicate artists.
        var dedupedArtists = artistsPlaying.filter(function (artist, index, self) {
            return self.find(function (item) {
                return item.artistId == artist.artistId
            }) == index;
        });

        console.log("Artists: " + artistsPlaying.length + ", Deduped artists: " + dedupedArtists.length);

        addArtistsToTasteProfile(this.tasteProfileId, dedupedArtists);

        $artistGrid.append(items.join(""));

        if (currentPage * perPage < totalResults) {
            currentPage++;
            callSongKick(currentCoords, currentPage, this.tasteProfileId);
        } else {
            $loadArtistsButton.hide();

            loadTopTermsFromArtists(this.tasteProfileId);
            //loadTopTerms(100);
            // gt recognised 
        }
    }

    function getAreaInfo(addressComponents, componentName, getShortName) {
        // Loop through 'address_components' and return item with 'type' equal to componentName.
        var addressComponent = addressComponents.filter(function (item, index) {
            return ($.inArray(componentName, item.types) != -1);
        });

        return getShortName ? addressComponent[0].short_name : addressComponent[0].long_name;
    }

    function getAreaName(coords, callback) {
        // Get name of area from Google GeoCode API, based on lat, long.
        console.log('Calling Google geocode API...');
        $.getJSON("http://maps.googleapis.com/maps/api/geocode/json", {
            latlng: coords.latitude + "," + coords.longitude,
            sensor: false
        })
            .done(function (data) {
                var area = {
                    city: getAreaInfo(data.results[0].address_components, "postal_town", true),
                    country: getAreaInfo(data.results[0].address_components, "country", false)
                };

                console.log("Found location to be " + area.city + " in " + area.country);
                callback(area);
            });
    }

    function createTasteProfile(callback) {
        var guid = getGuid();

        $.post("http://developer.echonest.com/api/v4/tasteprofile/create", {
            api_key: echoNestApiKey,
            format: "json",
            type: "artist",
            name: guid,
        })
            .done(function (data) {
                callback(data.response.id);
            });
    }

    function callSongKick(coords, page, tasteProfileId) {
        $.ajax({
            url: "http://api.songkick.com/api/3.0/events.json",
            data: {
                apikey: songKickApiKey,
                location: "geo:" + coords.latitude + "," + coords.longitude,
                min_date: currentDate,
                max_date: currentDate,
                page: page,
            },
            tasteProfileId: tasteProfileId
        })
            .done(processEventsCallback);

        console.log("Calling SongKick API for page " + page + "...");
    }

    function showError(error) {
        $loadArtistsButton.removeClass('btn-primary').addClass('btn-danger');
        switch (error.code) {
        case error.PERMISSION_DENIED:
            $loadArtistsButton.text("Location denied...");
            break;
        case error.POSITION_UNAVAILABLE:
            $loadArtistsButton.text("We can't find you...");
            break;
        case error.TIMEOUT:
            $loadArtistsButton.text("Timed out...");
            break;
        case error.UNKNOWN_ERROR:
            $loadArtistsButton.text("Error!");
            break;
        }
    }
});