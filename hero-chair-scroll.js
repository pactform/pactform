/* ==========================================================================
   hero-chair-scroll.js — memantau section hero (.hero-orange-block) dan
   menampilkan/menyembunyikan gambar kursi (.hero-floating-chair) dengan
   slide dari kanan setiap kali discroll masuk atau keluar layar.
   File baru, berdiri sendiri — tidak mengubah JS lain.
   Include di index.html sebelum </body>:
     <script src="hero-chair-scroll.js"></script>
   ========================================================================== */

(function () {
    function init() {
        var chair = document.querySelector('.hero-floating-chair');
        if (!chair) return;

        var section = chair.closest('.hero-orange-block') || chair.parentElement;

        chair.classList.add('js-chair-reveal');
        chair.classList.add('js-chair-hidden');

        if (!('IntersectionObserver' in window)) {
            chair.classList.remove('js-chair-hidden');
            chair.classList.add('js-chair-visible');
            return;
        }

        // Force the browser to actually paint the "hidden" (slid-right) state
        // before we start observing. Without this, when the hero is already
        // in view on page load, the IntersectionObserver's first callback can
        // fire before the hidden state is ever rendered, so the browser jumps
        // straight to "visible" and no transition is seen.
        // eslint-disable-next-line no-unused-expressions
        chair.offsetHeight;

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                var observer = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            chair.classList.remove('js-chair-hidden');
                            chair.classList.add('js-chair-visible');
                        } else {
                            chair.classList.remove('js-chair-visible');
                            chair.classList.add('js-chair-hidden');
                        }
                    });
                }, {
                    threshold: 0.25,
                    rootMargin: '0px 0px -10% 0px'
                });

                observer.observe(section);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
