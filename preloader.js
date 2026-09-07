(function () {
    document.documentElement.classList.add('preloader-active');

    document.addEventListener('DOMContentLoaded', function () {
        var preloader = document.getElementById('site-preloader');
        if (!preloader) {
            document.documentElement.classList.remove('preloader-active');
            return;
        }

        var HOLD_MS = 1600;  
        var FADE_MS = 500;   

        setTimeout(function () {
            preloader.classList.add('is-hiding');
            document.documentElement.classList.remove('preloader-active');

            setTimeout(function () {
                preloader.classList.add('is-hidden');
            }, FADE_MS);
        }, HOLD_MS);
    });
})();
