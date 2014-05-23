jQuery(function ($) {
    var $loadArtistsButton = $('#find-artists-button');

    $loadArtistsButton.on('click', getLocation);

    function getLocation() {
        $loadArtistsButton.text("Loading...");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition, showError);
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
        console.log("Latitude: " + position.coords.latitude + ", Longitude: " + position.coords.longitude);
        $loadArtistsButton.removeClass('btn-primary').addClass('btn-success');
        $loadArtistsButton.text("Loading artists...");

        var currentDate = dateToYMD(new Date());

        $.ajax({
            url: "http://api.songkick.com/api/3.0/events.json?apikey={yourApiKey}&location=geo%3A" + position.coords.latitude + "%2C" + position.coords.longitude + "&min_date=" + currentDate + "&max_date=" + currentDate,
            type: "GET",
            timeout: 30000,
            success: function (data, textStatus) {
                console.log(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log("Error");
                console.log(errorThrown);
            },
        });
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