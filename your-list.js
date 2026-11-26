/* ==========================================================================
   your-list.js
   Persistent "Your list" enquiry drawer shared across collection.html,
   category.html, and product.html (and safe on any page with #list-modal).
   Stores selected pieces in localStorage so items persist across categories
   and page reloads without introducing a cart or checkout flow.
   ========================================================================== */
(function (global) {
    'use strict';

    const STORAGE_KEY = 'pactform-your-list-v1';
    const TRASH_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

    function readStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function writeStorage(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (e) {}
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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
        const id = item.id || item.name;
        const existingIdx = items.findIndex(it => it.id === id);
        if (existingIdx >= 0) {
            // Move to top so user sees it immediately
            const existing = items.splice(existingIdx, 1)[0];
            items.unshift(existing);
        } else {
            items.unshift({
                id: id,
                name: item.name,
                meta: item.meta || '',
                href: item.href || (item.id ? 'product.html?id=' + encodeURIComponent(item.id) : ''),
                image: item.image || ''
            });
        }
        writeStorage(items);
        renderAll();
        notify();
        if (opts && opts.openDrawer) openDrawer();
        return true;
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
        return items.slice();
    }

    function buildWhatsAppHref() {
        const waNum = (global.PACTFORM_WA_NUMBER && String(global.PACTFORM_WA_NUMBER).trim()) || '62xxxxxxxxxx';
        if (!items.length) {
            return 'https://wa.me/' + encodeURIComponent(waNum) + '?text=' + encodeURIComponent('Hi Pactform, I would like to enquire about your furniture collection.');
        }
        const lines = items.map((it, idx) => (idx + 1) + '. ' + it.name + (it.meta ? ' — ' + it.meta : ''));
        const msg = 'Hi Pactform, I would like to enquire about the following pieces from my list:\n\n' + lines.join('\n');
        return 'https://wa.me/' + encodeURIComponent(waNum) + '?text=' + encodeURIComponent(msg);
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
            listItemsEl.innerHTML = '<p class="list-empty">Your list is empty.</p>';
        } else {
            listItemsEl.innerHTML = items.map((item, i) => {
                const titleHtml = item.href
                    ? '<a href="' + escapeHtml(item.href) + '" style="color:inherit;text-decoration:none;">' + escapeHtml(item.name) + '</a>'
                    : escapeHtml(item.name);
                return '<div class="list-item" data-index="' + i + '" data-id="' + escapeHtml(item.id) + '">' +
                    '<div class="list-item-main"><h4>' + titleHtml + '</h4><p>' + escapeHtml(item.meta) + '</p></div>' +
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

        const toggleListBtn = document.getElementById('toggle-list-btn');
        const toggleListBtnMobile = document.getElementById('toggle-list-btn-mobile');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const overlay = document.getElementById('drawer-overlay');
        const listItemsEl = document.getElementById('list-items');
        const copyLinkBtn = document.getElementById('copy-link-btn');

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
                const btn = e.target.closest('.remove-item-btn');
                if (!btn) return;
                const index = Number(btn.dataset.index);
                const row = btn.closest('.list-item');
                if (row) row.classList.add('removing');
                setTimeout(() => removeItem(index), 180);
            });
        }

        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                const url = global.location.href;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).then(() => {
                        const original = copyLinkBtn.textContent;
                        copyLinkBtn.textContent = 'Link copied';
                        setTimeout(() => { copyLinkBtn.textContent = original; }, 1500);
                    }).catch(() => {});
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
        hasItem,
        addItem,
        removeItem,
        toggleItem,
        openDrawer,
        closeDrawer,
        subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
    };
})(window);
