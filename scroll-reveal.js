/* ==========================================================================
   scroll-reveal.js — memunculkan teks dengan transisi saat elemen masuk
   viewport ketika discroll, baik ke bawah maupun ke atas.
   File baru, berdiri sendiri — tidak mengubah JS lain.
   Include di setiap halaman, sebelum </body>:
     <script src="scroll-reveal.js"></script>
   ========================================================================== */

(function () {
    function init() {
        var root = document.querySelector('main') || document.body;

        // Elemen teks yang akan dianimasikan
        var selector = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p',
            '.eyebrow', '.eyebrow-light',
            '.subtext', '.hero-desc', '.heading-desc', '.section-intro',
            '.time-label', '.time-value', '.time-note',
            '.spec-label', '.spec-value', '.spec-tag',
            '.category-count', '.filter-count',
            '.prof-line', '.result-caption',
            '.thumbnail h5', '.thumbnail-tags'
        ].join(', ');

        var targets = root.querySelectorAll(selector);
        if (!targets.length) return;


        var siblingCounters = new WeakMap();
        targets.forEach(function (el) {
            el.classList.add('scroll-reveal');

            var parent = el.parentElement;
            if (parent) {
                var count = siblingCounters.get(parent) || 0;
                if (count < 6) {
                    el.setAttribute('data-reveal-delay', String(count));
                }
                siblingCounters.set(parent, count + 1);
            }
        });

        if (!('IntersectionObserver' in window)) {
            // Fallback: langsung tampilkan semua teks
            targets.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                } else {
                    // Class dilepas lagi supaya animasi berulang saat
                    // discroll ke atas maupun ke bawah.
                    entry.target.classList.remove('is-visible');
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -8% 0px'
        });

        targets.forEach(function (el) { observer.observe(el); });
    }

    function initSmartFloatingActions() {
        var fabs = Array.prototype.slice.call(document.querySelectorAll('.whatsapp-sticky, .updates-sticky'));
        if (!fabs.length) return;

        var footer = document.querySelector('footer');
        var mainNav = document.getElementById('main-nav');
        var listModal = document.getElementById('list-modal');
        var footerInView = false;
        var ticking = false;

        function updateFabVisibility() {
            ticking = false;
            var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            var showThreshold = Math.min(220, Math.round(maxScroll * 0.22));
            var nearTop = window.scrollY < showThreshold;
            var navOpen = !!(mainNav && mainNav.classList.contains('open'));
            var drawerOpen = !!(listModal && !listModal.classList.contains('hidden'));
            var shouldHide = nearTop || footerInView || navOpen || drawerOpen;

            fabs.forEach(function (el) {
                el.classList.toggle('sticky-fab-hidden', shouldHide);
            });
        }

        function requestUpdate() {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(updateFabVisibility);
            }
        }

        if (footer && 'IntersectionObserver' in window) {
            var footerObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    footerInView = entry.isIntersecting;
                });
                requestUpdate();
            }, { threshold: 0.08 });
            footerObs.observe(footer);
        }

        if (typeof MutationObserver !== 'undefined') {
            var stateObs = new MutationObserver(requestUpdate);
            if (mainNav) stateObs.observe(mainNav, { attributes: true, attributeFilter: ['class'] });
            if (listModal) stateObs.observe(listModal, { attributes: true, attributeFilter: ['class'] });
        }

        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);
        updateFabVisibility();
    }

    function boot() {
        init();
        initSmartFloatingActions();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
