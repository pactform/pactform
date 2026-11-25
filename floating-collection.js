/* ==========================================================================
   floating-collection.js
   Interactive free-floating, 360-degree swipeable/draggable category cards for
   "THE COLLECTION" launched from the homepage OPEN button.
   ========================================================================== */
(function () {
    'use strict';

    const FALLBACK_CATEGORIES = [
        {
            title: 'COMMERCIAL',
            category: 'commercial',
            src: 'commercial interior.jpg',
            tone: 'photo',
            depth: 'near',
            ratio: 1.48
        },
        {
            title: 'OFFICE',
            category: 'office',
            src: 'office.jpg',
            tone: 'photo',
            depth: 'near',
            ratio: 1.45
        },
        {
            title: 'OUTDOOR',
            category: 'outdoor',
            src: 'outdoor.jpg',
            tone: 'photo',
            depth: 'near',
            ratio: 1.72
        },
        {
            title: 'DINING CHAIRS',
            category: 'dining-chairs',
            src: 'dining.jpg',
            tone: 'photo',
            depth: 'near',
            ratio: 1.56
        },
        {
            title: 'BAR STOOLS',
            category: 'bar-stools',
            src: 'bar.jpg',
            tone: 'photo',
            depth: 'mid',
            ratio: 1.56
        },
        {
            title: 'BOOTH SEATING',
            category: 'booth-seating',
            src: 'booth.jpg',
            tone: 'photo',
            depth: 'mid',
            ratio: 1.56
        },
        {
            title: 'LOUNGE CHAIRS',
            category: 'lounge-chairs',
            src: 'lounge.jpg',
            tone: 'photo',
            depth: 'mid',
            ratio: 1.56
        },
        {
            title: 'MEETING CHAIRS',
            category: 'meeting-chairs',
            src: 'meeting.jpg',
            tone: 'photo',
            depth: 'mid',
            ratio: 1.56
        },
        {
            title: 'STORAGE',
            category: 'storage',
            src: 'storage.jpg',
            tone: 'photo',
            depth: 'far',
            ratio: 1.56
        },
        {
            title: 'Dining Tables',
            category: 'dining-tables',
            src: 'dining-tables.jpg',
            tone: 'photo',
            depth: 'mid',
            ratio: 1.56
        },
        {
            title: 'Coffee Tables',
            category: 'coffee-tables',
            src: 'coffee-tables.jpg',
            tone: 'photo',
            depth: 'far',
            ratio: 1.56
        },
        {
            title: 'Side Tables',
            category: 'side-tables',
            src: 'side-tables.jpg',
            tone: 'photo',
            depth: 'far',
            ratio: 1.56
        },
        {
            title: 'Outdoor Tables',
            category: 'outdoor-tables',
            src: 'outdoor-tables.jpg',
            tone: 'photo',
            depth: 'far',
            ratio: 1.56
        }
    ];

    function getCollectionCategories() {
        if (window.PactformCatalog && typeof window.PactformCatalog.getCategories === 'function') {
            const cats = window.PactformCatalog.getCategories().filter(c => c.showOnHome !== false);
            if (cats.length) {
                const depths = ['near', 'near', 'near', 'near', 'mid', 'mid', 'mid', 'mid', 'far', 'mid', 'far', 'far', 'far'];
                return cats.map((c, idx) => ({
                    title: c.homeTitle || c.name.toUpperCase(),
                    category: c.slug,
                    src: c.image || null,
                    tone: c.image ? 'photo' : 'dark',
                    depth: depths[idx % depths.length],
                    ratio: c.slug === 'outdoor' ? 1.72 : (c.group === 'space' ? 1.48 : 1.56)
                }));
            }
        }
        return FALLBACK_CATEGORIES;
    }

    const COLLECTION_CATEGORIES = getCollectionCategories();

    const DEPTH_CONFIG = {
        far:  { speedMul: 0.62, parallax: 16, desktopW: [200, 232], mobileW: [148, 168] },
        mid:  { speedMul: 0.86, parallax: 28, desktopW: [236, 274], mobileW: [168, 192] },
        near: { speedMul: 1.08, parallax: 42, desktopW: [276, 326], mobileW: [190, 218] }
    };

    function seededRandom(seed) {
        let s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function () {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function wrapCoord(val, min, span) {
        return ((((val - min) % span) + span) % span) + min;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('floating-collection-overlay');
        const stage = document.getElementById('fc-stage');
        const openBtn = document.getElementById('open-collection-btn');
        const mediaTrigger = document.getElementById('collection-showcase-trigger');
        const closeBtn = document.getElementById('close-collection-btn');
        const hintEl = document.getElementById('fc-hint');

        if (!overlay || !stage || !openBtn) return;

        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        let isOpen = false;
        let isInitialized = false;
        let rafId = null;
        let lastTs = 0;

        let vw = window.innerWidth;
        let vh = window.innerHeight;
        let worldW = 0;
        let worldH = 0;
        let padX = 220;
        let padY = 180;

        const tiles = [];

        // Camera / swipe physics state
        let isDragging = false;
        let hasPointerCapture = false;
        let activePointerId = null;
        let prevPointerX = 0;
        let prevPointerY = 0;
        let dragTravel = 0;
        let suppressNextClick = false;

        let velX = 0;
        let velY = 0;
        let hasInteracted = false;

        // Subtle pointer parallax (desktop)
        let targetMouseX = 0;
        let targetMouseY = 0;
        let smoothMouseX = 0;
        let smoothMouseY = 0;

        function computeWorldBounds() {
            vw = window.innerWidth;
            vh = window.innerHeight;
            const isMobile = vw <= 768;
            padX = isMobile ? 160 : 220;
            padY = isMobile ? 140 : 180;
            worldW = Math.max(vw + padX * 2, isMobile ? 760 : 1580);
            worldH = Math.max(vh + padY * 2, isMobile ? 1020 : 1120);
        }

        function sizeTile(tile) {
            const isMobile = vw <= 768;
            const cfg = DEPTH_CONFIG[tile.depth];
            const range = isMobile ? cfg.mobileW : cfg.desktopW;
            const w = Math.round(range[0] + tile.sizeT * (range[1] - range[0]));
            const h = Math.round(w / tile.ratio);
            tile.w = w;
            tile.h = h;
            tile.el.style.width = w + 'px';
            tile.el.style.height = h + 'px';
        }

        function buildTiles() {
            if (isInitialized) return;
            isInitialized = true;
            computeWorldBounds();

            const rand = seededRandom(51937);
            const cols = vw <= 768 ? 3 : 4;
            const rows = Math.ceil(COLLECTION_CATEGORIES.length / cols);
            const cellW = worldW / cols;
            const cellH = worldH / rows;

            // Shuffle grid slot indices so photo & gradient cards scatter organically
            const slots = [];
            for (let i = 0; i < cols * rows; i++) slots.push(i);
            for (let i = slots.length - 1; i > 0; i--) {
                const j = Math.floor(rand() * (i + 1));
                const tmp = slots[i];
                slots[i] = slots[j];
                slots[j] = tmp;
            }

            const frag = document.createDocumentFragment();

            COLLECTION_CATEGORIES.forEach((item, idx) => {
                const slot = slots[idx];
                const col = slot % cols;
                const row = Math.floor(slot / cols);

                const link = document.createElement('a');
                link.className = 'fc-item';
                link.href = 'category.html?type=' + encodeURIComponent(item.category);
                link.dataset.depth = item.depth;
                link.setAttribute('draggable', 'false');

                const card = document.createElement('div');
                card.className = 'fc-item-card fc-tone-' + item.tone;

                if (item.src) {
                    const img = document.createElement('img');
                    img.src = item.src;
                    img.alt = item.title;
                    img.decoding = 'async';
                    img.loading = 'eager';
                    img.setAttribute('draggable', 'false');
                    card.appendChild(img);
                }

                const titleWrap = document.createElement('div');
                titleWrap.className = 'fc-item-title-wrap';

                const titleEl = document.createElement('span');
                titleEl.className = 'fc-item-title';
                titleEl.textContent = item.title;

                const subEl = document.createElement('span');
                subEl.className = 'fc-item-explore';
                subEl.textContent = 'Explore \u2192';

                titleWrap.appendChild(titleEl);
                titleWrap.appendChild(subEl);
                card.appendChild(titleWrap);
                link.appendChild(card);

                // Prevent accidental navigation right after a swipe/drag
                link.addEventListener('click', (e) => {
                    if (suppressNextClick || dragTravel > 7) {
                        e.preventDefault();
                    }
                });

                const jitterX = (rand() - 0.5) * cellW * 0.48;
                const jitterY = (rand() - 0.5) * cellH * 0.48;
                let x = -padX + (col + 0.5) * cellW + jitterX;
                let y = -padY + (row + 0.5) * cellH + jitterY;

                // Keep initial viewport center slightly clear so THE COLLECTION greets cleanly
                const centerX = vw * 0.5;
                const centerY = vh * 0.5;
                const dxCenter = x - centerX;
                const dyCenter = y - centerY;
                const distCenter = Math.hypot(dxCenter, dyCenter);
                const clearRadius = vw <= 768 ? 170 : 255;
                if (distCenter < clearRadius) {
                    const anglePush = distCenter > 1 ? Math.atan2(dyCenter, dxCenter) : rand() * Math.PI * 2;
                    x = centerX + Math.cos(anglePush) * (clearRadius + 30 + rand() * 45);
                    y = centerY + Math.sin(anglePush) * (clearRadius + 25 + rand() * 40);
                }

                // Organic multi-directional drift (independent angle & gentle wander per card)
                const baseAngle = rand() * Math.PI * 2;
                const baseSpeed = 14 + rand() * 16; // pixels per second

                const tile = {
                    el: link,
                    depth: item.depth,
                    ratio: item.ratio,
                    sizeT: rand(),
                    w: 240,
                    h: 154,
                    x: x,
                    y: y,
                    angle: baseAngle,
                    wanderSpeed: (rand() - 0.5) * 0.24,
                    speed: baseSpeed * DEPTH_CONFIG[item.depth].speedMul,
                    bobAmpX: 6 + rand() * 10,
                    bobAmpY: 6 + rand() * 10,
                    bobFreqX: 0.22 + rand() * 0.26,
                    bobFreqY: 0.2 + rand() * 0.24,
                    bobPhaseX: rand() * Math.PI * 2,
                    bobPhaseY: rand() * Math.PI * 2,
                    speedMul: DEPTH_CONFIG[item.depth].speedMul,
                    parallax: DEPTH_CONFIG[item.depth].parallax
                };

                sizeTile(tile);
                tiles.push(tile);
                frag.appendChild(link);
            });

            stage.appendChild(frag);
        }

        function markInteracted() {
            if (!hasInteracted) {
                hasInteracted = true;
                if (hintEl) hintEl.classList.add('is-hidden');
            }
        }

        function renderFrame(ts) {
            if (!isOpen) return;

            if (!lastTs) lastTs = ts;
            const dt = Math.min((ts - lastTs) / 1000, 0.05);
            lastTs = ts;
            const timeSec = ts * 0.001;
            const reduced = reducedMotionQuery.matches;

            // Smooth pointer parallax easing
            smoothMouseX += (targetMouseX - smoothMouseX) * 0.06;
            smoothMouseY += (targetMouseY - smoothMouseY) * 0.06;

            // Apply inertial coasting when not dragging
            let stepPanX = 0;
            let stepPanY = 0;
            if (!isDragging) {
                stepPanX = velX;
                stepPanY = velY;
                const friction = Math.pow(0.93, dt * 60);
                velX *= friction;
                velY *= friction;
                if (Math.abs(velX) < 0.04) velX = 0;
                if (Math.abs(velY) < 0.04) velY = 0;
            }

            const minX = -padX;
            const minY = -padY;

            for (let i = 0; i < tiles.length; i++) {
                const t = tiles[i];

                // Organic aimless drift in varied directions
                if (!reduced) {
                    t.angle += t.wanderSpeed * dt;
                    t.x += Math.cos(t.angle) * t.speed * dt;
                    t.y += Math.sin(t.angle) * t.speed * dt;
                }

                // Swipe / momentum pan scaled by depth plane
                t.x += stepPanX * t.speedMul;
                t.y += stepPanY * t.speedMul;

                // Seamless infinite toroidal wrap around the expanded world
                t.x = wrapCoord(t.x, minX, worldW);
                t.y = wrapCoord(t.y, minY, worldH);

                // Subtle organic floating bob + mouse parallax
                const bobX = reduced ? 0 : Math.sin(timeSec * t.bobFreqX + t.bobPhaseX) * t.bobAmpX;
                const bobY = reduced ? 0 : Math.cos(timeSec * t.bobFreqY + t.bobPhaseY) * t.bobAmpY;
                const px = -smoothMouseX * t.parallax;
                const py = -smoothMouseY * t.parallax;

                const drawX = t.x + bobX + px - t.w * 0.5;
                const drawY = t.y + bobY + py - t.h * 0.5;

                t.el.style.transform = 'translate3d(' + drawX.toFixed(1) + 'px,' + drawY.toFixed(1) + 'px,0)';
            }

            rafId = requestAnimationFrame(renderFrame);
        }

        function openCollection() {
            if (isOpen) return;
            buildTiles();
            isOpen = true;
            lastTs = 0;
            velX = 0;
            velY = 0;

            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('fc-lock-scroll');

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(renderFrame);

            if (closeBtn) {
                setTimeout(() => closeBtn.focus({ preventScroll: true }), 120);
            }
        }

        function closeCollection() {
            if (!isOpen) return;
            isOpen = false;
            isDragging = false;
            hasPointerCapture = false;
            stage.classList.remove('is-dragging');

            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('fc-lock-scroll');

            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            openBtn.focus({ preventScroll: true });
        }

        // Open triggers
        openBtn.addEventListener('click', openCollection);
        if (mediaTrigger) {
            mediaTrigger.addEventListener('click', openCollection);
            mediaTrigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCollection();
                }
            });
        }

        // Close triggers
        if (closeBtn) closeBtn.addEventListener('click', closeCollection);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeCollection();
            }
        });

        // Pointer drag / swipe in any direction (mouse + touch + pen)
        stage.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            isDragging = true;
            hasPointerCapture = false;
            activePointerId = e.pointerId;
            prevPointerX = e.clientX;
            prevPointerY = e.clientY;
            dragTravel = 0;
            suppressNextClick = false;
            velX = 0;
            velY = 0;
            stage.classList.add('is-dragging');
        });

        stage.addEventListener('pointermove', (e) => {
            // Update subtle mouse parallax on hover
            if (e.pointerType === 'mouse') {
                targetMouseX = (e.clientX / Math.max(vw, 1) - 0.5) * 2;
                targetMouseY = (e.clientY / Math.max(vh, 1) - 0.5) * 2;
            }

            if (!isDragging || e.pointerId !== activePointerId) return;

            const dx = e.clientX - prevPointerX;
            const dy = e.clientY - prevPointerY;
            prevPointerX = e.clientX;
            prevPointerY = e.clientY;
            dragTravel += Math.hypot(dx, dy);

            if (dragTravel > 5 && !hasPointerCapture) {
                hasPointerCapture = true;
                try { stage.setPointerCapture(e.pointerId); } catch (_) {}
            }

            if (dragTravel > 7) {
                suppressNextClick = true;
                markInteracted();
            }

            // Directly shift every tile by depth-scaled drag delta
            for (let i = 0; i < tiles.length; i++) {
                tiles[i].x += dx * tiles[i].speedMul;
                tiles[i].y += dy * tiles[i].speedMul;
            }

            // Smooth velocity estimate for silky release inertia
            velX = velX * 0.55 + dx * 0.65;
            velY = velY * 0.55 + dy * 0.65;
        });

        function endDrag(e) {
            if (!isDragging || (e && activePointerId !== null && e.pointerId !== activePointerId)) return;
            isDragging = false;
            stage.classList.remove('is-dragging');
            if (e && hasPointerCapture) {
                try { stage.releasePointerCapture(e.pointerId); } catch (_) {}
            }
            hasPointerCapture = false;
            activePointerId = null;
            if (suppressNextClick) {
                setTimeout(() => { suppressNextClick = false; }, 80);
            }
        }

        stage.addEventListener('pointerup', endDrag);
        stage.addEventListener('pointercancel', endDrag);

        // Mouse wheel / trackpad 2D glide
        overlay.addEventListener('wheel', (e) => {
            if (!isOpen) return;
            e.preventDefault();
            markInteracted();
            velX -= e.deltaX * 0.14;
            velY -= e.deltaY * 0.14;
        }, { passive: false });

        // Handle viewport resize cleanly
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (!isInitialized) return;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                computeWorldBounds();
                for (let i = 0; i < tiles.length; i++) {
                    sizeTile(tiles[i]);
                }
            }, 120);
        });
    });
})();
