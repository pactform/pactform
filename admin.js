/* ==========================================================================
   admin.js
   Pactform Admin Studio — Complete client-side CMS for GitHub Pages & local dev.
   Manages Products, Collections, Filters & Tags, Home Hero Slides, Page
   Copywriting, Site Settings, Draft Preview, Local Folder Save & GitHub Publish.
   ========================================================================== */
(function (global) {
    'use strict';

    const DRAFT_CATALOG_KEY = 'pactform-admin-draft';
    const DRAFT_SITE_KEY = 'pactform-admin-site-draft';
    const PREVIEW_KEY = 'pactform-admin-preview';
    const GH_TOKEN_KEY = 'pactform-admin-gh-token';

    const DEFAULT_HOME_SLIDES = [
        {
            title: 'International Furniture for Hospitality & Commercial Spaces',
            mobileTitle: 'Furniture for hospitality & commercial spaces.',
            text: 'Pactform provides curated furniture collections and project furnishing solutions for restaurants, hotels and commercial interiors worldwide.',
            mobileText: 'Curated collections and project furnishing for hotels, restaurants, and commercial interiors worldwide.',
            image: 'Slide 1.png',
            mobilePos: '62% 55%',
            btn1Text: 'Explore collections',
            btn1Link: 'collection.html',
            btn2Text: 'Start a project',
            btn2Link: 'projects.html'
        },
        {
            title: 'Short-Lead-Time Furniture for Restaurants',
            mobileTitle: 'Short-lead-time furniture for restaurants.',
            text: 'Dining chairs, tables, bar stools and custom restaurant furniture coordinated around clear production and delivery schedules for openings, renovations and rollouts.',
            mobileText: '',
            image: 'Slide 2.png',
            mobilePos: 'center center',
            btn1Text: 'Explore restaurant furniture',
            btn1Link: 'collection.html',
            btn2Text: 'Start a project',
            btn2Link: 'projects.html'
        },
        {
            title: 'Indonesian Rattan, Shaped by Skilled Hands',
            mobileTitle: 'Indonesian rattan, shaped by skilled hands.',
            text: 'We work with selected artisans to create distinctive rattan furniture under our specifications and quality controls.',
            mobileText: '',
            image: 'Slide 3.png',
            mobilePos: 'center center',
            btn1Text: 'Discover rattan',
            btn1Link: 'collection.html',
            btn2Text: 'Start a project',
            btn2Link: 'projects.html'
        },
        {
            title: "When the Right Piece Doesn't Exist Yet",
            mobileTitle: "When the right piece doesn't exist yet.",
            text: 'Bring us a drawing, reference or idea. We can adapt the dimensions, materials and finishes, or develop a piece around your brief.',
            mobileText: '',
            image: 'Slide 4.png',
            mobilePos: 'center center',
            btn1Text: 'Start a custom piece',
            btn1Link: 'custom.html',
            btn2Text: 'Start a project',
            btn2Link: 'projects.html'
        },
        {
            title: 'Distinctive Contract Furniture Beyond Standard Catalogues',
            mobileTitle: 'Distinctive contract furniture beyond catalogues.',
            text: 'Furniture should do more than survive the room. It should help define it, through an unexpected line, a tactile material or a detail people remember. We uphold consistency in production quality across every project to ensure this impression is always conveyed to our customers and end-users.',
            mobileText: 'Furniture should do more than survive the room. It should help define it, through an unexpected line, a tactile material or a detail people remember.',
            image: 'Slide 5.png',
            mobilePos: 'center center',
            btn1Text: 'See what sets us apart',
            btn1Link: 'collection.html',
            btn2Text: 'Start a project',
            btn2Link: 'projects.html'
        }
    ];

    const GROUPS = [
        { key: 'space', label: 'Browse by Space' },
        { key: 'chairs', label: 'Chairs' },
        { key: 'tables', label: 'Tables' },
        { key: 'storage', label: 'Storage' }
    ];

    const PRODUCT_TYPES = [
        'Dining Chairs', 'Lounge Chairs', 'Meeting Chairs', 'Bar Stools',
        'Booth Seating', 'Dining Tables', 'Coffee Tables', 'Side Tables',
        'Outdoor Tables', 'Storage'
    ];

    const LOCATIONS = ['Indoor', 'Covered Outdoor', 'Outdoor'];

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function slugify(str) {
        return String(str || '').toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || ('item-' + Date.now());
    }

    // Read base published snapshot BEFORE draft override
    const PUBLISHED_CATALOG = deepClone(global.PACTFORM_DATA || { version: 1, categories: [], products: [], filters: [] });
    const PUBLISHED_SITE = deepClone(global.PACTFORM_SITE_CONTENT || { version: 1, settings: {}, homeSlides: null, pages: {} });

    let catalogState = loadInitialState(DRAFT_CATALOG_KEY, PUBLISHED_CATALOG);
    let siteState = loadInitialState(DRAFT_SITE_KEY, PUBLISHED_SITE);
    ensureStateShapes();

    // Map of newly uploaded images staged for folder save / GitHub publish: path -> { dataUrl, base64, mime }
    const stagedUploads = new Map();

    // Cache of extracted original page copy from HTML files
    const pageDefaultsCache = {};
    let activeTab = 'overview';
    let activePageKey = 'index';
    let isDirty = hasLocalDraft();

    function loadInitialState(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch (e) {}
        return deepClone(fallback);
    }

    function hasLocalDraft() {
        try {
            return Boolean(localStorage.getItem(DRAFT_CATALOG_KEY) || localStorage.getItem(DRAFT_SITE_KEY));
        } catch (e) { return false; }
    }

    function ensureStateShapes() {
        if (!Array.isArray(catalogState.categories)) catalogState.categories = [];
        if (!Array.isArray(catalogState.products)) catalogState.products = [];
        if (!Array.isArray(catalogState.filters) || !catalogState.filters.length) {
            catalogState.filters = [
                { key: 'productType', label: 'Product Type', field: 'productType', enabled: true },
                { key: 'material', label: 'Material', field: 'materials', enabled: true },
                { key: 'style', label: 'Design Character', field: 'styles', enabled: true },
                { key: 'setting', label: 'Project Setting', field: 'settings', enabled: true },
                { key: 'location', label: 'Indoor / Outdoor', field: 'location', enabled: true },
                { key: 'feature', label: 'Features', field: 'features', enabled: false }
            ];
        }
        if (!siteState.settings || typeof siteState.settings !== 'object') siteState.settings = {};
        if (!siteState.pages || typeof siteState.pages !== 'object') siteState.pages = {};
        Object.keys(global.PACTFORM_PAGE_SCHEMA || {}).forEach(k => {
            if (!siteState.pages[k] || typeof siteState.pages[k] !== 'object') siteState.pages[k] = {};
        });
    }

    function saveDraft(silent) {
        catalogState.updatedAt = new Date().toISOString();
        siteState.updatedAt = new Date().toISOString();
        isDirty = true;
        try {
            localStorage.setItem(DRAFT_CATALOG_KEY, JSON.stringify(catalogState));
            localStorage.setItem(DRAFT_SITE_KEY, JSON.stringify(siteState));
        } catch (e) {
            toast('Warning: Browser localStorage is full. Download or publish your files now.');
        }
        updateShellCounters();
        if (!silent) toast('Draft saved locally');
    }

    let toastTimer = null;
    function toast(msg) {
        const el = document.getElementById('adm-toast');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
    }

    function resolvePreviewImg(path) {
        if (!path) return '';
        if (stagedUploads.has(path)) return stagedUploads.get(path).dataUrl;
        return path;
    }

    function getAllUniqueValues(field) {
        const counts = new Map();
        catalogState.products.forEach(p => {
            const arr = Array.isArray(p[field]) ? p[field] : (p[field] ? [p[field]] : []);
            arr.forEach(v => {
                const s = String(v || '').trim();
                if (!s) return;
                counts.set(s, (counts.get(s) || 0) + 1);
            });
        });
        return Array.from(counts.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    }

    function getCategoryProductCount(slug) {
        return catalogState.products.filter(p => p.published !== false && Array.isArray(p.categories) && p.categories.includes(slug)).length;
    }

    /* ======================================================================
       SHELL, NAVIGATION & TOPBAR
       ====================================================================== */
    const TAB_TITLES = {
        overview: 'Overview',
        products: 'Products',
        categories: 'Collections',
        filters: 'Filters & Tags',
        slides: 'Home Hero Slides',
        pages: 'Pages & Copywriting',
        settings: 'Site Settings',
        publish: 'Publish & Backup'
    };

    function updateShellCounters() {
        const elP = document.getElementById('nav-count-products');
        const elC = document.getElementById('nav-count-categories');
        const elF = document.getElementById('nav-count-filters');
        const elS = document.getElementById('nav-count-slides');
        const pill = document.getElementById('adm-status-pill');

        if (elP) elP.textContent = String(catalogState.products.length);
        if (elC) elC.textContent = String(catalogState.categories.length);
        if (elF) elF.textContent = String(catalogState.filters.filter(f => f.enabled).length);
        if (elS) elS.textContent = String((siteState.homeSlides || DEFAULT_HOME_SLIDES).length);
        if (pill) {
            pill.textContent = isDirty ? 'Draft Modified' : 'Synced';
            pill.classList.toggle('is-dirty', isDirty);
        }
        const upNote = document.getElementById('pending-uploads-note');
        if (upNote) {
            upNote.textContent = stagedUploads.size > 0
                ? 'Note: You have ' + stagedUploads.size + ' newly uploaded image file(s) staged. Use "Publish to GitHub" or "Save to Local Project Folder" to write the image files automatically.'
                : 'No pending local image uploads.';
        }
    }

    function switchTab(tab) {
        activeTab = tab;
        document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
        document.querySelectorAll('.adm-view').forEach(v => v.classList.toggle('hidden', v.id !== 'view-' + tab));
        document.getElementById('adm-page-title').textContent = TAB_TITLES[tab] || 'Admin Studio';
        document.getElementById('adm-sidebar').classList.remove('is-open');

        if (tab === 'overview') renderOverview();
        else if (tab === 'products') renderProductsTable();
        else if (tab === 'categories') renderCategoriesView();
        else if (tab === 'filters') renderFiltersView();
        else if (tab === 'slides') renderSlidesView();
        else if (tab === 'pages') renderPagesView();
        else if (tab === 'settings') renderSettingsView();
        else if (tab === 'publish') updateShellCounters();
    }

    /* ======================================================================
       1. OVERVIEW TAB
       ====================================================================== */
    function renderOverview() {
        const totalProds = catalogState.products.length;
        const pubProds = catalogState.products.filter(p => p.published !== false).length;
        const hiddenProds = totalProds - pubProds;
        const noPhotos = catalogState.products.filter(p => !p.images || p.images.length === 0).length;
        const noCats = catalogState.products.filter(p => !p.categories || p.categories.length === 0).length;
        const visibleCats = catalogState.categories.filter(c => !c.hidden).length;

        let copyOverrides = 0;
        Object.values(siteState.pages || {}).forEach(pg => {
            Object.values(pg || {}).forEach(v => { if (typeof v === 'string' && v.trim()) copyOverrides++; });
        });

        document.getElementById('overview-stats').innerHTML =
            '<div class="adm-stat-card"><div class="adm-stat-label">Published Products</div><div class="adm-stat-value">' + pubProds + '</div><div class="adm-stat-sub">' + hiddenProds + ' hidden / ' + totalProds + ' total</div></div>' +
            '<div class="adm-stat-card"><div class="adm-stat-label">Collections</div><div class="adm-stat-value">' + visibleCats + '</div><div class="adm-stat-sub">Across 4 groups (Space, Chairs, Tables, Storage)</div></div>' +
            '<div class="adm-stat-card"><div class="adm-stat-label">Active Filters</div><div class="adm-stat-value">' + catalogState.filters.filter(f => f.enabled).length + '</div><div class="adm-stat-sub">Dynamic category-aware facets</div></div>' +
            '<div class="adm-stat-card"><div class="adm-stat-label">Page Copy Edits</div><div class="adm-stat-value">' + copyOverrides + '</div><div class="adm-stat-sub">' + (siteState.homeSlides ? 'Custom hero slides active' : 'Default 5 hero slides') + '</div></div>';

        const healthEl = document.getElementById('overview-health');
        const items = [];
        if (noPhotos > 0) {
            items.push('<div class="adm-tag-row"><span><strong>' + noPhotos + ' product(s)</strong> currently have no photos assigned.</span><button type="button" class="adm-btn adm-btn-sm" data-health-filter="nophoto">Review</button></div>');
        }
        if (noCats > 0) {
            items.push('<div class="adm-tag-row"><span><strong>' + noCats + ' product(s)</strong> are not assigned to any collection category yet.</span><button type="button" class="adm-btn adm-btn-sm" data-health-filter="all">Open Products</button></div>');
        }
        const wa = (siteState.settings && siteState.settings.whatsappNumber) || '';
        if (!wa || /x/i.test(wa)) {
            items.push('<div class="adm-tag-row"><span>WhatsApp number is still a placeholder (<code>' + esc(wa || '62xxxxxxxxxx') + '</code>).</span><button type="button" class="adm-btn adm-btn-sm" data-jump-tab="settings">Set Number</button></div>');
        }
        if (!siteState.settings.web3formsAccessKey && !siteState.settings.formspreeEndpoint) {
            items.push('<div class="adm-tag-row"><span><strong>Get Product Updates</strong> email modal is in preview mode (no Web3Forms key / Formspree URL set yet).</span><button type="button" class="adm-btn adm-btn-sm" data-jump-tab="settings">Configure</button></div>');
        }

        healthEl.innerHTML = items.length ? items.join('') : '<p class="adm-hint">Everything looks healthy and complete.</p>';
        healthEl.querySelectorAll('[data-health-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('prod-filter-status').value = btn.dataset.healthFilter === 'nophoto' ? 'nophoto' : '';
                switchTab('products');
            });
        });
        healthEl.querySelectorAll('[data-jump-tab]').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.jumpTab));
        });
    }

    /* ======================================================================
       2. PRODUCTS TAB + SLIDE-OVER PRODUCT EDITOR
       ====================================================================== */
    function populateProductFilterDropdowns() {
        const catSel = document.getElementById('prod-filter-cat');
        const typeSel = document.getElementById('prod-filter-type');
        const curCat = catSel.value;
        const curType = typeSel.value;

        catSel.innerHTML = '<option value="">All Categories</option>' +
            catalogState.categories.map(c => '<option value="' + esc(c.slug) + '">' + esc(c.name) + '</option>').join('');
        catSel.value = curCat;

        const types = Array.from(new Set(PRODUCT_TYPES.concat(catalogState.products.map(p => p.productType).filter(Boolean)))).sort();
        typeSel.innerHTML = '<option value="">All Product Types</option>' +
            types.map(t => '<option value="' + esc(t) + '">' + esc(t) + '</option>').join('');
        typeSel.value = curType;
    }

    function renderProductsTable() {
        populateProductFilterDropdowns();
        const q = (document.getElementById('prod-search').value || '').trim().toLowerCase();
        const catFilter = document.getElementById('prod-filter-cat').value;
        const typeFilter = document.getElementById('prod-filter-type').value;
        const statusFilter = document.getElementById('prod-filter-status').value;

        const catNameMap = {};
        catalogState.categories.forEach(c => { catNameMap[c.slug] = c.name; });

        const list = catalogState.products.filter(p => {
            if (q) {
                const hay = [p.name, p.id, p.code, p.productType, p.location, p.materialsText, p.goodFor]
                    .concat(p.materials || [], p.styles || [], p.settings || []).join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (catFilter && !(p.categories || []).includes(catFilter)) return false;
            if (typeFilter && p.productType !== typeFilter) return false;
            if (statusFilter === 'published' && p.published === false) return false;
            if (statusFilter === 'hidden' && p.published !== false) return false;
            if (statusFilter === 'nophoto' && p.images && p.images.length > 0) return false;
            return true;
        });

        document.getElementById('prod-count-label').textContent = 'Showing ' + list.length + ' of ' + catalogState.products.length + ' products';

        const tbody = document.getElementById('prod-table-body');
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:#5f5a53;">No products match your filter.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(p => {
            const thumb = p.images && p.images[0]
                ? '<img class="adm-thumb" src="' + esc(resolvePreviewImg(p.images[0])) + '" alt="" loading="lazy">'
                : '<div class="adm-thumb-empty">No photo</div>';
            const catsHtml = (p.categories || []).slice(0, 4).map(s => '<span class="adm-tag">' + esc(catNameMap[s] || s) + '</span>').join('') +
                ((p.categories || []).length > 4 ? '<span class="adm-tag">+' + (p.categories.length - 4) + '</span>' : '');
            const statusHtml = p.published === false
                ? '<span class="adm-badge-hidden">Hidden</span>'
                : '<span class="adm-badge-pub">Published</span>';

            return '<tr data-pid="' + esc(p.id) + '">' +
                '<td>' + thumb + '</td>' +
                '<td><div class="adm-cell-title">' + esc(p.name) + '</div><div class="adm-cell-sub">' + esc(p.id) + (p.images ? ' · ' + p.images.length + ' photos' : '') + '</div></td>' +
                '<td><div>' + esc(p.productType || '—') + '</div><div class="adm-cell-sub">' + esc(p.location || '—') + '</div></td>' +
                '<td><div class="adm-tag-list">' + (catsHtml || '<span class="adm-cell-sub">None</span>') + '</div></td>' +
                '<td>' + statusHtml + '</td>' +
                '<td><div class="adm-row-actions">' +
                    '<button type="button" class="adm-btn adm-btn-sm" data-act="edit">Edit</button>' +
                    '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-act="dup" title="Duplicate">Copy</button>' +
                    '<button type="button" class="adm-btn adm-btn-danger adm-btn-sm" data-act="del">Del</button>' +
                '</div></td>' +
            '</tr>';
        }).join('');
    }

    function openProductDrawer(productId) {
        const isNew = !productId;
        const orig = isNew ? null : catalogState.products.find(p => p.id === productId);
        const draft = orig ? deepClone(orig) : {
            id: '',
            legacyKey: '',
            code: '',
            name: '',
            categories: [],
            productType: 'Dining Chairs',
            location: 'Indoor',
            materials: [],
            styles: [],
            settings: [],
            features: [],
            desc: '',
            dims: '',
            materialsText: '',
            goodFor: '',
            images: [],
            captions: [],
            published: true,
            hasPhotos: false,
            flags: []
        };

        const allMats = Array.from(new Set(getAllUniqueValues('materials').map(x => x.value).concat(draft.materials || [])));
        const allStyles = Array.from(new Set(getAllUniqueValues('styles').map(x => x.value).concat(draft.styles || [])));
        const allSettings = Array.from(new Set(getAllUniqueValues('settings').map(x => x.value).concat(draft.settings || [])));
        const allFeatures = Array.from(new Set(['Stackable', 'Fire-rated Foam', 'Weather-resistant'].concat(getAllUniqueValues('features').map(x => x.value), draft.features || [])));

        function renderChipsHtml(groupName, values, selectedArr) {
            const selSet = new Set(selectedArr || []);
            return values.map(v => {
                const checked = selSet.has(v);
                return '<label class="adm-check-chip' + (checked ? ' is-checked' : '') + '">' +
                    '<input type="checkbox" data-chip-group="' + esc(groupName) + '" value="' + esc(v) + '"' + (checked ? ' checked' : '') + '>' +
                    '<span>' + esc(v) + '</span>' +
                '</label>';
            }).join('');
        }

        const catGroupsHtml = GROUPS.map(g => {
            const cats = catalogState.categories.filter(c => c.group === g.key);
            if (!cats.length) return '';
            return '<div style="margin-bottom:10px;"><div class="adm-hint" style="margin-bottom:6px;font-weight:700;text-transform:uppercase;font-size:0.68rem;">' + esc(g.label) + '</div>' +
                '<div class="adm-checkbox-group">' +
                cats.map(c => {
                    const checked = (draft.categories || []).includes(c.slug);
                    return '<label class="adm-check-chip' + (checked ? ' is-checked' : '') + '">' +
                        '<input type="checkbox" data-cat-slug value="' + esc(c.slug) + '"' + (checked ? ' checked' : '') + '>' +
                        '<span>' + esc(c.name) + '</span>' +
                    '</label>';
                }).join('') +
            '</div></div>';
        }).join('');

        const bodyHtml =
            '<div class="adm-section-divider">Basic Information</div>' +
            '<div class="adm-form-grid">' +
                '<div class="adm-field"><label class="adm-label">Product Name *</label><input type="text" class="adm-input" id="pe-name" value="' + esc(draft.name) + '" placeholder="e.g. Chair 1211 - 1220"></div>' +
                '<div class="adm-field"><label class="adm-label">Product ID (URL Slug) *</label><input type="text" class="adm-input" id="pe-id" value="' + esc(draft.id) + '" placeholder="auto-generated-from-name"></div>' +
                '<div class="adm-field"><label class="adm-label">Reference Code</label><input type="text" class="adm-input" id="pe-code" value="' + esc(draft.code) + '" placeholder="e.g. 1211 - 1220"></div>' +
                '<div class="adm-field"><label class="adm-label">Visibility</label><label class="adm-check-chip' + (draft.published !== false ? ' is-checked' : '') + '" style="width:fit-content;"><input type="checkbox" id="pe-published"' + (draft.published !== false ? ' checked' : '') + '><span>Published on website</span></label></div>' +
            '</div>' +

            '<div class="adm-section-divider">Collections (Multi-Category)</div>' +
            catGroupsHtml +

            '<div class="adm-section-divider">Classification &amp; Filters</div>' +
            '<div class="adm-form-grid">' +
                '<div class="adm-field"><label class="adm-label">Product Type</label>' +
                    '<input type="text" class="adm-input" id="pe-type" list="pe-type-list" value="' + esc(draft.productType) + '">' +
                    '<datalist id="pe-type-list">' + PRODUCT_TYPES.map(t => '<option value="' + esc(t) + '">').join('') + '</datalist>' +
                '</div>' +
                '<div class="adm-field"><label class="adm-label">Indoor / Outdoor</label>' +
                    '<select class="adm-select" id="pe-location">' +
                        LOCATIONS.map(l => '<option value="' + esc(l) + '"' + (draft.location === l ? ' selected' : '') + '>' + esc(l) + '</option>').join('') +
                    '</select>' +
                '</div>' +
                '<div class="adm-field full"><label class="adm-label">Materials</label><div class="adm-checkbox-group" id="pe-mats-wrap">' + renderChipsHtml('materials', allMats, draft.materials) + '</div>' +
                    '<div class="adm-inline-add"><input type="text" class="adm-input" id="pe-add-mat" placeholder="Add new material (e.g. Teak, Marble)..."><button type="button" class="adm-btn adm-btn-sm" data-add-chip="materials" data-input="pe-add-mat" data-wrap="pe-mats-wrap">+ Add</button></div>' +
                '</div>' +
                '<div class="adm-field full"><label class="adm-label">Design Character</label><div class="adm-checkbox-group" id="pe-styles-wrap">' + renderChipsHtml('styles', allStyles, draft.styles) + '</div>' +
                    '<div class="adm-inline-add"><input type="text" class="adm-input" id="pe-add-style" placeholder="Add new design character..."><button type="button" class="adm-btn adm-btn-sm" data-add-chip="styles" data-input="pe-add-style" data-wrap="pe-styles-wrap">+ Add</button></div>' +
                '</div>' +
                '<div class="adm-field full"><label class="adm-label">Project Setting</label><div class="adm-checkbox-group" id="pe-settings-wrap">' + renderChipsHtml('settings', allSettings, draft.settings) + '</div>' +
                    '<div class="adm-inline-add"><input type="text" class="adm-input" id="pe-add-setting" placeholder="Add new project setting..."><button type="button" class="adm-btn adm-btn-sm" data-add-chip="settings" data-input="pe-add-setting" data-wrap="pe-settings-wrap">+ Add</button></div>' +
                '</div>' +
                '<div class="adm-field full"><label class="adm-label">Features</label><div class="adm-checkbox-group" id="pe-features-wrap">' + renderChipsHtml('features', allFeatures, draft.features) + '</div></div>' +
            '</div>' +

            '<div class="adm-section-divider">Product Details &amp; Specifications</div>' +
            '<div class="adm-form-grid">' +
                '<div class="adm-field full"><label class="adm-label">Description</label><textarea class="adm-textarea" id="pe-desc" placeholder="Short architectural product description...">' + esc(draft.desc) + '</textarea></div>' +
                '<div class="adm-field"><label class="adm-label">Rough Dimensions</label><input type="text" class="adm-input" id="pe-dims" value="' + esc(draft.dims) + '" placeholder="approx. W450 x D520 x H820 mm"></div>' +
                '<div class="adm-field"><label class="adm-label">Materials Summary (Spec Table)</label><input type="text" class="adm-input" id="pe-mattext" value="' + esc(draft.materialsText) + '" placeholder="Leave blank to auto-sync from selected Materials"></div>' +
                '<div class="adm-field full"><label class="adm-label">Good For (Spec Table)</label><input type="text" class="adm-input" id="pe-goodfor" value="' + esc(draft.goodFor) + '" placeholder="Leave blank to auto-sync from selected Project Settings"></div>' +
            '</div>' +

            '<div class="adm-section-divider">Product Photos &amp; Angle Captions</div>' +
            '<div class="adm-gallery-list" id="pe-gallery-list"></div>' +
            '<div class="adm-toolbar-group">' +
                '<input type="text" class="adm-input" id="pe-add-img-path" placeholder="Add existing photo path (e.g. dining/foto1.webp)" style="flex:1 1 240px;">' +
                '<button type="button" class="adm-btn adm-btn-sm" id="pe-btn-add-img-path">+ Add Path</button>' +
                '<label class="adm-btn adm-btn-dark adm-btn-sm" style="cursor:pointer;">Upload Photo(s)<input type="file" id="pe-upload-imgs" accept="image/*" multiple style="display:none;"></label>' +
            '</div>';

        const footHtml =
            '<div class="adm-toolbar-group">' +
                (!isNew ? '<button type="button" class="adm-btn adm-btn-danger adm-btn-sm" id="pe-btn-delete">Delete Product</button>' : '') +
            '</div>' +
            '<div class="adm-toolbar-group">' +
                '<button type="button" class="adm-btn adm-btn-ghost" id="pe-btn-cancel">Cancel</button>' +
                '<button type="button" class="adm-btn adm-btn-primary" id="pe-btn-save">' + (isNew ? 'Create Product' : 'Save Product') + '</button>' +
            '</div>';

        openDrawer(isNew ? 'Add New Product' : ('Edit: ' + draft.name), bodyHtml, footHtml);

        const bodyEl = document.getElementById('adm-drawer-body');
        const galleryEl = document.getElementById('pe-gallery-list');

        // Auto-slugify ID for new products
        const nameInput = document.getElementById('pe-name');
        const idInput = document.getElementById('pe-id');
        if (isNew) {
            let manualId = false;
            idInput.addEventListener('input', () => { manualId = true; });
            nameInput.addEventListener('input', () => { if (!manualId) idInput.value = slugify(nameInput.value); });
        }

        // Toggle chip highlight
        bodyEl.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.closest('.adm-check-chip')) {
                e.target.closest('.adm-check-chip').classList.toggle('is-checked', e.target.checked);
            }
        });

        // Add custom chip buttons
        bodyEl.querySelectorAll('[data-add-chip]').forEach(btn => {
            btn.addEventListener('click', () => {
                const inp = document.getElementById(btn.dataset.input);
                const wrap = document.getElementById(btn.dataset.wrap);
                const val = (inp.value || '').trim();
                if (!val) return;
                const lbl = document.createElement('label');
                lbl.className = 'adm-check-chip is-checked';
                lbl.innerHTML = '<input type="checkbox" data-chip-group="' + esc(btn.dataset.addChip) + '" value="' + esc(val) + '" checked><span>' + esc(val) + '</span>';
                wrap.appendChild(lbl);
                inp.value = '';
            });
        });

        // Gallery state & renderer
        let gallery = (draft.images || []).map((img, i) => ({
            img: img,
            caption: (draft.captions && draft.captions[i]) || ''
        }));

        function renderGallery() {
            if (!gallery.length) {
                galleryEl.innerHTML = '<p class="adm-hint">No photos yet. Add a path or upload images below.</p>';
                return;
            }
            galleryEl.innerHTML = gallery.map((g, i) =>
                '<div class="adm-gallery-item" data-gi="' + i + '">' +
                    '<img src="' + esc(resolvePreviewImg(g.img)) + '" alt="">' +
                    '<div class="adm-gallery-inputs">' +
                        '<input type="text" class="adm-input" data-gfield="img" value="' + esc(g.img) + '" placeholder="Image path">' +
                        '<input type="text" class="adm-input" data-gfield="caption" value="' + esc(g.caption) + '" placeholder="Optional angle caption">' +
                    '</div>' +
                    '<div class="adm-row-actions">' +
                        '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-gact="up"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
                        '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-gact="down"' + (i === gallery.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
                        '<button type="button" class="adm-btn adm-btn-danger adm-btn-sm" data-gact="rm">&times;</button>' +
                    '</div>' +
                '</div>'
            ).join('');
        }
        renderGallery();

        galleryEl.addEventListener('input', (e) => {
            const row = e.target.closest('.adm-gallery-item');
            if (!row) return;
            const i = Number(row.dataset.gi);
            gallery[i][e.target.dataset.gfield] = e.target.value;
        });

        galleryEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-gact]');
            if (!btn) return;
            const i = Number(btn.closest('.adm-gallery-item').dataset.gi);
            const act = btn.dataset.gact;
            if (act === 'rm') gallery.splice(i, 1);
            else if (act === 'up' && i > 0) { const tmp = gallery[i - 1]; gallery[i - 1] = gallery[i]; gallery[i] = tmp; }
            else if (act === 'down' && i < gallery.length - 1) { const tmp = gallery[i + 1]; gallery[i + 1] = gallery[i]; gallery[i] = tmp; }
            renderGallery();
        });

        document.getElementById('pe-btn-add-img-path').addEventListener('click', () => {
            const inp = document.getElementById('pe-add-img-path');
            const val = (inp.value || '').trim();
            if (!val) return;
            gallery.push({ img: val, caption: '' });
            inp.value = '';
            renderGallery();
        });

        document.getElementById('pe-upload-imgs').addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            const folder = slugify(idInput.value || nameInput.value || 'new-piece');
            for (const file of files) {
                const dataUrl = await readFileAsDataUrl(file);
                const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
                const relPath = 'uploads/' + folder + '/' + cleanName;
                stagedUploads.set(relPath, {
                    dataUrl: dataUrl,
                    base64: dataUrl.split(',')[1] || '',
                    mime: file.type || 'image/webp'
                });
                gallery.push({ img: relPath, caption: '' });
            }
            e.target.value = '';
            renderGallery();
            updateShellCounters();
            toast('Added ' + files.length + ' photo(s) to gallery');
        });

        document.getElementById('pe-btn-cancel').addEventListener('click', closeDrawer);

        const delBtn = document.getElementById('pe-btn-delete');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                if (!confirm('Delete "' + draft.name + '" permanently from the draft?')) return;
                catalogState.products = catalogState.products.filter(p => p.id !== orig.id);
                saveDraft();
                closeDrawer();
                renderProductsTable();
            });
        }

        document.getElementById('pe-btn-save').addEventListener('click', () => {
            const name = nameInput.value.trim();
            const id = slugify(idInput.value.trim() || name);
            if (!name) { alert('Product Name is required.'); nameInput.focus(); return; }
            if (catalogState.products.some(p => p.id === id && (!orig || p.id !== orig.id))) {
                alert('A product with ID "' + id + '" already exists. Please choose a unique ID.');
                idInput.focus();
                return;
            }

            const readChecked = (sel) => Array.from(bodyEl.querySelectorAll(sel + ':checked')).map(el => el.value);
            const materials = readChecked('[data-chip-group="materials"]');
            const styles = readChecked('[data-chip-group="styles"]');
            const settings = readChecked('[data-chip-group="settings"]');
            const features = readChecked('[data-chip-group="features"]');
            const categories = readChecked('[data-cat-slug]');

            const cleanGallery = gallery.filter(g => g.img && g.img.trim());
            const updated = {
                id: id,
                legacyKey: draft.legacyKey || id,
                code: document.getElementById('pe-code').value.trim() || id,
                name: name,
                categories: categories,
                productType: document.getElementById('pe-type').value.trim(),
                location: document.getElementById('pe-location').value,
                materials: materials,
                styles: styles,
                settings: settings,
                features: features,
                desc: document.getElementById('pe-desc').value.trim(),
                dims: document.getElementById('pe-dims').value.trim(),
                materialsText: document.getElementById('pe-mattext').value.trim() || materials.join(', '),
                goodFor: document.getElementById('pe-goodfor').value.trim() || settings.join(', '),
                images: cleanGallery.map(g => g.img.trim()),
                captions: cleanGallery.map(g => g.caption.trim()),
                published: document.getElementById('pe-published').checked,
                hasPhotos: cleanGallery.length > 0,
                flags: ['admin-edited']
            };

            if (isNew) {
                catalogState.products.unshift(updated);
            } else {
                const idx = catalogState.products.findIndex(p => p.id === orig.id);
                if (idx >= 0) catalogState.products[idx] = updated;
            }
            saveDraft();
            closeDrawer();
            renderProductsTable();
        });
    }

    /* ======================================================================
       3. COLLECTIONS / CATEGORIES TAB + EDITOR
       ====================================================================== */
    function renderCategoriesView() {
        const container = document.getElementById('cat-groups-container');
        container.innerHTML = GROUPS.map(g => {
            const cats = catalogState.categories.filter(c => c.group === g.key);
            const rowsHtml = cats.length
                ? '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th style="width:68px;">Cover</th><th>Category</th><th>Slug &amp; Homepage</th><th>Pieces</th><th>Status</th><th style="width:230px;">Actions</th></tr></thead><tbody>' +
                    cats.map((c, idx) => {
                        const thumb = c.image
                            ? '<img class="adm-thumb" src="' + esc(resolvePreviewImg(c.image)) + '" alt="" loading="lazy">'
                            : '<div class="adm-thumb-empty">No cover</div>';
                        return '<tr data-cslug="' + esc(c.slug) + '">' +
                            '<td>' + thumb + '</td>' +
                            '<td><div class="adm-cell-title">' + esc(c.name) + '</div><div class="adm-cell-sub">' + esc(c.subtext || 'No description') + '</div></td>' +
                            '<td><code>' + esc(c.slug) + '</code><div class="adm-cell-sub">' + (c.showOnHome !== false ? 'Shown on Home' : 'Hidden on Home') + '</div></td>' +
                            '<td><strong>' + getCategoryProductCount(c.slug) + '</strong></td>' +
                            '<td>' + (c.hidden ? '<span class="adm-badge-hidden">Hidden</span>' : '<span class="adm-badge-pub">Visible</span>') + '</td>' +
                            '<td><div class="adm-row-actions">' +
                                '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-cact="up"' + (idx === 0 ? ' disabled' : '') + '>&uarr;</button>' +
                                '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-cact="down"' + (idx === cats.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
                                '<button type="button" class="adm-btn adm-btn-sm" data-cact="edit">Edit</button>' +
                                '<button type="button" class="adm-btn adm-btn-danger adm-btn-sm" data-cact="del">Del</button>' +
                            '</div></td>' +
                        '</tr>';
                    }).join('') +
                    '</tbody></table></div>'
                : '<p class="adm-hint">No categories in this group yet.</p>';

            return '<div class="adm-panel"><div class="adm-panel-head"><div><div class="adm-panel-title">' + esc(g.label) + '</div><div class="adm-panel-sub">' + cats.length + ' categor' + (cats.length === 1 ? 'y' : 'ies') + '</div></div></div><div class="adm-panel-body">' + rowsHtml + '</div></div>';
        }).join('');
    }

    function openCategoryDrawer(slug) {
        const isNew = !slug;
        const orig = isNew ? null : catalogState.categories.find(c => c.slug === slug);
        const draft = orig ? deepClone(orig) : {
            slug: '', name: '', group: 'chairs', image: '', subtext: '', intro: '', aliases: [], homeTitle: '', hidden: false, showOnHome: true
        };

        const bodyHtml =
            '<div class="adm-form-grid">' +
                '<div class="adm-field"><label class="adm-label">Category Name *</label><input type="text" class="adm-input" id="ce-name" value="' + esc(draft.name) + '" placeholder="e.g. Swivel Chairs"></div>' +
                '<div class="adm-field"><label class="adm-label">URL Slug *</label><input type="text" class="adm-input" id="ce-slug" value="' + esc(draft.slug) + '" placeholder="e.g. swivel-chairs"></div>' +
                '<div class="adm-field"><label class="adm-label">Directory Group</label>' +
                    '<select class="adm-select" id="ce-group">' +
                        GROUPS.map(g => '<option value="' + esc(g.key) + '"' + (draft.group === g.key ? ' selected' : '') + '>' + esc(g.label) + '</option>').join('') +
                    '</select>' +
                '</div>' +
                '<div class="adm-field"><label class="adm-label">URL Aliases (comma separated)</label><input type="text" class="adm-input" id="ce-aliases" value="' + esc((draft.aliases || []).join(', ')) + '" placeholder="e.g. tables, lounge"></div>' +
                '<div class="adm-field full"><label class="adm-label">Cover Image Path</label>' +
                    '<div class="adm-toolbar-group">' +
                        '<input type="text" class="adm-input" id="ce-image" value="' + esc(draft.image) + '" placeholder="e.g. dining.jpg" style="flex:1 1 240px;">' +
                        '<label class="adm-btn adm-btn-dark adm-btn-sm" style="cursor:pointer;">Upload Cover<input type="file" id="ce-upload" accept="image/*" style="display:none;"></label>' +
                    '</div>' +
                    '<img id="ce-img-preview" src="' + esc(resolvePreviewImg(draft.image)) + '" alt="" style="margin-top:10px;max-height:140px;object-fit:cover;border:1px solid #e2ddd5;' + (draft.image ? '' : 'display:none;') + '">' +
                '</div>' +
                '<div class="adm-field full"><label class="adm-label">Category Subtext (Headline Description)</label><textarea class="adm-textarea" id="ce-subtext">' + esc(draft.subtext) + '</textarea></div>' +
                '<div class="adm-field full"><label class="adm-label">Secondary Intro Line</label><textarea class="adm-textarea" id="ce-intro">' + esc(draft.intro) + '</textarea></div>' +
                '<div class="adm-field"><label class="adm-label">Visibility</label><div class="adm-checkbox-group">' +
                    '<label class="adm-check-chip' + (!draft.hidden ? ' is-checked' : '') + '"><input type="checkbox" id="ce-visible"' + (!draft.hidden ? ' checked' : '') + '><span>Visible in Collections</span></label>' +
                    '<label class="adm-check-chip' + (draft.showOnHome !== false ? ' is-checked' : '') + '"><input type="checkbox" id="ce-home"' + (draft.showOnHome !== false ? ' checked' : '') + '><span>Show on Homepage Explorer</span></label>' +
                '</div></div>' +
            '</div>';

        const footHtml =
            '<div></div><div class="adm-toolbar-group"><button type="button" class="adm-btn adm-btn-ghost" id="ce-cancel">Cancel</button><button type="button" class="adm-btn adm-btn-primary" id="ce-save">' + (isNew ? 'Create Category' : 'Save Category') + '</button></div>';

        openDrawer(isNew ? 'Add New Category' : ('Edit Category: ' + draft.name), bodyHtml, footHtml);

        const nameInp = document.getElementById('ce-name');
        const slugInp = document.getElementById('ce-slug');
        const imgInp = document.getElementById('ce-image');
        const prevImg = document.getElementById('ce-img-preview');

        if (isNew) {
            let manual = false;
            slugInp.addEventListener('input', () => { manual = true; });
            nameInp.addEventListener('input', () => { if (!manual) slugInp.value = slugify(nameInp.value); });
        }

        document.getElementById('adm-drawer-body').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.closest('.adm-check-chip')) {
                e.target.closest('.adm-check-chip').classList.toggle('is-checked', e.target.checked);
            }
        });

        imgInp.addEventListener('input', () => {
            if (imgInp.value.trim()) { prevImg.src = resolvePreviewImg(imgInp.value.trim()); prevImg.style.display = 'block'; }
            else { prevImg.style.display = 'none'; }
        });

        document.getElementById('ce-upload').addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const dataUrl = await readFileAsDataUrl(file);
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
            const relPath = 'uploads/categories/' + cleanName;
            stagedUploads.set(relPath, { dataUrl, base64: dataUrl.split(',')[1] || '', mime: file.type || 'image/jpeg' });
            imgInp.value = relPath;
            prevImg.src = dataUrl;
            prevImg.style.display = 'block';
            updateShellCounters();
            toast('Cover photo staged');
        });

        document.getElementById('ce-cancel').addEventListener('click', closeDrawer);
        document.getElementById('ce-save').addEventListener('click', () => {
            const name = nameInp.value.trim();
            const newSlug = slugify(slugInp.value.trim() || name);
            if (!name) { alert('Category Name is required.'); nameInp.focus(); return; }
            if (catalogState.categories.some(c => c.slug === newSlug && (!orig || c.slug !== orig.slug))) {
                alert('Slug "' + newSlug + '" is already used by another category.');
                return;
            }
            const aliases = document.getElementById('ce-aliases').value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const updated = {
                slug: newSlug,
                name: name,
                group: document.getElementById('ce-group').value,
                image: imgInp.value.trim(),
                subtext: document.getElementById('ce-subtext').value.trim(),
                intro: document.getElementById('ce-intro').value.trim(),
                aliases: aliases,
                homeTitle: draft.homeTitle || '',
                hidden: !document.getElementById('ce-visible').checked,
                showOnHome: document.getElementById('ce-home').checked
            };
            if (isNew) {
                catalogState.categories.push(updated);
            } else {
                const idx = catalogState.categories.findIndex(c => c.slug === orig.slug);
                if (idx >= 0) catalogState.categories[idx] = updated;
                // Update product references if slug changed
                if (orig.slug !== newSlug) {
                    catalogState.products.forEach(p => {
                        p.categories = (p.categories || []).map(s => s === orig.slug ? newSlug : s);
                    });
                }
            }
            saveDraft();
            closeDrawer();
            renderCategoriesView();
        });
    }

    /* ======================================================================
       4. FILTERS & GLOBAL TAGS TAB
       ====================================================================== */
    function renderFiltersView() {
        const listEl = document.getElementById('filters-list');
        listEl.innerHTML = catalogState.filters.map((f, i) =>
            '<div class="adm-filter-row" data-fi="' + i + '">' +
                '<input type="checkbox" data-fact="enabled"' + (f.enabled ? ' checked' : '') + ' aria-label="Enable filter" style="width:18px;height:18px;accent-color:#ff4400;">' +
                '<div><strong>' + esc(f.key) + '</strong><div class="adm-cell-sub">Field: ' + esc(f.field) + '</div></div>' +
                '<input type="text" class="adm-input" data-fact="label" value="' + esc(f.label) + '" aria-label="Filter display label">' +
                '<div class="adm-row-actions">' +
                    '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-fact="up"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
                    '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-fact="down"' + (i === catalogState.filters.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
                '</div>' +
            '</div>'
        ).join('');

        const tagGroups = [
            { field: 'materials', title: 'Materials' },
            { field: 'styles', title: 'Design Character' },
            { field: 'settings', title: 'Project Settings' }
        ];
        document.getElementById('tag-manager-grid').innerHTML = tagGroups.map(tg => {
            const vals = getAllUniqueValues(tg.field);
            return '<div class="adm-panel" style="margin:0;"><div class="adm-panel-head"><div class="adm-panel-title">' + esc(tg.title) + ' (' + vals.length + ')</div></div><div class="adm-panel-body">' +
                (vals.length ? vals.map(v =>
                    '<div class="adm-tag-row">' +
                        '<span><strong>' + esc(v.value) + '</strong> <span class="adm-cell-sub">(' + v.count + ')</span></span>' +
                        '<div class="adm-row-actions">' +
                            '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-tag-act="rename" data-tag-field="' + esc(tg.field) + '" data-tag-val="' + esc(v.value) + '">Rename</button>' +
                            '<button type="button" class="adm-btn adm-btn-danger adm-btn-sm" data-tag-act="del" data-tag-field="' + esc(tg.field) + '" data-tag-val="' + esc(v.value) + '">&times;</button>' +
                        '</div>' +
                    '</div>'
                ).join('') : '<p class="adm-hint">No tags yet.</p>') +
            '</div></div>';
        }).join('');
    }

    /* ======================================================================
       5. HOME HERO SLIDES TAB
       ====================================================================== */
    function getEditableSlides() {
        if (!Array.isArray(siteState.homeSlides) || !siteState.homeSlides.length) {
            return deepClone(DEFAULT_HOME_SLIDES);
        }
        return siteState.homeSlides;
    }

    function ensureSlidesWritable() {
        if (!Array.isArray(siteState.homeSlides) || !siteState.homeSlides.length) {
            siteState.homeSlides = deepClone(DEFAULT_HOME_SLIDES);
        }
    }

    function renderSlidesView() {
        const slides = getEditableSlides();
        const container = document.getElementById('slides-container');
        container.innerHTML = slides.map((s, i) =>
            '<div class="adm-slide-card" data-si="' + i + '">' +
                '<div class="adm-slide-head">' +
                    '<strong>Slide ' + String(i + 1).padStart(2, '0') + '</strong>' +
                    '<div class="adm-row-actions">' +
                        '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-sact="up"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
                        '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-sact="down"' + (i === slides.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
                        '<button type="button" class="adm-btn adm-btn-danger adm-btn-sm" data-sact="del"' + (slides.length <= 1 ? ' disabled' : '') + '>Delete</button>' +
                    '</div>' +
                '</div>' +
                '<div class="adm-slide-body">' +
                    '<div>' +
                        '<img class="adm-slide-preview" src="' + esc(resolvePreviewImg(s.image)) + '" alt="">' +
                        '<input type="text" class="adm-input" data-sfield="image" value="' + esc(s.image) + '" placeholder="Slide 1.png" style="width:100%;margin-bottom:8px;">' +
                        '<label class="adm-btn adm-btn-dark adm-btn-sm" style="width:100%;cursor:pointer;">Upload Slide Photo<input type="file" data-supload="' + i + '" accept="image/*" style="display:none;"></label>' +
                    '</div>' +
                    '<div class="adm-form-grid">' +
                        '<div class="adm-field"><label class="adm-label">Desktop Headline</label><input type="text" class="adm-input" data-sfield="title" value="' + esc(s.title) + '"></div>' +
                        '<div class="adm-field"><label class="adm-label">Mobile Headline (Optional)</label><input type="text" class="adm-input" data-sfield="mobileTitle" value="' + esc(s.mobileTitle || '') + '"></div>' +
                        '<div class="adm-field full"><label class="adm-label">Body Copy</label><textarea class="adm-textarea" data-sfield="text">' + esc(s.text) + '</textarea></div>' +
                        '<div class="adm-field"><label class="adm-label">Primary Button Label</label><input type="text" class="adm-input" data-sfield="btn1Text" value="' + esc(s.btn1Text || '') + '"></div>' +
                        '<div class="adm-field"><label class="adm-label">Primary Button Link</label><input type="text" class="adm-input" data-sfield="btn1Link" value="' + esc(s.btn1Link || '') + '"></div>' +
                        '<div class="adm-field"><label class="adm-label">Secondary Button Label</label><input type="text" class="adm-input" data-sfield="btn2Text" value="' + esc(s.btn2Text || '') + '"></div>' +
                        '<div class="adm-field"><label class="adm-label">Secondary Button Link</label><input type="text" class="adm-input" data-sfield="btn2Link" value="' + esc(s.btn2Link || '') + '"></div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        ).join('');
    }

    /* ======================================================================
       6. PAGES & COPYWRITING TAB
       ====================================================================== */
    async function loadPageDefaults(pageKey) {
        if (pageDefaultsCache[pageKey]) return pageDefaultsCache[pageKey];
        const schema = (global.PACTFORM_PAGE_SCHEMA || {})[pageKey];
        if (!schema) return {};
        const defaults = {};
        try {
            const res = await fetch(schema.file, { cache: 'no-cache' });
            if (res.ok) {
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                schema.fields.forEach(f => {
                    const el = doc.querySelector(f.selector);
                    if (!el) return;
                    if (f.type === 'image') {
                        defaults[f.key] = el.getAttribute('src') || '';
                    } else if (f.htmlBreaks) {
                        defaults[f.key] = el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
                    } else {
                        defaults[f.key] = (el.textContent || '').replace(/\s+/g, ' ').trim();
                    }
                });
            }
        } catch (e) {}
        pageDefaultsCache[pageKey] = defaults;
        return defaults;
    }

    async function renderPagesView() {
        const schemaMap = global.PACTFORM_PAGE_SCHEMA || {};
        const tabBar = document.getElementById('pages-tab-bar');
        tabBar.innerHTML = Object.keys(schemaMap).map(k =>
            '<button type="button" class="adm-page-tab' + (k === activePageKey ? ' is-active' : '') + '" data-pkey="' + esc(k) + '">' + esc(schemaMap[k].label) + '</button>'
        ).join('');

        const schema = schemaMap[activePageKey];
        if (!schema) return;
        document.getElementById('pages-panel-title').textContent = schema.label + ' (' + schema.file + ')';
        const wrap = document.getElementById('pages-fields-wrap');
        wrap.innerHTML = '<p class="adm-hint">Loading current text from ' + esc(schema.file) + '...</p>';

        const defaults = await loadPageDefaults(activePageKey);
        const overrides = siteState.pages[activePageKey] || {};

        wrap.innerHTML = schema.fields.map(f => {
            const origVal = defaults[f.key] || '';
            const hasOverride = typeof overrides[f.key] === 'string' && overrides[f.key].trim() !== '';
            const curVal = hasOverride ? overrides[f.key] : origVal;

            let inputHtml = '';
            if (f.type === 'textarea') {
                inputHtml = '<textarea class="adm-textarea" data-pfield="' + esc(f.key) + '">' + esc(curVal) + '</textarea>';
            } else if (f.type === 'image') {
                inputHtml = '<div class="adm-toolbar-group">' +
                    '<input type="text" class="adm-input" data-pfield="' + esc(f.key) + '" value="' + esc(curVal) + '" style="flex:1 1 260px;">' +
                    '<label class="adm-btn adm-btn-dark adm-btn-sm" style="cursor:pointer;">Upload Image<input type="file" data-pupload="' + esc(f.key) + '" accept="image/*" style="display:none;"></label>' +
                '</div>';
            } else {
                inputHtml = '<input type="text" class="adm-input" data-pfield="' + esc(f.key) + '" value="' + esc(curVal) + '" style="width:100%;">';
            }

            return '<div class="adm-copy-field">' +
                '<div class="adm-copy-head">' +
                    '<label class="adm-label">' + esc(f.label) + '</label>' +
                    '<div class="adm-toolbar-group">' +
                        (hasOverride ? '<span class="adm-copy-modified">Modified</span><button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-preset="' + esc(f.key) + '">Reset</button>' : '') +
                    '</div>' +
                '</div>' +
                inputHtml +
            '</div>';
        }).join('');
    }

    /* ======================================================================
       7. SITE SETTINGS TAB
       ====================================================================== */
    function renderSettingsView() {
        const s = siteState.settings || {};
        document.getElementById('set-wa').value = s.whatsappNumber || '';
        document.getElementById('set-sales').value = s.contactSalesHref || '';
        document.getElementById('set-web3').value = s.web3formsAccessKey || '';
        document.getElementById('set-formspree').value = s.formspreeEndpoint || '';
        document.getElementById('set-foot-tag').value = s.footerTagline || '';
        document.getElementById('set-foot-sub').value = s.footerSub || '';
        document.getElementById('set-foot-contact').value = s.footerContactText || '';
        document.getElementById('set-foot-copy').value = s.footerCopyright || '';
    }

    /* ======================================================================
       8. SERIALIZATION, DOWNLOAD, FOLDER SAVE & GITHUB PUBLISH
       ====================================================================== */
    function buildCatalogContentJs() {
        const clean = {
            version: 1,
            updatedAt: new Date().toISOString(),
            categories: catalogState.categories,
            products: catalogState.products,
            filters: catalogState.filters
        };
        return '/* ==========================================================================\n' +
            '   catalog-content.js\n' +
            '   Editable catalogue content (categories, products, filters, tags).\n' +
            '   Managed through admin.html. Keep the BEGIN / END markers intact.\n' +
            '   ========================================================================== */\n' +
            '/* PACTFORM_DATA:BEGIN */\n' +
            'window.PACTFORM_DATA = ' + JSON.stringify(clean) + ';\n' +
            '/* PACTFORM_DATA:END */\n';
    }

    function buildSiteContentJs() {
        const clean = {
            version: 1,
            updatedAt: new Date().toISOString(),
            settings: siteState.settings || {},
            homeSlides: siteState.homeSlides || null,
            pages: siteState.pages || {}
        };
        return '/* ==========================================================================\n' +
            '   site-content.js\n' +
            '   Editable site-wide settings, homepage hero slides, and page copywriting.\n' +
            '   Managed through admin.html. Keep the BEGIN / END markers intact.\n' +
            '   ========================================================================== */\n' +
            '/* PACTFORM_SITE:BEGIN */\n' +
            'window.PACTFORM_SITE_CONTENT = ' + JSON.stringify(clean, null, 2) + ';\n' +
            '/* PACTFORM_SITE:END */\n';
    }

    function downloadTextFile(filename, content, mime) {
        const blob = new Blob([content], { type: mime || 'application/javascript;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function utf8ToBase64(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }

    function base64ToUint8Array(b64) {
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return arr;
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function readGitHubConfig() {
        const owner = document.getElementById('gh-owner').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const branch = document.getElementById('gh-branch').value.trim() || 'main';
        const msg = document.getElementById('gh-msg').value.trim() || 'Update Pactform content via Admin Studio';
        const token = document.getElementById('gh-token').value.replace(/\s+/g, '');
        return { owner, repo, branch, msg, token };
    }

    function formatGitHubFetchError(err, owner, repo) {
        const raw = (err && err.message) ? String(err.message) : String(err || 'Unknown error');
        if (/failed to fetch|networkerror|load failed/i.test(raw)) {
            return raw + '\n\n' +
                'Chrome could not complete the request to https://api.github.com.\n' +
                'Check:\n' +
                '  1. Press F12 -> Console tab in Chrome to see the exact red error (e.g. ERR_CONNECTION_RESET, ERR_QUIC_PROTOCOL_ERROR, or CORS).\n' +
                '  2. Make sure internet/VPN/firewall/antivirus is not interrupting https://api.github.com.\n' +
                '  3. If uploading a large PNG on slow WiFi, try a smaller image (< 2 MB) or retry.\n' +
                '  4. Or use "2. Save to Local Project Folder" on the right (works 100% offline in Chrome/Edge).';
        }
        return raw;
    }

    async function fetchWithRetry(url, options, logEl, label) {
        let lastErr = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                return await fetch(url, options);
            } catch (err) {
                lastErr = err;
                const msg = (err && err.message) ? String(err.message) : String(err);
                if (attempt < 3 && /failed to fetch|networkerror|load failed/i.test(msg)) {
                    if (logEl) logEl.textContent += '  [RETRY ' + attempt + '/2] Network hiccup on ' + label + ', retrying...\n';
                    await new Promise(r => setTimeout(r, 1500 * attempt));
                    continue;
                }
                throw err;
            }
        }
        throw lastErr;
    }

    async function verifyGitHubRepoAccess(cfg, logEl) {
        if (!/^[\x21-\x7E]+$/.test(cfg.token)) {
            throw new Error('GitHub token contains invalid characters. Please re-copy the token from GitHub.');
        }
        const repoUrl = 'https://api.github.com/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo);

        // Stage 1: Simple unauthenticated GET (no CORS preflight) to verify Chrome can reach api.github.com
        if (logEl) logEl.textContent += '  [1/2] Checking reachability of api.github.com...\n';
        const pingRes = await fetchWithRetry(repoUrl, { cache: 'no-store' }, logEl, 'api.github.com');
        if (logEl) logEl.textContent += '  [OK] api.github.com reachable (HTTP ' + pingRes.status + ')\n';

        // Stage 2: Authenticated GET to verify token & permissions
        if (logEl) logEl.textContent += '  [2/2] Verifying token & repository permissions...\n';
        const res = await fetchWithRetry(repoUrl, {
            cache: 'no-store',
            headers: {
                'Authorization': 'Bearer ' + cfg.token
            }
        }, logEl, 'auth check');
        if (res.status === 401) {
            throw new Error('HTTP 401 Unauthorized — Token is invalid or expired. Generate a new Fine-grained token on GitHub.');
        }
        if (res.status === 403 || res.status === 404) {
            throw new Error('HTTP ' + res.status + ' — Cannot access ' + cfg.owner + '/' + cfg.repo + '. Make sure the token selected this repository and has Repository permissions -> Contents: Read and write.');
        }
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error('GitHub check failed (HTTP ' + res.status + '): ' + (errData.message || res.statusText));
        }
        const info = await res.json().catch(() => ({}));
        if (info.permissions && info.permissions.push === false) {
            throw new Error('Token only has read-only access to ' + cfg.owner + '/' + cfg.repo + '. Edit the token and set Contents to "Read and write".');
        }
        if (logEl) {
            logEl.textContent += '  [OK] Token verified for ' + cfg.owner + '/' + cfg.repo + ' (branch: ' + cfg.branch + ')\n';
        }
        return info;
    }

    async function testGitHubConnection() {
        const cfg = readGitHubConfig();
        const logEl = document.getElementById('gh-log');
        if (!cfg.owner || !cfg.repo || !cfg.token) {
            alert('Please fill Repository Owner, Repository Name, and your GitHub Personal Access Token.');
            return;
        }
        try { sessionStorage.setItem(GH_TOKEN_KEY, cfg.token); } catch (e) {}
        logEl.classList.remove('hidden');
        logEl.textContent = 'Testing connection to https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '...\n';
        const btn = document.getElementById('btn-test-github');
        if (btn) btn.disabled = true;
        try {
            await verifyGitHubRepoAccess(cfg, logEl);
            logEl.textContent += '\nConnection OK! You can now click "Publish to GitHub".';
            toast('GitHub connection successful!');
        } catch (err) {
            logEl.textContent += '\n[ERROR] ' + formatGitHubFetchError(err, cfg.owner, cfg.repo);
            toast('Connection test failed — see log');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function publishToGitHub() {
        const cfg = readGitHubConfig();
        const { owner, repo, branch, msg, token } = cfg;
        const logEl = document.getElementById('gh-log');

        if (!owner || !repo || !token) {
            alert('Please fill Repository Owner, Repository Name, and your GitHub Personal Access Token.');
            return;
        }
        try { sessionStorage.setItem(GH_TOKEN_KEY, token); } catch (e) {}

        logEl.classList.remove('hidden');
        logEl.textContent = 'Starting GitHub publish to ' + owner + '/' + repo + ' (' + branch + ')...\n';
        const btn = document.getElementById('btn-publish-github');
        btn.disabled = true;

        async function putFile(path, base64Content) {
            const apiUrl = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
            let sha = null;
            const checkRes = await fetchWithRetry(apiUrl + '?ref=' + encodeURIComponent(branch), {
                cache: 'no-store',
                headers: { 'Authorization': 'Bearer ' + token }
            }, logEl, 'check ' + path);
            if (checkRes.ok) {
                const existing = await checkRes.json();
                sha = existing.sha;
            } else if (checkRes.status !== 404) {
                const errData = await checkRes.json().catch(() => ({}));
                throw new Error('Failed reading ' + path + ' (HTTP ' + checkRes.status + (errData.message ? ': ' + errData.message : '') + ')');
            }
            const putBody = { message: msg + ' (' + path + ')', content: base64Content, branch: branch };
            if (sha) putBody.sha = sha;
            const putRes = await fetchWithRetry(apiUrl, {
                method: 'PUT',
                cache: 'no-store',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(putBody)
            }, logEl, 'upload ' + path);
            if (!putRes.ok) {
                const errData = await putRes.json().catch(() => ({}));
                throw new Error('Failed committing ' + path + ': ' + (errData.message || ('HTTP ' + putRes.status)));
            }
            logEl.textContent += '  [OK] Committed ' + path + '\n';
        }

        try {
            // 0. Verify connectivity & token access first
            await verifyGitHubRepoAccess(cfg, logEl);

            // 1. Upload staged images first
            for (const [relPath, fileObj] of stagedUploads.entries()) {
                const kb = Math.max(1, Math.round((fileObj.base64.length * 0.75) / 1024));
                logEl.textContent += 'Uploading image ' + relPath + ' (~' + kb + ' KB)...\n';
                await putFile(relPath, fileObj.base64);
            }
            // 2. Commit catalog-content.js
            logEl.textContent += 'Committing catalog-content.js...\n';
            await putFile('catalog-content.js', utf8ToBase64(buildCatalogContentJs()));
            // 3. Commit site-content.js
            logEl.textContent += 'Committing site-content.js...\n';
            await putFile('site-content.js', utf8ToBase64(buildSiteContentJs()));

            stagedUploads.clear();
            try {
                localStorage.removeItem(DRAFT_CATALOG_KEY);
                localStorage.removeItem(DRAFT_SITE_KEY);
                localStorage.removeItem(PREVIEW_KEY);
            } catch (e) {}
            isDirty = false;
            updateShellCounters();
            logEl.textContent += '\nDONE! Changes published to GitHub (' + branch + '). GitHub Pages will refresh shortly.';
            toast('Published to GitHub successfully!');
        } catch (err) {
            logEl.textContent += '\n[ERROR] ' + formatGitHubFetchError(err, owner, repo);
            toast('GitHub publish failed — see log');
        } finally {
            btn.disabled = false;
        }
    }

    async function saveToLocalFolder() {
        const logEl = document.getElementById('folder-log');
        if (typeof global.showDirectoryPicker !== 'function') {
            alert('Direct folder save requires Chrome or Edge. You can use "Download catalog-content.js" and "Download site-content.js" below instead.');
            return;
        }
        try {
            const dirHandle = await global.showDirectoryPicker({ mode: 'readwrite' });
            logEl.classList.remove('hidden');
            logEl.textContent = 'Saving files into selected folder "' + dirHandle.name + '"...\n';

            async function writeRelFile(relPath, data) {
                const parts = relPath.split('/').filter(Boolean);
                let cur = dirHandle;
                for (let i = 0; i < parts.length - 1; i++) {
                    cur = await cur.getDirectoryHandle(parts[i], { create: true });
                }
                const fh = await cur.getFileHandle(parts[parts.length - 1], { create: true });
                const writable = await fh.createWritable();
                await writable.write(data);
                await writable.close();
                logEl.textContent += '  [OK] Wrote ' + relPath + '\n';
            }

            for (const [relPath, fileObj] of stagedUploads.entries()) {
                await writeRelFile(relPath, base64ToUint8Array(fileObj.base64));
            }
            await writeRelFile('catalog-content.js', buildCatalogContentJs());
            await writeRelFile('site-content.js', buildSiteContentJs());

            stagedUploads.clear();
            try {
                localStorage.removeItem(DRAFT_CATALOG_KEY);
                localStorage.removeItem(DRAFT_SITE_KEY);
                localStorage.removeItem(PREVIEW_KEY);
            } catch (e) {}
            isDirty = false;
            updateShellCounters();
            logEl.textContent += '\nDONE! All files saved directly to disk.';
            toast('Saved directly to local folder!');
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            logEl.classList.remove('hidden');
            logEl.textContent += '\n[ERROR] ' + (err.message || err);
        }
    }

    /* ======================================================================
       DRAWER HELPERS
       ====================================================================== */
    function openDrawer(title, bodyHtml, footHtml) {
        document.getElementById('adm-drawer-title').textContent = title;
        document.getElementById('adm-drawer-body').innerHTML = bodyHtml;
        document.getElementById('adm-drawer-foot').innerHTML = footHtml;
        document.getElementById('adm-drawer-backdrop').classList.remove('hidden');
        document.getElementById('adm-drawer').classList.remove('hidden');
    }

    function closeDrawer() {
        document.getElementById('adm-drawer-backdrop').classList.add('hidden');
        document.getElementById('adm-drawer').classList.add('hidden');
    }

    /* ======================================================================
       BOOT & EVENT BINDING
       ====================================================================== */
    function init() {
        // Restore session GitHub token if present
        try {
            const savedTok = sessionStorage.getItem(GH_TOKEN_KEY);
            if (savedTok) document.getElementById('gh-token').value = savedTok;
        } catch (e) {}

        // Sidebar navigation
        document.querySelectorAll('.adm-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
        document.getElementById('adm-menu-btn').addEventListener('click', () => {
            document.getElementById('adm-sidebar').classList.toggle('is-open');
        });

        // Topbar actions
        document.getElementById('btn-preview-site').addEventListener('click', () => {
            saveDraft(true);
            try { localStorage.setItem(PREVIEW_KEY, '1'); } catch (e) {}
            window.open('index.html', '_blank', 'noopener');
            toast('Draft preview enabled — opened Homepage in new tab');
        });

        document.getElementById('btn-go-publish').addEventListener('click', () => switchTab('publish'));

        document.getElementById('btn-discard-draft').addEventListener('click', () => {
            if (!confirm('Discard all unpublished local edits and reload from the current saved site files?')) return;
            try {
                localStorage.removeItem(DRAFT_CATALOG_KEY);
                localStorage.removeItem(DRAFT_SITE_KEY);
                localStorage.removeItem(PREVIEW_KEY);
            } catch (e) {}
            stagedUploads.clear();
            catalogState = deepClone(PUBLISHED_CATALOG);
            siteState = deepClone(PUBLISHED_SITE);
            ensureStateShapes();
            isDirty = false;
            updateShellCounters();
            switchTab(activeTab);
            toast('Local draft cleared');
        });

        // Quick Actions
        document.getElementById('qa-add-product').addEventListener('click', () => { switchTab('products'); openProductDrawer(null); });
        document.getElementById('qa-add-category').addEventListener('click', () => { switchTab('categories'); openCategoryDrawer(null); });
        document.getElementById('qa-edit-home').addEventListener('click', () => { activePageKey = 'index'; switchTab('pages'); });
        document.getElementById('qa-edit-slides').addEventListener('click', () => switchTab('slides'));
        document.getElementById('qa-edit-settings').addEventListener('click', () => switchTab('settings'));

        // Products events
        document.getElementById('btn-add-product').addEventListener('click', () => openProductDrawer(null));
        ['prod-search', 'prod-filter-cat', 'prod-filter-type', 'prod-filter-status'].forEach(id => {
            document.getElementById(id).addEventListener('input', renderProductsTable);
            document.getElementById(id).addEventListener('change', renderProductsTable);
        });
        document.getElementById('prod-table-body').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            const pid = btn.closest('tr').dataset.pid;
            const act = btn.dataset.act;
            if (act === 'edit') {
                openProductDrawer(pid);
            } else if (act === 'dup') {
                const src = catalogState.products.find(p => p.id === pid);
                if (!src) return;
                const copy = deepClone(src);
                copy.id = src.id + '-copy-' + String(Date.now()).slice(-4);
                copy.legacyKey = copy.id;
                copy.name = src.name + ' (Copy)';
                catalogState.products.unshift(copy);
                saveDraft();
                renderProductsTable();
            } else if (act === 'del') {
                const src = catalogState.products.find(p => p.id === pid);
                if (!src || !confirm('Delete "' + src.name + '"?')) return;
                catalogState.products = catalogState.products.filter(p => p.id !== pid);
                saveDraft();
                renderProductsTable();
            }
        });

        // Categories events
        document.getElementById('btn-add-category').addEventListener('click', () => openCategoryDrawer(null));
        document.getElementById('cat-groups-container').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-cact]');
            if (!btn) return;
            const slug = btn.closest('tr').dataset.cslug;
            const act = btn.dataset.cact;
            const cat = catalogState.categories.find(c => c.slug === slug);
            if (!cat) return;

            if (act === 'edit') {
                openCategoryDrawer(slug);
            } else if (act === 'del') {
                const cnt = getCategoryProductCount(slug);
                if (!confirm('Delete category "' + cat.name + '"? (' + cnt + ' product(s) will simply be unlinked from this category, not deleted.)')) return;
                catalogState.categories = catalogState.categories.filter(c => c.slug !== slug);
                catalogState.products.forEach(p => { p.categories = (p.categories || []).filter(s => s !== slug); });
                saveDraft();
                renderCategoriesView();
            } else if (act === 'up' || act === 'down') {
                const groupCats = catalogState.categories.filter(c => c.group === cat.group);
                const gIdx = groupCats.findIndex(c => c.slug === slug);
                const swapTarget = act === 'up' ? groupCats[gIdx - 1] : groupCats[gIdx + 1];
                if (!swapTarget) return;
                const i1 = catalogState.categories.indexOf(cat);
                const i2 = catalogState.categories.indexOf(swapTarget);
                catalogState.categories[i1] = swapTarget;
                catalogState.categories[i2] = cat;
                saveDraft();
                renderCategoriesView();
            }
        });

        // Filters & Global Tag Manager events
        document.getElementById('filters-list').addEventListener('change', (e) => {
            const row = e.target.closest('.adm-filter-row');
            if (!row) return;
            const i = Number(row.dataset.fi);
            if (e.target.dataset.fact === 'enabled') {
                catalogState.filters[i].enabled = e.target.checked;
                saveDraft();
            } else if (e.target.dataset.fact === 'label') {
                catalogState.filters[i].label = e.target.value.trim() || catalogState.filters[i].key;
                saveDraft();
            }
        });
        document.getElementById('filters-list').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-fact]');
            if (!btn || (btn.dataset.fact !== 'up' && btn.dataset.fact !== 'down')) return;
            const i = Number(btn.closest('.adm-filter-row').dataset.fi);
            const j = btn.dataset.fact === 'up' ? i - 1 : i + 1;
            if (j < 0 || j >= catalogState.filters.length) return;
            const tmp = catalogState.filters[j];
            catalogState.filters[j] = catalogState.filters[i];
            catalogState.filters[i] = tmp;
            saveDraft();
            renderFiltersView();
        });
        document.getElementById('tag-manager-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-tag-act]');
            if (!btn) return;
            const field = btn.dataset.tagField;
            const oldVal = btn.dataset.tagVal;
            const act = btn.dataset.tagAct;
            if (act === 'rename') {
                const next = prompt('Rename "' + oldVal + '" across all products to:', oldVal);
                if (!next || !next.trim() || next.trim() === oldVal) return;
                const cleanNext = next.trim();
                catalogState.products.forEach(p => {
                    if (!Array.isArray(p[field])) return;
                    p[field] = Array.from(new Set(p[field].map(v => v === oldVal ? cleanNext : v)));
                    if (field === 'materials') p.materialsText = p.materials.join(', ');
                    if (field === 'settings') p.goodFor = p.settings.join(', ');
                });
                saveDraft();
                renderFiltersView();
            } else if (act === 'del') {
                if (!confirm('Remove tag "' + oldVal + '" from all products?')) return;
                catalogState.products.forEach(p => {
                    if (!Array.isArray(p[field])) return;
                    p[field] = p[field].filter(v => v !== oldVal);
                    if (field === 'materials') p.materialsText = p.materials.join(', ');
                    if (field === 'settings') p.goodFor = p.settings.join(', ');
                });
                saveDraft();
                renderFiltersView();
            }
        });

        // Home Hero Slides events
        document.getElementById('btn-add-slide').addEventListener('click', () => {
            ensureSlidesWritable();
            siteState.homeSlides.push({
                title: 'New Headline',
                mobileTitle: '',
                text: 'Describe your new highlight here.',
                mobileText: '',
                image: 'Slide 1.png',
                mobilePos: 'center center',
                btn1Text: 'Explore collections',
                btn1Link: 'collection.html',
                btn2Text: 'Start a project',
                btn2Link: 'projects.html'
            });
            saveDraft();
            renderSlidesView();
        });
        document.getElementById('btn-reset-slides').addEventListener('click', () => {
            if (!confirm('Reset Homepage Hero Slides back to the original 5 slides?')) return;
            siteState.homeSlides = null;
            saveDraft();
            renderSlidesView();
        });
        document.getElementById('slides-container').addEventListener('input', (e) => {
            const field = e.target.dataset.sfield;
            if (!field) return;
            ensureSlidesWritable();
            const i = Number(e.target.closest('.adm-slide-card').dataset.si);
            siteState.homeSlides[i][field] = e.target.value;
            if (field === 'image') {
                const img = e.target.closest('.adm-slide-card').querySelector('.adm-slide-preview');
                if (img) img.src = resolvePreviewImg(e.target.value);
            }
            saveDraft(true);
        });
        document.getElementById('slides-container').addEventListener('change', async (e) => {
            if (e.target.dataset.supload === undefined) return;
            const i = Number(e.target.dataset.supload);
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            ensureSlidesWritable();
            const dataUrl = await readFileAsDataUrl(file);
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
            const relPath = 'uploads/slides/' + cleanName;
            stagedUploads.set(relPath, { dataUrl, base64: dataUrl.split(',')[1] || '', mime: file.type || 'image/jpeg' });
            siteState.homeSlides[i].image = relPath;
            saveDraft();
            renderSlidesView();
        });
        document.getElementById('slides-container').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-sact]');
            if (!btn) return;
            ensureSlidesWritable();
            const i = Number(btn.closest('.adm-slide-card').dataset.si);
            const act = btn.dataset.sact;
            if (act === 'del' && siteState.homeSlides.length > 1) siteState.homeSlides.splice(i, 1);
            else if (act === 'up' && i > 0) { const t = siteState.homeSlides[i - 1]; siteState.homeSlides[i - 1] = siteState.homeSlides[i]; siteState.homeSlides[i] = t; }
            else if (act === 'down' && i < siteState.homeSlides.length - 1) { const t = siteState.homeSlides[i + 1]; siteState.homeSlides[i + 1] = siteState.homeSlides[i]; siteState.homeSlides[i] = t; }
            saveDraft();
            renderSlidesView();
        });

        // Pages & Copywriting events
        document.getElementById('pages-tab-bar').addEventListener('click', (e) => {
            const tab = e.target.closest('[data-pkey]');
            if (!tab) return;
            activePageKey = tab.dataset.pkey;
            renderPagesView();
        });
        document.getElementById('btn-reset-page').addEventListener('click', () => {
            if (!confirm('Reset all custom copy edits for this page back to the original HTML text?')) return;
            siteState.pages[activePageKey] = {};
            saveDraft();
            renderPagesView();
        });
        document.getElementById('pages-fields-wrap').addEventListener('input', (e) => {
            const key = e.target.dataset.pfield;
            if (!key) return;
            if (!siteState.pages[activePageKey]) siteState.pages[activePageKey] = {};
            const orig = (pageDefaultsCache[activePageKey] || {})[key] || '';
            if (e.target.value.trim() === orig.trim()) delete siteState.pages[activePageKey][key];
            else siteState.pages[activePageKey][key] = e.target.value;
            saveDraft(true);
        });
        document.getElementById('pages-fields-wrap').addEventListener('change', async (e) => {
            const key = e.target.dataset.pupload;
            if (!key) return;
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const dataUrl = await readFileAsDataUrl(file);
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
            const relPath = 'uploads/pages/' + cleanName;
            stagedUploads.set(relPath, { dataUrl, base64: dataUrl.split(',')[1] || '', mime: file.type || 'image/jpeg' });
            if (!siteState.pages[activePageKey]) siteState.pages[activePageKey] = {};
            siteState.pages[activePageKey][key] = relPath;
            saveDraft();
            renderPagesView();
        });
        document.getElementById('pages-fields-wrap').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-preset]');
            if (!btn) return;
            const key = btn.dataset.preset;
            if (siteState.pages[activePageKey]) delete siteState.pages[activePageKey][key];
            saveDraft();
            renderPagesView();
        });

        // Site Settings events
        const settingBindings = [
            ['set-wa', 'whatsappNumber'],
            ['set-sales', 'contactSalesHref'],
            ['set-web3', 'web3formsAccessKey'],
            ['set-formspree', 'formspreeEndpoint'],
            ['set-foot-tag', 'footerTagline'],
            ['set-foot-sub', 'footerSub'],
            ['set-foot-contact', 'footerContactText'],
            ['set-foot-copy', 'footerCopyright']
        ];
        settingBindings.forEach(([elId, key]) => {
            document.getElementById(elId).addEventListener('input', (e) => {
                siteState.settings[key] = e.target.value.trim();
                saveDraft(true);
            });
        });

        // Publish & Backup events
        document.getElementById('btn-publish-github').addEventListener('click', publishToGitHub);
        document.getElementById('btn-test-github').addEventListener('click', testGitHubConnection);
        document.getElementById('btn-save-folder').addEventListener('click', saveToLocalFolder);
        document.getElementById('btn-dl-catalog').addEventListener('click', () => {
            downloadTextFile('catalog-content.js', buildCatalogContentJs());
            toast('Downloaded catalog-content.js');
        });
        document.getElementById('btn-dl-site').addEventListener('click', () => {
            downloadTextFile('site-content.js', buildSiteContentJs());
            toast('Downloaded site-content.js');
        });
        document.getElementById('btn-export-json').addEventListener('click', () => {
            const snap = { exportedAt: new Date().toISOString(), catalog: catalogState, site: siteState };
            downloadTextFile('pactform-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(snap, null, 2), 'application/json');
            toast('Exported JSON backup');
        });
        document.getElementById('input-import-json').addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                if (!parsed.catalog || !Array.isArray(parsed.catalog.products)) throw new Error('Invalid backup format');
                catalogState = parsed.catalog;
                if (parsed.site) siteState = parsed.site;
                ensureStateShapes();
                saveDraft();
                switchTab(activeTab);
                toast('Backup imported into draft!');
            } catch (err) {
                alert('Could not import backup: ' + err.message);
            }
            e.target.value = '';
        });

        // Drawer close
        document.getElementById('adm-drawer-close').addEventListener('click', closeDrawer);
        document.getElementById('adm-drawer-backdrop').addEventListener('click', closeDrawer);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('adm-drawer').classList.contains('hidden')) closeDrawer();
        });

        updateShellCounters();
        switchTab('overview');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window);
