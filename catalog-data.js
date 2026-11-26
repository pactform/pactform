/* ==========================================================================
   catalog-data.js
   Shared catalogue helpers. Reads the editable content from
   catalog-content.js (window.PACTFORM_DATA), normalises it, and exposes
   window.PactformCatalog for collection.html, category.html, product.html
   and the homepage collection explorer.

   Admin draft preview: when an editor clicks "Preview site" in admin.html,
   the unpublished draft is read from localStorage on this device only.
   ========================================================================== */
(function (global) {
    'use strict';

    const GROUPS = [
        { key: 'space', label: 'Browse by Space' },
        { key: 'chairs', label: 'Chairs' },
        { key: 'tables', label: 'Tables' },
        { key: 'storage', label: 'Storage' }
    ];
    const GROUP_KEYS = GROUPS.map(g => g.key);

    const LEGACY_GROUP = {
        'dining-chairs': 'chairs', 'bar-stools': 'chairs', 'booth-seating': 'chairs',
        'lounge-chairs': 'chairs', 'meeting-chairs': 'chairs',
        'dining-tables': 'tables', 'coffee-tables': 'tables', 'side-tables': 'tables',
        'outdoor-tables': 'tables', 'storage': 'storage'
    };

    const DEFAULT_FILTERS = [
        { key: 'productType', label: 'Product Type', field: 'productType', enabled: true },
        { key: 'material', label: 'Material', field: 'materials', enabled: true },
        { key: 'style', label: 'Design Character', field: 'styles', enabled: true },
        { key: 'setting', label: 'Project Setting', field: 'settings', enabled: true },
        { key: 'location', label: 'Indoor / Outdoor', field: 'location', enabled: true },
        { key: 'feature', label: 'Features', field: 'features', enabled: false }
    ];
    const FILTER_FIELDS = ['productType', 'materials', 'styles', 'settings', 'location', 'features'];

    const DRAFT_KEY = 'pactform-admin-draft';
    const PREVIEW_KEY = 'pactform-admin-preview';

    function toArray(v) {
        if (Array.isArray(v)) return v.filter(x => x !== null && x !== undefined && String(x).trim() !== '').map(x => String(x));
        if (v === null || v === undefined || String(v).trim() === '') return [];
        return [String(v)];
    }

    function str(v) {
        return v === null || v === undefined ? '' : String(v);
    }

    /* ---------- Load published data, or the admin draft when previewing ---------- */
    const isAdminStudio = Boolean(global.__PACTFORM_ADMIN_STUDIO__);
    let source = global.PACTFORM_DATA || null;
    let previewing = false;
    if (!isAdminStudio) {
        try {
            if (global.localStorage && localStorage.getItem(PREVIEW_KEY) === '1') {
                const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
                if (draft && Array.isArray(draft.products) && Array.isArray(draft.categories)) {
                    source = draft;
                    previewing = true;
                }
            }
        } catch (e) { /* storage unavailable */ }
    }
    if (!source || typeof source !== 'object') source = { categories: [], products: [] };

    function normalizeCategory(c) {
        const slug = str(c.slug).trim().toLowerCase();
        let group = str(c.group).trim();
        if (GROUP_KEYS.indexOf(group) === -1) group = LEGACY_GROUP[slug] || (group === 'space' ? 'space' : 'chairs');
        return {
            slug: slug,
            name: str(c.name) || slug,
            group: group,
            image: str(c.image),
            subtext: str(c.subtext),
            intro: str(c.intro),
            aliases: toArray(c.aliases).map(a => a.toLowerCase()),
            homeTitle: str(c.homeTitle),
            hidden: c.hidden === true,
            showOnHome: c.showOnHome !== false
        };
    }

    function normalizeProduct(p) {
        const images = toArray(p.images);
        const captions = Array.isArray(p.captions) ? p.captions.map(c => (c && typeof c === 'object') ? str(c.caption) : str(c)) : [];
        return {
            id: str(p.id).trim(),
            legacyKey: str(p.legacyKey),
            code: str(p.code),
            name: str(p.name) || str(p.id),
            categories: toArray(p.categories),
            productType: str(p.productType),
            location: str(p.location),
            materials: toArray(p.materials),
            styles: toArray(p.styles),
            settings: toArray(p.settings),
            features: toArray(p.features),
            desc: str(p.desc),
            dims: str(p.dims),
            materialsText: str(p.materialsText),
            goodFor: str(p.goodFor),
            images: images,
            captions: captions,
            published: p.published !== false,
            hasPhotos: images.length > 0,
            flags: toArray(p.flags)
        };
    }

    function normalizeFilters(list) {
        if (!Array.isArray(list) || !list.length) return DEFAULT_FILTERS.map(f => Object.assign({}, f));
        const seen = {};
        const out = [];
        list.forEach(f => {
            if (!f || !f.key || seen[f.key]) return;
            const field = FILTER_FIELDS.indexOf(f.field) !== -1 ? f.field : null;
            if (!field) return;
            seen[f.key] = true;
            out.push({ key: String(f.key), label: str(f.label) || String(f.key), field: field, enabled: f.enabled !== false });
        });
        return out.length ? out : DEFAULT_FILTERS.map(f => Object.assign({}, f));
    }

    let DATA = { version: 1, updatedAt: '', categories: [], products: [], filters: [], taxonomy: {}, settings: {} };
    let CATEGORY_MAP = {};
    let ALIAS_MAP = {};
    let PRODUCT_BY_ID = {};
    let PRODUCT_BY_LEGACY_KEY = {};

    function applyCatalogSource(rawSource) {
        const src = (rawSource && typeof rawSource === 'object') ? rawSource : { categories: [], products: [] };
        DATA = {
            version: src.version || 1,
            updatedAt: str(src.updatedAt),
            categories: (Array.isArray(src.categories) ? src.categories : []).map(normalizeCategory).filter(c => c.slug),
            products: (Array.isArray(src.products) ? src.products : []).map(normalizeProduct).filter(p => p.id),
            filters: normalizeFilters(src.filters),
            taxonomy: src.taxonomy && typeof src.taxonomy === 'object' ? src.taxonomy : {},
            settings: src.settings && typeof src.settings === 'object' ? src.settings : {}
        };
        CATEGORY_MAP = {};
        ALIAS_MAP = {};
        DATA.categories.forEach(c => {
            CATEGORY_MAP[c.slug] = c;
            c.aliases.forEach(a => { if (!ALIAS_MAP[a]) ALIAS_MAP[a] = c.slug; });
        });
        PRODUCT_BY_ID = {};
        PRODUCT_BY_LEGACY_KEY = {};
        DATA.products.forEach(p => {
            PRODUCT_BY_ID[p.id] = p;
            if (p.legacyKey && !PRODUCT_BY_LEGACY_KEY[p.legacyKey]) PRODUCT_BY_LEGACY_KEY[p.legacyKey] = p;
        });
        global.PACTFORM_DATA = DATA;
        global.PACTFORM_CATEGORIES = DATA.categories;
        global.PACTFORM_PRODUCTS = DATA.products;
    }

    applyCatalogSource(source);

    function visibleCategory(c) { return c && !c.hidden; }

    function resolveCategorySlug(raw) {
        if (!raw) return null;
        const key = String(raw).trim().toLowerCase();
        if (CATEGORY_MAP[key] && visibleCategory(CATEGORY_MAP[key])) return key;
        if (ALIAS_MAP[key] && visibleCategory(CATEGORY_MAP[ALIAS_MAP[key]])) return ALIAS_MAP[key];
        return null;
    }

    function getCategory(raw) {
        const slug = resolveCategorySlug(raw);
        return slug ? CATEGORY_MAP[slug] : null;
    }

    function getCategories(group) {
        const list = DATA.categories.filter(visibleCategory);
        if (!group) return list.slice();
        if (group === 'product') return list.filter(c => c.group !== 'space');
        return list.filter(c => c.group === group);
    }

    function getGroups() {
        return GROUPS.map(g => Object.assign({}, g));
    }

    function getProductsForCategory(categorySlug) {
        const slug = resolveCategorySlug(categorySlug);
        if (!slug) return [];
        return DATA.products.filter(p => p.published && p.categories.indexOf(slug) !== -1);
    }

    function getCategoryCount(categorySlug) {
        return getProductsForCategory(categorySlug).length;
    }

    function getProduct(idOrKey) {
        if (!idOrKey) return null;
        const key = String(idOrKey).trim();
        const p = PRODUCT_BY_ID[key] || PRODUCT_BY_LEGACY_KEY[key] || null;
        return p && p.published ? p : null;
    }

    function getPrimaryCategoryForProduct(product, preferredCategory) {
        if (!product) return null;
        const pref = resolveCategorySlug(preferredCategory);
        if (pref && product.categories.indexOf(pref) !== -1) return CATEGORY_MAP[pref];
        const productCat = product.categories.find(s => CATEGORY_MAP[s] && visibleCategory(CATEGORY_MAP[s]) && CATEGORY_MAP[s].group !== 'space');
        if (productCat) return CATEGORY_MAP[productCat];
        const anyCat = product.categories.find(s => CATEGORY_MAP[s] && visibleCategory(CATEGORY_MAP[s]));
        return anyCat ? CATEGORY_MAP[anyCat] : null;
    }

    function getFilters() {
        return DATA.filters.filter(f => f.enabled).map(f => Object.assign({}, f));
    }

    /**
     * Builds only the filter groups and values that exist in the given products.
     * A group is shown only when it offers a real choice (2+ distinct values).
     */
    function getAvailableFilters(products) {
        if (!Array.isArray(products) || products.length === 0) return [];
        const groups = [];
        getFilters().forEach(def => {
            const counts = new Map();
            products.forEach(p => {
                const seen = new Set();
                toArray(p[def.field]).forEach(v => {
                    if (seen.has(v)) return;
                    seen.add(v);
                    counts.set(v, (counts.get(v) || 0) + 1);
                });
            });
            const options = Array.from(counts.entries())
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
            if (options.length > 1) groups.push({ key: def.key, label: def.label, options });
        });
        return groups;
    }

    function filterProducts(products, criteria) {
        const c = criteria || {};
        const q = String(c.query || '').trim().toLowerCase();
        const selected = c.filters || {};
        const defs = getFilters();
        return products.filter(p => {
            if (q) {
                const haystack = [p.name, p.id, p.code, p.productType, p.location, p.materialsText, p.goodFor, p.desc]
                    .concat(p.materials, p.styles, p.settings, p.features)
                    .join(' ').toLowerCase();
                if (haystack.indexOf(q) === -1) return false;
            }
            for (let i = 0; i < defs.length; i++) {
                const def = defs[i];
                const sel = selected[def.key];
                if (!sel) continue;
                const set = sel instanceof Set ? sel : new Set(toArray(sel));
                if (!set.size) continue;
                const values = toArray(p[def.field]);
                if (!values.some(v => set.has(v))) return false;
            }
            return true;
        });
    }

    function buildProductSlides(product) {
        const shots = ['front', 'side', 'back', 'detail', 'top', 'close-up'];
        const settings = ['a restaurant', 'a cafe', 'a hotel lobby', 'an office', 'a modern interior'];
        const imgs = product.images || [];
        const total = imgs.length;
        const shotCount = Math.ceil(total / 2);
        const settingCount = total - shotCount;
        const captions = product.captions || [];
        return imgs.map((img, i) => {
            const isShot = i < shotCount;
            const custom = captions[i];
            let caption;
            if (typeof custom === 'string' && custom.trim()) caption = custom;
            else if (isShot) caption = 'Product photography on plain ground — ' + shots[i % shots.length] + ' view.';
            else caption = 'Visualised in ' + settings[(i - shotCount) % settings.length] + '.';
            const label = isShot
                ? 'PRODUCT PHOTO — ' + product.name + ' (' + (i + 1) + '/' + shotCount + ')'
                : 'INTERIOR — ' + product.name + ' (' + (i - shotCount + 1) + '/' + settingCount + ')';
            return { img, label, caption, index: i };
        });
    }

    /* ---------- Draft preview banner (admin's own device only) ---------- */
    function showPreviewBanner() {
        if (!previewing || !document.body || document.getElementById('pf-preview-banner')) return;
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
    if (previewing) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showPreviewBanner);
        else showPreviewBanner();
    }

    global.PactformCatalog = {
        getGroups,
        getCategories,
        getCategory,
        resolveCategorySlug,
        getProductsForCategory,
        getCategoryCount,
        getProduct,
        getPrimaryCategoryForProduct,
        getFilters,
        getAvailableFilters,
        filterProducts,
        buildProductSlides,
        isPreview: () => previewing
    };

    /* ---------- Background freshness check (bypasses 10-min GitHub Pages JS cache) ---------- */
    function extractCatalogJson(jsText) {
        const m = jsText.match(/\/\*\s*PACTFORM_DATA:BEGIN\s*\*\/([\s\S]*?)\/\*\s*PACTFORM_DATA:END\s*\*\//);
        if (!m) return null;
        const body = m[1].trim().replace(/^window\.PACTFORM_DATA\s*=\s*/, '').replace(/;\s*$/, '');
        return JSON.parse(body);
    }

    if (!isAdminStudio && !previewing && typeof fetch === 'function' && global.location && /^https?:$/i.test(global.location.protocol || '')) {
        fetch('catalog-content.js?_=' + Date.now(), { cache: 'no-store' })
            .then(res => (res.ok ? res.text() : ''))
            .then(text => {
                if (!text) return;
                const fresh = extractCatalogJson(text);
                if (fresh && fresh.updatedAt && fresh.updatedAt !== DATA.updatedAt) {
                    applyCatalogSource(fresh);
                    try {
                        global.dispatchEvent(new CustomEvent('pactform:catalog-updated', { detail: DATA }));
                    } catch (e) {}
                }
            })
            .catch(() => {});
    }
})(window);
