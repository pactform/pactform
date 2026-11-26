/* ==========================================================================
   your-list.js
   Persistent "Your list" enquiry drawer shared across ALL Pactform pages.
   Supports per-item quantities (- / +), WhatsApp enquiry summary, Shareable
   URLs (?list=id:qty), and print-ready PDF Schedule export.
   ========================================================================== */
(function (global) {
    'use strict';

    const STORAGE_KEY = 'pactform-your-list-v1';
    const TRASH_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

    function clampQty(val) {
        const n = parseInt(val, 10);
        if (!isFinite(n) || n < 1) return 1;
        return Math.min(9999, n);
    }

    function normalizeItem(it) {
        if (!it || !it.name) return null;
        return {
            id: String(it.id || it.name),
            name: String(it.name),
            meta: String(it.meta || ''),
            href: String(it.href || (it.id ? 'product.html?id=' + encodeURIComponent(it.id) : '')),
            image: String(it.image || ''),
            code: String(it.code || ''),
            dims: String(it.dims || ''),
            qty: clampQty(it.qty || 1)
        };
    }

    function enrichItem(it) {
        const copy = Object.assign({}, it);
        try {
            if (global.PactformCatalog && typeof global.PactformCatalog.getProduct === 'function' && copy.id) {
                const prod = global.PactformCatalog.getProduct(copy.id);
                if (prod) {
                    if (!copy.image && prod.images && prod.images[0]) copy.image = prod.images[0];
                    if (!copy.code && prod.code) copy.code = prod.code;
                    if (!copy.dims && prod.dims) copy.dims = prod.dims;
                    if (!copy.meta) copy.meta = prod.materialsText || prod.goodFor || '';
                }
            }
        } catch (e) {}
        return copy;
    }

    function readStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(normalizeItem).filter(Boolean);
        } catch (e) {
            return [];
        }
    }

    function writeStorage(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {}
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function resolveAbsUrl(rel) {
        if (!rel) return '';
        try {
            return new URL(rel, global.location.href).href;
        } catch (e) {
            return rel;
        }
    }

    let items = readStorage();
    const listeners = new Set();

    function notify() {
        listeners.forEach(fn => {
            try { fn(items.slice()); } catch (e) {}
        });
    }

    function hasItem(id) {
        if (!id) return false;
        return items.some(it => it.id === id);
    }

    function addItem(item, opts) {
        if (!item || !item.name) return false;
        const id = String(item.id || item.name);
        const existingIdx = items.findIndex(it => it.id === id);
        if (existingIdx >= 0) {
            const existing = items.splice(existingIdx, 1)[0];
            if (opts && opts.increment) existing.qty = clampQty((existing.qty || 1) + 1);
            items.unshift(existing);
        } else {
            const norm = normalizeItem(item);
            if (norm) items.unshift(enrichItem(norm));
        }
        writeStorage(items);
        renderAll();
        notify();
        if (opts && opts.openDrawer) openDrawer();
        return true;
    }

    function setQty(idOrIndex, nextQty) {
        const idx = typeof idOrIndex === 'number'
            ? idOrIndex
            : items.findIndex(it => it.id === idOrIndex);
        if (idx < 0 || idx >= items.length) return;
        items[idx].qty = clampQty(nextQty);
        writeStorage(items);
        renderAll();
        notify();
    }

    function removeItem(idOrIndex) {
        if (typeof idOrIndex === 'number') {
            if (idOrIndex >= 0 && idOrIndex < items.length) {
                items.splice(idOrIndex, 1);
            }
        } else {
            const idx = items.findIndex(it => it.id === idOrIndex);
            if (idx >= 0) items.splice(idx, 1);
        }
        writeStorage(items);
        renderAll();
        notify();
    }

    function toggleItem(item, opts) {
        const id = item && (item.id || item.name);
        if (!id) return false;
        if (hasItem(id)) {
            removeItem(id);
            return false;
        }
        addItem(item, opts);
        return true;
    }

    function getItems() {
        return items.map(enrichItem);
    }

    function getTotalUnits() {
        return items.reduce((sum, it) => sum + clampQty(it.qty || 1), 0);
    }

    function buildWhatsAppHref() {
        const waNum = (global.PACTFORM_WA_NUMBER && /^\d{7,16}$/.test(String(global.PACTFORM_WA_NUMBER).trim()))
            ? String(global.PACTFORM_WA_NUMBER).trim()
            : '62xxxxxxxxxx';
        if (!items.length) {
            return 'https://wa.me/' + encodeURIComponent(waNum) + '?text=' + encodeURIComponent('Hi Pactform, I would like to enquire about your furniture collection.');
        }
        const enriched = items.map(enrichItem);
        const lines = enriched.map((it, idx) =>
            (idx + 1) + '. ' + it.name + ' (x' + clampQty(it.qty) + ')' +
            (it.code && it.code !== it.id ? ' [Ref: ' + it.code + ']' : '') +
            (it.meta ? ' — ' + it.meta : '')
        );
        const msg = 'Hi Pactform, I would like to enquire about the following pieces from my list (' +
            enriched.length + ' model' + (enriched.length === 1 ? '' : 's') + ', ' + getTotalUnits() + ' total pcs):\n\n' +
            lines.join('\n');
        return 'https://wa.me/' + encodeURIComponent(waNum) + '?text=' + encodeURIComponent(msg);
    }

    function buildShareUrl() {
        try {
            const url = new URL('collection.html', global.location.href);
            if (items.length) {
                const encoded = items.map(it => encodeURIComponent(it.id) + ':' + clampQty(it.qty)).join(',');
                url.searchParams.set('list', encoded);
                return url.href;
            }
        } catch (e) {}
        return global.location.href;
    }

    function importSharedListFromUrl() {
        try {
            const params = new URLSearchParams(global.location.search);
            const raw = params.get('list');
            if (!raw || !global.PactformCatalog || typeof global.PactformCatalog.getProduct !== 'function') return;
            const entries = raw.split(',').map(s => s.trim()).filter(Boolean);
            let added = 0;
            entries.forEach(entry => {
                const parts = entry.split(':');
                const pid = decodeURIComponent(parts[0] || '').trim();
                const qty = clampQty(parts[1] || 1);
                if (!pid) return;
                const prod = global.PactformCatalog.getProduct(pid);
                if (!prod) return;
                const existingIdx = items.findIndex(it => it.id === prod.id);
                if (existingIdx >= 0) {
                    items[existingIdx].qty = qty;
                } else {
                    items.push(normalizeItem({
                        id: prod.id,
                        name: prod.name,
                        meta: prod.materialsText || prod.goodFor || '',
                        href: 'product.html?id=' + encodeURIComponent(prod.id),
                        image: (prod.images && prod.images[0]) || '',
                        code: prod.code || '',
                        dims: prod.dims || '',
                        qty: qty
                    }));
                }
                added++;
            });
            if (added > 0) {
                writeStorage(items);
                renderAll();
                notify();
                openDrawer();
            }
        } catch (e) {}
    }

    function buildPrintablePdfHtml() {
        const enriched = items.map(enrichItem);
        const logoUrl = resolveAbsUrl('Logo Pactform.png');
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const totalModels = enriched.length;
        const totalPcs = getTotalUnits();
        const waNum = (global.PACTFORM_WA_NUMBER && /^\d{7,16}$/.test(String(global.PACTFORM_WA_NUMBER).trim()))
            ? String(global.PACTFORM_WA_NUMBER).trim()
            : '';

        const rowsHtml = enriched.map((it, idx) => {
            const imgUrl = it.image ? resolveAbsUrl(it.image) : '';
            const thumb = imgUrl
                ? '<img src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(it.name) + '" class="pdf-thumb">'
                : '<div class="pdf-thumb-empty">No photo</div>';
            return '<tr>' +
                '<td class="col-num">' + String(idx + 1).padStart(2, '0') + '</td>' +
                '<td class="col-img">' + thumb + '</td>' +
                '<td class="col-name"><strong>' + escapeHtml(it.name) + '</strong>' +
                    '<div class="sub">Ref: ' + escapeHtml(it.code || it.id) + '</div>' +
                '</td>' +
                '<td class="col-spec">' +
                    (it.dims ? '<div><strong>Dimensions:</strong> ' + escapeHtml(it.dims) + '</div>' : '') +
                    (it.meta ? '<div><strong>Details:</strong> ' + escapeHtml(it.meta) + '</div>' : '<div>Commercial specification</div>') +
                '</td>' +
                '<td class="col-qty"><strong>&times;' + clampQty(it.qty) + '</strong></td>' +
            '</tr>';
        }).join('');

        return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
            '<title>Pactform — Project Furniture List</title>' +
            '<style>' +
                '@page { size: A4; margin: 16mm 14mm; }' +
                'body { font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 28px; background: #fff; line-height: 1.45; }' +
                '.toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f5f3ef; border: 1px solid #e2ddd5; margin-bottom: 24px; }' +
                '.toolbar button { background: #ff4400; color: #fff; border: none; padding: 10px 18px; font: 700 13px/1 inherit; text-transform: uppercase; letter-spacing: 0.06em; cursor: pointer; }' +
                '.toolbar span { font-size: 13px; color: #5f5a53; }' +
                '.pdf-head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #ff4400; padding-bottom: 16px; margin-bottom: 22px; }' +
                '.pdf-head img { height: 42px; width: auto; display: block; }' +
                '.pdf-meta { text-align: right; font-size: 12px; color: #5f5a53; }' +
                '.pdf-meta h1 { font-size: 18px; letter-spacing: 0.06em; text-transform: uppercase; color: #1a1a1a; margin: 0 0 4px; }' +
                '.pdf-summary { display: flex; gap: 28px; padding: 12px 16px; background: #f5f3ef; border: 1px solid #e2ddd5; margin-bottom: 20px; font-size: 12px; }' +
                '.pdf-summary strong { display: block; font-size: 16px; color: #1a1a1a; }' +
                'table { width: 100%; border-collapse: collapse; }' +
                'th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #5f5a53; border-bottom: 1px solid #1a1a1a; padding: 8px 8px; }' +
                'td { padding: 12px 8px; border-bottom: 1px solid #e2ddd5; vertical-align: middle; font-size: 12.5px; }' +
                'tr { page-break-inside: avoid; }' +
                '.col-num { width: 32px; color: #ff4400; font-weight: 700; }' +
                '.col-img { width: 76px; }' +
                '.pdf-thumb { width: 66px; height: 54px; object-fit: cover; display: block; border: 1px solid #e2ddd5; }' +
                '.pdf-thumb-empty { width: 66px; height: 54px; background: #f5f3ef; border: 1px solid #e2ddd5; font-size: 10px; color: #777; display: flex; align-items: center; justify-content: center; text-align: center; }' +
                '.col-name strong { font-size: 13.5px; display: block; margin-bottom: 2px; }' +
                '.sub { font-size: 11px; color: #5f5a53; }' +
                '.col-spec { color: #3f3c37; font-size: 12px; }' +
                '.col-qty { width: 72px; text-align: right; font-size: 14px; white-space: nowrap; }' +
                '.pdf-foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2ddd5; font-size: 11px; color: #5f5a53; display: flex; justify-content: space-between; gap: 16px; }' +
                '@media print { body { padding: 0; } .toolbar { display: none !important; } }' +
            '</style></head><body>' +
            '<div class="toolbar">' +
                '<span>Choose <strong>Save as PDF</strong> in the print dialog to download this schedule.</span>' +
                '<button type="button" onclick="window.print()">Save as PDF / Print</button>' +
            '</div>' +
            '<div class="pdf-head">' +
                '<img src="' + escapeHtml(logoUrl) + '" alt="Pactform">' +
                '<div class="pdf-meta"><h1>Project Furniture List</h1><div>Generated ' + escapeHtml(dateStr) + '</div></div>' +
            '</div>' +
            '<div class="pdf-summary">' +
                '<div><span>Selected Models</span><strong>' + totalModels + '</strong></div>' +
                '<div><span>Total Quantity</span><strong>' + totalPcs + ' pcs</strong></div>' +
                '<div><span>Source</span><strong>Pactform Contract Furniture</strong></div>' +
            '</div>' +
            '<table><thead><tr><th>#</th><th>Photo</th><th>Piece</th><th>Specifications</th><th style="text-align:right;">Qty</th></tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody></table>' +
            '<div class="pdf-foot">' +
                '<span>Pactform — International Contract Furniture for Hospitality &amp; Commercial Spaces</span>' +
                '<span>' + (waNum ? 'WhatsApp: +' + escapeHtml(waNum) : 'pactform.com') + '</span>' +
            '</div>' +
            '</body></html>';
    }

    function exportListPdf() {
        const listItemsEl = document.getElementById('list-items');
        if (!items.length) {
            if (listItemsEl) {
                listItemsEl.innerHTML = '<p class="list-empty">Your list is empty. Add pieces from Collections first to download a PDF schedule.</p>';
            }
            return;
        }

        const html = buildPrintablePdfHtml();
        const triggerPrint = (win) => {
            const imgs = Array.from(win.document.images || []);
            let printed = false;
            const doPrint = () => {
                if (printed) return;
                printed = true;
                try { win.focus(); win.print(); } catch (e) {}
            };
            if (!imgs.length) { setTimeout(doPrint, 120); return; }
            let pending = imgs.length;
            const onDone = () => { if (--pending <= 0) setTimeout(doPrint, 120); };
            imgs.forEach(im => {
                if (im.complete) onDone();
                else { im.addEventListener('load', onDone, { once: true }); im.addEventListener('error', onDone, { once: true }); }
            });
            setTimeout(doPrint, 2200);
        };

        const popup = global.open('', '_blank');
        if (popup && popup.document) {
            popup.document.open();
            popup.document.write(html);
            popup.document.close();
            triggerPrint(popup);
            return;
        }

        // Popup-blocked fallback: print via hidden iframe
        const oldFrame = document.getElementById('pf-pdf-print-frame');
        if (oldFrame) oldFrame.remove();
        const iframe = document.createElement('iframe');
        iframe.id = 'pf-pdf-print-frame';
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        triggerPrint(iframe.contentWindow);
    }

    function updateButtonCounts() {
        const count = items.length;
        const label = count > 0 ? 'Your list (' + count + ')' : 'Your list';
        const desktopBtn = document.getElementById('toggle-list-btn');
        const mobileBtn = document.getElementById('toggle-list-btn-mobile');
        if (desktopBtn) desktopBtn.textContent = label;
        if (mobileBtn) mobileBtn.textContent = label;
    }

    function renderDrawerList() {
        const listItemsEl = document.getElementById('list-items');
        if (!listItemsEl) return;

        if (items.length === 0) {
            listItemsEl.innerHTML =
                '<div class="list-empty-wrap">' +
                    '<p class="list-empty">Your list is empty.</p>' +
                    '<a href="collection.html" class="list-empty-link">Browse Collections &rarr;</a>' +
                '</div>';
        } else {
            const enriched = items.map(enrichItem);
            listItemsEl.innerHTML = enriched.map((item, i) => {
                const titleHtml = item.href
                    ? '<a href="' + escapeHtml(item.href) + '" style="color:inherit;text-decoration:none;">' + escapeHtml(item.name) + '</a>'
                    : escapeHtml(item.name);
                const thumbHtml = item.image
                    ? '<img class="list-item-thumb" src="' + escapeHtml(item.image) + '" alt="" loading="lazy">'
                    : '';
                return '<div class="list-item" data-index="' + i + '" data-id="' + escapeHtml(item.id) + '">' +
                    thumbHtml +
                    '<div class="list-item-main">' +
                        '<h4>' + titleHtml + '</h4>' +
                        (item.meta ? '<p>' + escapeHtml(item.meta) + '</p>' : '') +
                        '<div class="list-qty-row">' +
                            '<span class="list-qty-label">Qty</span>' +
                            '<div class="list-qty-stepper">' +
                                '<button type="button" class="qty-btn" data-qty-act="dec" data-index="' + i + '" aria-label="Decrease quantity">&minus;</button>' +
                                '<input type="number" class="qty-input" data-index="' + i + '" min="1" max="9999" value="' + clampQty(item.qty) + '" aria-label="Quantity">' +
                                '<button type="button" class="qty-btn" data-qty-act="inc" data-index="' + i + '" aria-label="Increase quantity">+</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<button type="button" class="remove-item-btn" data-index="' + i + '" aria-label="Remove ' + escapeHtml(item.name) + '">' + TRASH_ICON + '</button>' +
                '</div>';
            }).join('');
        }

        const waBtn = document.querySelector('#list-modal .modal-actions a.btn-primary');
        if (waBtn) {
            waBtn.href = buildWhatsAppHref();
            waBtn.target = '_blank';
            waBtn.rel = 'noopener noreferrer';
        }
    }

    function renderAll() {
        renderDrawerList();
        updateButtonCounts();
    }

    function openDrawer() {
        const modal = document.getElementById('list-modal');
        const overlay = document.getElementById('drawer-overlay');
        if (!modal || !overlay) return;
        renderAll();
        modal.classList.remove('hidden');
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => overlay.classList.add('visible'));
    }

    function closeDrawer() {
        const modal = document.getElementById('list-modal');
        const overlay = document.getElementById('drawer-overlay');
        if (!modal || !overlay) return;
        modal.classList.add('hidden');
        overlay.classList.remove('visible');
        setTimeout(() => {
            if (modal.classList.contains('hidden')) overlay.classList.add('hidden');
        }, 300);
    }

    function toggleDrawer() {
        const modal = document.getElementById('list-modal');
        if (!modal) return;
        modal.classList.contains('hidden') ? openDrawer() : closeDrawer();
    }

    function init() {
        items = readStorage();
        renderAll();
        importSharedListFromUrl();

        const toggleListBtn = document.getElementById('toggle-list-btn');
        const toggleListBtnMobile = document.getElementById('toggle-list-btn-mobile');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const overlay = document.getElementById('drawer-overlay');
        const listItemsEl = document.getElementById('list-items');
        const copyLinkBtn = document.getElementById('copy-link-btn');
        const pdfBtn = Array.from(document.querySelectorAll('#list-modal .modal-actions button'))
            .find(b => b.id !== 'copy-link-btn' && /pdf/i.test(b.textContent || ''));

        if (toggleListBtn) toggleListBtn.addEventListener('click', toggleDrawer);
        if (toggleListBtnMobile) {
            toggleListBtnMobile.addEventListener('click', () => {
                if (global.__pactformCloseNav) global.__pactformCloseNav();
                toggleDrawer();
            });
        }
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDrawer();
        });

        if (listItemsEl) {
            listItemsEl.addEventListener('click', (e) => {
                const qtyBtn = e.target.closest('.qty-btn');
                if (qtyBtn) {
                    const idx = Number(qtyBtn.dataset.index);
                    const cur = items[idx] ? clampQty(items[idx].qty) : 1;
                    const next = qtyBtn.dataset.qtyAct === 'inc' ? cur + 1 : Math.max(1, cur - 1);
                    setQty(idx, next);
                    return;
                }
                const btn = e.target.closest('.remove-item-btn');
                if (!btn) return;
                const index = Number(btn.dataset.index);
                const row = btn.closest('.list-item');
                if (row) row.classList.add('removing');
                setTimeout(() => removeItem(index), 180);
            });

            listItemsEl.addEventListener('change', (e) => {
                if (!e.target.classList.contains('qty-input')) return;
                const idx = Number(e.target.dataset.index);
                setQty(idx, e.target.value);
            });
        }

        if (pdfBtn) {
            pdfBtn.addEventListener('click', exportListPdf);
        }

        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                const url = buildShareUrl();
                const done = () => {
                    const original = copyLinkBtn.textContent;
                    copyLinkBtn.textContent = 'Link copied';
                    setTimeout(() => { copyLinkBtn.textContent = original; }, 1600);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).then(done).catch(() => {});
                }
            });
        }

        // Sync across tabs
        global.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY) {
                items = readStorage();
                renderAll();
                notify();
            }
        });

        // Re-sync WhatsApp link once site-content-loader.js finishes loading
        global.addEventListener('pactform:site-content-ready', () => {
            renderDrawerList();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.PactformList = {
        getItems,
        getTotalUnits,
        hasItem,
        addItem,
        setQty,
        removeItem,
        toggleItem,
        exportListPdf,
        openDrawer,
        closeDrawer,
        subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
    };
})(window);
