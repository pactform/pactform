/* ==========================================================================
   product-updates.js
   Powers the floating "Get Product Updates" button across all Pactform pages
   with a minimalist subscription modal supporting Formspree or Web3Forms.
   ========================================================================== */
(function (global) {
    'use strict';

    /* ----------------------------------------------------------------------
       CONFIGURATION — Paste EITHER your Formspree endpoint OR Web3Forms key:
       - Formspree:  FORMSPREE_ENDPOINT: 'https://formspree.io/f/YOUR_FORM_ID'
       - Web3Forms:  WEB3FORMS_ACCESS_KEY: 'YOUR-WEB3FORMS-ACCESS-KEY'
       ---------------------------------------------------------------------- */
    const CONFIG = {
        FORMSPREE_ENDPOINT: '',
        WEB3FORMS_ACCESS_KEY: '',
        SUBJECT: 'Pactform — New Product Updates Subscriber'
    };

    if (global.__pactformUpdatesLoaded) return;
    global.__pactformUpdatesLoaded = true;

    const INTERESTS = [
        'Hospitality',
        'Office & Workplace',
        'Outdoor',
        'Custom & Bespoke'
    ];

    function buildModalMarkup() {
        const chipsHtml = INTERESTS.map(label =>
            '<button type="button" class="updates-chip" data-interest="' + label + '" aria-pressed="false">' + label + '</button>'
        ).join('');

        return (
            '<div class="updates-overlay hidden" id="updates-overlay" aria-hidden="true"></div>' +
            '<div class="updates-modal hidden" id="updates-modal" role="dialog" aria-modal="true" aria-labelledby="updates-modal-title">' +
                '<div class="updates-modal-header">' +
                    '<div>' +
                        '<span class="updates-eyebrow">PRODUCT UPDATES</span>' +
                        '<h3 id="updates-modal-title">New pieces, directly to your inbox.</h3>' +
                    '</div>' +
                    '<button type="button" class="close-btn" id="close-updates-btn" aria-label="Close">&times;</button>' +
                '</div>' +
                '<div class="updates-modal-body">' +
                    '<p class="updates-intro">Be the first to know when new chairs, tables and contract collections are added to the Pactform catalogue.</p>' +
                    '<form id="updates-form" novalidate>' +
                        '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;" aria-hidden="true">' +
                        '<div class="updates-field">' +
                            '<label for="updates-email">Email address <span class="updates-req">*</span></label>' +
                            '<input type="email" id="updates-email" name="email" placeholder="you@company.com" required autocomplete="email">' +
                        '</div>' +
                        '<div class="updates-field">' +
                            '<label for="updates-name">Name or Studio / Company <span class="updates-opt">(optional)</span></label>' +
                            '<input type="text" id="updates-name" name="name" placeholder="Your name or studio" autocomplete="name">' +
                        '</div>' +
                        '<div class="updates-field">' +
                            '<label>Interested in <span class="updates-opt">(optional)</span></label>' +
                            '<div class="updates-chips" id="updates-chips">' + chipsHtml + '</div>' +
                        '</div>' +
                        '<p class="updates-feedback hidden" id="updates-feedback" role="status" aria-live="polite"></p>' +
                        '<div class="updates-actions">' +
                            '<button type="submit" class="btn btn-primary updates-submit-btn" id="updates-submit-btn">Subscribe</button>' +
                        '</div>' +
                    '</form>' +
                    '<div class="updates-success hidden" id="updates-success">' +
                        '<span class="updates-success-mark" aria-hidden="true">&#10003;</span>' +
                        '<h4>You&#8217;re on the list.</h4>' +
                        '<p id="updates-success-text">We&#8217;ll notify you as new Pactform furniture pieces and collections are released.</p>' +
                        '<button type="button" class="btn btn-secondary" id="updates-done-btn">Done</button>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }

    function init() {
        const triggers = Array.from(document.querySelectorAll('.updates-sticky'));
        if (!triggers.length) return;

        if (!document.getElementById('updates-modal')) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = buildModalMarkup();
            while (wrapper.firstChild) {
                document.body.appendChild(wrapper.firstChild);
            }
        }

        const overlay = document.getElementById('updates-overlay');
        const modal = document.getElementById('updates-modal');
        const closeBtn = document.getElementById('close-updates-btn');
        const doneBtn = document.getElementById('updates-done-btn');
        const form = document.getElementById('updates-form');
        const emailInput = document.getElementById('updates-email');
        const nameInput = document.getElementById('updates-name');
        const chipsWrap = document.getElementById('updates-chips');
        const feedbackEl = document.getElementById('updates-feedback');
        const submitBtn = document.getElementById('updates-submit-btn');
        const successEl = document.getElementById('updates-success');
        const successText = document.getElementById('updates-success-text');
        const selectedInterests = new Set();

        function showFeedback(msg, isError) {
            feedbackEl.textContent = msg;
            feedbackEl.classList.remove('hidden', 'is-error', 'is-note');
            feedbackEl.classList.add(isError ? 'is-error' : 'is-note');
        }

        function clearFeedback() {
            feedbackEl.textContent = '';
            feedbackEl.classList.add('hidden');
            feedbackEl.classList.remove('is-error', 'is-note');
        }

        function openModal() {
            clearFeedback();
            form.classList.remove('hidden');
            successEl.classList.add('hidden');
            modal.classList.remove('hidden');
            overlay.classList.remove('hidden');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('updates-modal-open');
            requestAnimationFrame(() => {
                overlay.classList.add('visible');
                modal.classList.add('visible');
                if (emailInput) emailInput.focus();
            });
        }

        function closeModal() {
            modal.classList.remove('visible');
            overlay.classList.remove('visible');
            overlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('updates-modal-open');
            setTimeout(() => {
                if (!modal.classList.contains('visible')) {
                    modal.classList.add('hidden');
                    overlay.classList.add('hidden');
                }
            }, 240);
        }

        triggers.forEach(btn => {
            btn.setAttribute('role', 'button');
            btn.setAttribute('aria-haspopup', 'dialog');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openModal();
            });
        });

        closeBtn.addEventListener('click', closeModal);
        doneBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('visible')) closeModal();
        });

        chipsWrap.addEventListener('click', (e) => {
            const chip = e.target.closest('.updates-chip');
            if (!chip) return;
            const val = chip.dataset.interest;
            if (selectedInterests.has(val)) {
                selectedInterests.delete(val);
                chip.classList.remove('is-active');
                chip.setAttribute('aria-pressed', 'false');
            } else {
                selectedInterests.add(val);
                chip.classList.add('is-active');
                chip.setAttribute('aria-pressed', 'true');
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearFeedback();

            const email = (emailInput.value || '').trim();
            const name = (nameInput.value || '').trim();
            const honeypot = (form.querySelector('[name="_gotcha"]').value || '').trim();
            if (honeypot) return;

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showFeedback('Please enter a valid email address.', true);
                emailInput.focus();
                return;
            }

            const interestsList = Array.from(selectedInterests);
            const payload = {
                email: email,
                name: name || '(Not provided)',
                interests: interestsList.length ? interestsList.join(', ') : 'All Collections',
                source_page: global.location.href
            };

            const dynCfg = global.PACTFORM_UPDATES_CONFIG || {};
            const formspreeUrl = (dynCfg.FORMSPREE_ENDPOINT || CONFIG.FORMSPREE_ENDPOINT || '').trim();
            const web3Key = (dynCfg.WEB3FORMS_ACCESS_KEY || CONFIG.WEB3FORMS_ACCESS_KEY || '').trim();
            const hasFormspree = Boolean(formspreeUrl);
            const hasWeb3Forms = Boolean(web3Key);

            // Preview / unconfigured fallback until Formspree URL or Web3Forms key is pasted
            if (!hasFormspree && !hasWeb3Forms) {
                try {
                    const stored = JSON.parse(localStorage.getItem('pactform-updates-preview') || '[]');
                    stored.unshift(Object.assign({ subscribed_at: new Date().toISOString() }, payload));
                    localStorage.setItem('pactform-updates-preview', JSON.stringify(stored.slice(0, 50)));
                } catch (err) {}

                if (global.console && console.info) {
                    console.info('[Pactform Updates] Preview mode — paste FORMSPREE_ENDPOINT or WEB3FORMS_ACCESS_KEY in product-updates.js to forward submissions to your inbox.', payload);
                }

                form.classList.add('hidden');
                successText.textContent = 'We\u2019ll send new product releases and catalogue updates to ' + email + '.';
                successEl.classList.remove('hidden');
                form.reset();
                selectedInterests.clear();
                chipsWrap.querySelectorAll('.updates-chip').forEach(c => {
                    c.classList.remove('is-active');
                    c.setAttribute('aria-pressed', 'false');
                });
                return;
            }

            submitBtn.disabled = true;
            const origText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';

            try {
                let res;
                if (hasFormspree) {
                    res = await fetch(formspreeUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(Object.assign({ _subject: CONFIG.SUBJECT }, payload))
                    });
                } else {
                    res = await fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(Object.assign({
                            access_key: web3Key,
                            subject: CONFIG.SUBJECT,
                            from_name: 'Pactform Website'
                        }, payload))
                    });
                }

                if (!res.ok) throw new Error('Request failed (' + res.status + ')');

                form.classList.add('hidden');
                successText.textContent = 'We\u2019ll send new product releases and catalogue updates to ' + email + '.';
                successEl.classList.remove('hidden');
                form.reset();
                selectedInterests.clear();
                chipsWrap.querySelectorAll('.updates-chip').forEach(c => {
                    c.classList.remove('is-active');
                    c.setAttribute('aria-pressed', 'false');
                });
            } catch (err) {
                showFeedback('Something went wrong while subscribing. Please try again or reach us via WhatsApp.', true);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = origText;
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
