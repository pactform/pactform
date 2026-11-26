/* ==========================================================================
   site-content-loader.js
   Applies editable settings, homepage slides, and per-page copywriting from
   site-content.js (or admin draft preview in localStorage) across all pages.
   ========================================================================== */
(function (global) {
    'use strict';

    if (global.__pactformSiteLoaderRun) return;
    global.__pactformSiteLoaderRun = true;

    const SITE_DRAFT_KEY = 'pactform-admin-site-draft';
    const PREVIEW_KEY = 'pactform-admin-preview';

    // Exact field registry shared between runtime and admin.html Page Editor
    const PAGE_SCHEMA = {
        index: {
            label: 'Homepage',
            file: 'index.html',
            fields: [
                { key: 'banner_h1', label: 'Orange Banner — Headline', selector: '.contract-hero-text h1', type: 'textarea', htmlBreaks: true },
                { key: 'banner_sub', label: 'Orange Banner — Subtitle', selector: '.contract-hero-text .hero-subtitle', type: 'textarea' },
                { key: 'banner_intro', label: 'Orange Banner — Body Copy', selector: '.contract-hero-text .intro-text', type: 'textarea' },
                { key: 'banner_btn1', label: 'Orange Banner — Primary Button', selector: '.contract-hero-text .hero-buttons a.btn-primary', type: 'text' },
                { key: 'banner_btn2', label: 'Orange Banner — Secondary Button', selector: '.contract-hero-text .hero-buttons a.btn-secondary', type: 'text' },
                { key: 'banner_img', label: 'Orange Banner — Chair Image Path', selector: 'img.contract-hero-chair', type: 'image' },
                { key: 'why_h2', label: 'Why Pactform — Heading', selector: '.why-section h2', type: 'text' },
                { key: 'why_intro', label: 'Why Pactform — Lead Paragraph', selector: '.why-section .section-intro', type: 'textarea' },
                { key: 'why_body', label: 'Why Pactform — Second Paragraph', selector: '.why-section p:not(.section-intro)', type: 'textarea' },
                { key: 'col_h2', label: 'The Collection — Heading', selector: '#the-collection h2', type: 'text' },
                { key: 'col_intro', label: 'The Collection — Subtitle', selector: '#the-collection .section-intro', type: 'text' },
                { key: 'col_img', label: 'The Collection — Showcase Image Path', selector: '#collection-showcase-trigger img', type: 'image' },
                { key: 'boq_eyebrow', label: 'Project BOQ — Eyebrow', selector: '.boq-upload-section .eyebrow', type: 'text' },
                { key: 'boq_h2', label: 'Project BOQ — Heading', selector: '.boq-upload-section h2', type: 'text' },
                { key: 'boq_desc', label: 'Project BOQ — Description', selector: '.boq-upload-section .boq-desc', type: 'textarea' },
                { key: 'custom_eyebrow', label: 'Custom Block — Eyebrow', selector: '.custom-furniture-text .eyebrow', type: 'text' },
                { key: 'custom_h2', label: 'Custom Block — Heading', selector: '.custom-furniture-text h2', type: 'text' },
                { key: 'custom_body', label: 'Custom Block — Description', selector: '.custom-furniture-text p', type: 'textarea' },
                { key: 'custom_btn', label: 'Custom Block — Button Text', selector: '.custom-furniture-text a.btn-primary', type: 'text' },
                { key: 'custom_img', label: 'Custom Block — Chair Image Path', selector: 'img.custom-furniture-chair', type: 'image' },
                { key: 'about_h2_1', label: 'About Teaser — Headline Line 1', selector: '.about-teaser h2:nth-of-type(1)', type: 'text' },
                { key: 'about_h2_2', label: 'About Teaser — Headline Line 2', selector: '.about-teaser h2:nth-of-type(2)', type: 'text' },
                { key: 'about_p1', label: 'About Teaser — Paragraph 1', selector: '.about-teaser p:nth-of-type(1)', type: 'textarea' },
                { key: 'about_p2', label: 'About Teaser — Paragraph 2', selector: '.about-teaser p:nth-of-type(2)', type: 'textarea' },
                { key: 'about_p3', label: 'About Teaser — Paragraph 3', selector: '.about-teaser p:nth-of-type(3)', type: 'textarea' }
            ]
        },
        about: {
            label: 'About Page',
            file: 'about.html',
            fields: [
                { key: 'hero_sub', label: 'Hero — Eyebrow', selector: '.about-hero-text .subtext', type: 'text' },
                { key: 'hero_h1', label: 'Hero — Headline', selector: '.about-hero-text h1', type: 'text' },
                { key: 'hero_desc', label: 'Hero — Description', selector: '.about-hero-text .hero-desc', type: 'textarea' },
                { key: 'hero_img', label: 'Hero — Background Image Path', selector: '.about-hero-bg', type: 'image' },
                { key: 'approach_eyebrow', label: 'Approach — Eyebrow', selector: '.approach-copy-col .eyebrow', type: 'text' },
                { key: 'approach_h2', label: 'Approach — Heading', selector: '.approach-copy-col h2', type: 'text' },
                { key: 'approach_desc', label: 'Approach — Description', selector: '.approach-copy-col .heading-desc', type: 'textarea' },
                { key: 'col_h2', label: 'Collection Carousel — Heading', selector: '.about-category-carousel-section h2', type: 'text' },
                { key: 'col_desc', label: 'Collection Carousel — Subtitle', selector: '.about-category-carousel-section .heading-desc', type: 'textarea' },
                { key: 'partners_h2', label: 'Project Partners — Heading', selector: '.about-partners-editorial h2', type: 'text' },
                { key: 'partners_desc', label: 'Project Partners — Description', selector: '.about-partners-editorial .prof-line', type: 'textarea' },
                { key: 'cta_h2', label: 'Bottom CTA — Heading', selector: '.about-cta h2', type: 'text' },
                { key: 'cta_desc', label: 'Bottom CTA — Description', selector: '.about-cta .cta-main-col p', type: 'textarea' }
            ]
        },
        collection: {
            label: 'Collections Directory',
            file: 'collection.html',
            fields: [
                { key: 'intro_h1', label: 'Page Title', selector: '.col-intro-title', type: 'text' },
                { key: 'space_eyebrow', label: 'Section 01 — Eyebrow', selector: '#browse-by-space .col-section-eyebrow', type: 'text' },
                { key: 'space_h2', label: 'Section 01 — Heading', selector: '#space-heading', type: 'text' },
                { key: 'chairs_eyebrow', label: 'Section 02 — Eyebrow', selector: '#chairs .col-section-eyebrow', type: 'text' },
                { key: 'chairs_h2', label: 'Section 02 — Heading', selector: '#chairs-heading', type: 'text' },
                { key: 'tables_eyebrow', label: 'Section 03 — Eyebrow', selector: '#tables .col-section-eyebrow', type: 'text' },
                { key: 'tables_h2', label: 'Section 03 — Heading', selector: '#tables-heading', type: 'text' },
                { key: 'storage_eyebrow', label: 'Section 04 — Eyebrow', selector: '#storage .col-section-eyebrow', type: 'text' },
                { key: 'storage_h2', label: 'Section 04 — Heading', selector: '#storage-heading', type: 'text' },
                { key: 'cta_h3', label: 'Custom CTA — Heading', selector: '#custom-cta-heading', type: 'text' },
                { key: 'cta_body', label: 'Custom CTA — Body Copy', selector: '.col-custom-body', type: 'textarea' }
            ]
        },
        custom: {
            label: 'Custom Page',
            file: 'custom.html',
            fields: [
                { key: 'hero_sub', label: 'Hero — Eyebrow', selector: '.custom-hero-copy .subtext', type: 'text' },
                { key: 'hero_h1', label: 'Hero — Headline', selector: '.custom-hero-copy h1', type: 'text' },
                { key: 'hero_desc', label: 'Hero — Description', selector: '.custom-hero-copy .hero-desc', type: 'textarea' },
                { key: 'hero_img', label: 'Hero — Background Image Path', selector: '.custom-hero-bg', type: 'image' },
                { key: 'spec_h2', label: 'Customisation — Heading', selector: '.customisation-section h2', type: 'text' },
                { key: 'spec_lead', label: 'Customisation — Lead Line', selector: '.customisation-section .spec-lead', type: 'text' }
            ]
        },
        shipping: {
            label: 'Shipping Page',
            file: 'shipping.html',
            fields: [
                { key: 'hero_sub', label: 'Hero — Eyebrow', selector: '.shipping-hero-copy .subtext', type: 'text' },
                { key: 'hero_kicker', label: 'Hero — Kicker', selector: '.shipping-hero-copy .hero-kicker', type: 'text' },
                { key: 'hero_desc', label: 'Hero — Description', selector: '.shipping-hero-copy .hero-desc', type: 'textarea' },
                { key: 'coord_h2', label: 'Coordinate Section — Heading', selector: '#delivery-scope h2', type: 'text' }
            ]
        },
        projects: {
            label: 'Projects Page',
            file: 'projects.html',
            fields: [
                { key: 'hero_sub', label: 'Hero — Eyebrow', selector: '.projects-hero-title-col .subtext', type: 'text' },
                { key: 'hero_desc', label: 'Hero — Description', selector: '.projects-hero-desc-col .hero-desc', type: 'textarea' },
                { key: 'hero_img', label: 'Hero — Background Image Path', selector: '.projects-hero-bg', type: 'image' },
                { key: 'designed_eyebrow', label: 'Project Furniture — Eyebrow', selector: '.designed-intro-col .eyebrow', type: 'text' },
                { key: 'designed_h2', label: 'Project Furniture — Heading', selector: '.designed-intro-col h2', type: 'text' },
                { key: 'designed_desc', label: 'Project Furniture — Description', selector: '.designed-intro-col .heading-desc', type: 'textarea' },
                { key: 'upload_eyebrow', label: 'Enquiry Band — Eyebrow', selector: '.upload-title-col .eyebrow', type: 'text' },
                { key: 'upload_h2', label: 'Enquiry Band — Heading', selector: '.upload-title-col h2', type: 'text' }
            ]
        }
    };

    const isAdminStudio = Boolean(global.__PACTFORM_ADMIN_STUDIO__);

    function getActiveSiteContent() {
        let content = global.PACTFORM_SITE_CONTENT || { settings: {}, homeSlides: null, pages: {} };
        let previewing = false;
        if (!isAdminStudio) {
            try {
                if (global.localStorage && localStorage.getItem(PREVIEW_KEY) === '1') {
                    const draft = JSON.parse(localStorage.getItem(SITE_DRAFT_KEY) || 'null');
                    if (draft && typeof draft === 'object') {
                        content = draft;
                        previewing = true;
                    }
                }
            } catch (e) {}
        }
        return { content, previewing };
    }

    function detectPageKey() {
        const path = (global.location.pathname || '').toLowerCase();
        if (path.endsWith('/about.html') || path.endsWith('/about')) return 'about';
        if (path.endsWith('/collection.html') || path.endsWith('/collection')) return 'collection';
        if (path.endsWith('/custom.html') || path.endsWith('/custom')) return 'custom';
        if (path.endsWith('/shipping.html') || path.endsWith('/shipping')) return 'shipping';
        if (path.endsWith('/projects.html') || path.endsWith('/projects')) return 'projects';
        if (path.endsWith('/index.html') || path.endsWith('/') || path === '') return 'index';
        if (document.getElementById('hero-carousel')) return 'index';
        return null;
    }

    const activeResult = getActiveSiteContent();
    let content = activeResult.content;
    const previewing = activeResult.previewing;
    let settings = {};

    function syncGlobalSettings(nextContent) {
        content = nextContent || { settings: {}, homeSlides: null, pages: {} };
        global.PACTFORM_SITE_CONTENT = content;
        global.PACTFORM_PAGE_SCHEMA = PAGE_SCHEMA;
        settings = content.settings || {};
        const rawWa = String(settings.whatsappNumber || '').trim();
        const digitsWa = rawWa && !/x/i.test(rawWa) ? rawWa.replace(/[^\d]/g, '') : '';
        if (digitsWa.length >= 7) {
            global.PACTFORM_WA_NUMBER = digitsWa;
        }
        if (settings.formspreeEndpoint || settings.web3formsAccessKey) {
            global.PACTFORM_UPDATES_CONFIG = {
                FORMSPREE_ENDPOINT: settings.formspreeEndpoint || '',
                WEB3FORMS_ACCESS_KEY: settings.web3formsAccessKey || ''
            };
        }
    }

    syncGlobalSettings(content);

    function loadStagedUploadsFromIDB() {
        return new Promise((resolve) => {
            if (!global.indexedDB) { resolve(new Map()); return; }
            try {
                const req = global.indexedDB.open('pactform-admin-studio', 1);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('uploads')) {
                        db.createObjectStore('uploads', { keyPath: 'path' });
                    }
                };
                req.onsuccess = () => {
                    try {
                        const db = req.result;
                        if (!db.objectStoreNames.contains('uploads')) { db.close(); resolve(new Map()); return; }
                        const tx = db.transaction('uploads', 'readonly');
                        const getAll = tx.objectStore('uploads').getAll();
                        getAll.onsuccess = () => {
                            const map = new Map();
                            (getAll.result || []).forEach(rec => {
                                if (rec && rec.path && rec.dataUrl) map.set(rec.path, rec.dataUrl);
                            });
                            db.close();
                            resolve(map);
                        };
                        getAll.onerror = () => { db.close(); resolve(new Map()); };
                    } catch (e) { resolve(new Map()); }
                };
                req.onerror = () => resolve(new Map());
            } catch (e) { resolve(new Map()); }
        });
    }

    function enableStagedImagePreview() {
        loadStagedUploadsFromIDB().then((stagedMap) => {
            if (!stagedMap.size) return;
            const applyImg = (img) => {
                const rawSrc = img.getAttribute('src');
                if (rawSrc && stagedMap.has(rawSrc)) {
                    img.dataset.pfOrigSrc = rawSrc;
                    img.src = stagedMap.get(rawSrc);
                }
            };
            const scan = (root) => {
                if (!root || !root.querySelectorAll) return;
                if (root.tagName === 'IMG') applyImg(root);
                root.querySelectorAll('img[src]').forEach(applyImg);
            };
            scan(document.body);
            if (typeof MutationObserver !== 'undefined' && document.body) {
                const obs = new MutationObserver((muts) => {
                    muts.forEach(m => {
                        if (m.type === 'attributes' && m.target.tagName === 'IMG') {
                            applyImg(m.target);
                        } else if (m.addedNodes && m.addedNodes.length) {
                            m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); });
                        }
                    });
                });
                obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
            }
        });
    }

    function applyToDOM() {
        if (isAdminStudio) return;

        const waNum = (global.PACTFORM_WA_NUMBER && /^\d{7,16}$/.test(String(global.PACTFORM_WA_NUMBER)))
            ? String(global.PACTFORM_WA_NUMBER)
            : '';

        // 1. Apply global WhatsApp number to sticky button, ask-piece link, drawer & WhatsApp CTA links
        if (waNum) {
            const encodedWa = encodeURIComponent(waNum);
            document.querySelectorAll('a[href]').forEach(a => {
                const rawHref = (a.getAttribute('href') || '').trim();
                if (/^https?:\/\/wa\.me\//i.test(rawHref)) {
                    const qIdx = rawHref.indexOf('?');
                    const query = qIdx >= 0 ? rawHref.slice(qIdx) : '';
                    a.href = 'https://wa.me/' + encodedWa + query;
                } else if (rawHref === '#' && /whatsapp/i.test(a.textContent || '')) {
                    a.href = 'https://wa.me/' + encodedWa;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                }
            });
        }

        // 2. Apply Footer global settings
        if (settings.contactSalesHref) {
            document.querySelectorAll('footer .footer-contact a.btn-primary').forEach(a => {
                a.href = settings.contactSalesHref;
            });
        }
        if (settings.footerTagline) {
            const el = document.querySelector('footer .footer-info p:not(.footer-sub)');
            if (el) el.textContent = settings.footerTagline;
        }
        if (settings.footerSub) {
            const el = document.querySelector('footer .footer-info p.footer-sub');
            if (el) el.textContent = settings.footerSub;
        }
        if (settings.footerContactText) {
            const el = document.querySelector('footer .footer-contact p.footer-sub');
            if (el) el.textContent = settings.footerContactText;
        }
        if (settings.footerCopyright) {
            const el = document.querySelector('footer .footer-bottom p');
            if (el) el.textContent = settings.footerCopyright;
        }

        // 3. Apply per-page copywriting & image overrides
        const pageKey = detectPageKey();
        const schema = pageKey && PAGE_SCHEMA[pageKey];
        const overrides = (content.pages && pageKey && content.pages[pageKey]) || {};
        if (schema) {
            schema.fields.forEach(f => {
                const val = overrides[f.key];
                if (typeof val !== 'string' || !val.trim()) return;
                const el = document.querySelector(f.selector);
                if (!el) return;
                if (f.type === 'image') {
                    el.src = val.trim();
                } else if (f.htmlBreaks) {
                    el.innerHTML = val
                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/\r?\n/g, '<br>');
                } else {
                    el.textContent = val;
                }
            });
        }

        // Notify other scripts (e.g. your-list.js, product.html) that site settings are ready
        try {
            global.dispatchEvent(new CustomEvent('pactform:site-content-ready', { detail: content }));
        } catch (e) {}

        // 4. Hydrate staged image uploads during preview mode & show preview bar
        const isAnyPreview = previewing || Boolean(global.PactformCatalog && global.PactformCatalog.isPreview && global.PactformCatalog.isPreview());
        if (isAnyPreview) {
            enableStagedImagePreview();
        }
        if (previewing && document.body && !document.getElementById('pf-preview-banner')) {
            const bar = document.createElement('div');
            bar.id = 'pf-preview-banner';
            bar.setAttribute('role', 'status');
            bar.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:9999;display:flex;align-items:center;gap:14px;padding:10px 14px;background:#1a1a1a;color:#fff;font:600 12px/1.3 "Plus Jakarta Sans",Arial,sans-serif;letter-spacing:.04em;border-left:3px solid #ff4400;';
            const label = document.createElement('span');
            label.textContent = 'ADMIN DRAFT PREVIEW';
            const exit = document.createElement('button');
            exit.type = 'button';
            exit.textContent = 'Exit preview';
            exit.style.cssText = 'background:none;border:1px solid rgba(255,255,255,.5);color:#fff;padding:5px 10px;font:inherit;cursor:pointer;';
            exit.addEventListener('click', () => {
                try { localStorage.removeItem(PREVIEW_KEY); } catch (e) {}
                global.location.reload();
            });
            bar.appendChild(label);
            bar.appendChild(exit);
            document.body.appendChild(bar);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyToDOM);
    } else {
        applyToDOM();
    }

    // Background freshness check for site-content.js (bypasses 10-min GitHub Pages JS cache)
    if (!isAdminStudio && !previewing && typeof fetch === 'function' && global.location && /^https?:$/i.test(global.location.protocol || '')) {
        fetch('site-content.js?_=' + Date.now(), { cache: 'no-store' })
            .then(res => (res.ok ? res.text() : ''))
            .then(text => {
                const m = text && text.match(/\/\*\s*PACTFORM_SITE:BEGIN\s*\*\/([\s\S]*?)\/\*\s*PACTFORM_SITE:END\s*\*\//);
                if (!m) return;
                const body = m[1].trim().replace(/^window\.PACTFORM_SITE_CONTENT\s*=\s*/, '').replace(/;\s*$/, '');
                const fresh = JSON.parse(body);
                if (fresh && fresh.updatedAt && fresh.updatedAt !== content.updatedAt) {
                    syncGlobalSettings(fresh);
                    applyToDOM();
                }
            })
            .catch(() => {});
    }
})(window);
