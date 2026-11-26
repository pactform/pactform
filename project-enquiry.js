/* ==========================================================================
   project-enquiry.js
   Powers the B2B Project / BOQ upload dropzone (index.html), Request a Project
   Review (projects.html), Send your spec sheet (custom.html), and fallback
   Contact Sales links with a clean architectural enquiry modal supporting
   Formspree / Web3Forms + pre-filled WhatsApp handoff and Your List attachment.
   ========================================================================== */
(function (global) {
    'use strict';

    if (global.__pactformEnquiryLoaded) return;
    global.__pactformEnquiryLoaded = true;

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatSize(bytes) {
        if (!bytes || bytes < 1024) return (bytes || 0) + ' B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function getWaNumber() {
        const num = global.PACTFORM_WA_NUMBER && String(global.PACTFORM_WA_NUMBER).trim();
        return (num && /^\d{7,16}$/.test(num)) ? num : '62xxxxxxxxxx';
    }

    function buildModalMarkup() {
        return (
            '<div class="updates-overlay hidden" id="enquiry-overlay" aria-hidden="true"></div>' +
            '<div class="updates-modal enquiry-modal hidden" id="enquiry-modal" role="dialog" aria-modal="true" aria-labelledby="enquiry-modal-title">' +
                '<div class="updates-modal-header">' +
                    '<div>' +
                        '<span class="updates-eyebrow" id="enquiry-eyebrow">PROJECT ENQUIRY</span>' +
                        '<h3 id="enquiry-modal-title">Submit Your Project Brief or BOQ</h3>' +
                    '</div>' +
                    '<button type="button" class="close-btn" id="close-enquiry-btn" aria-label="Close">&times;</button>' +
                '</div>' +
                '<div class="updates-modal-body">' +
                    '<p class="updates-intro" id="enquiry-intro">Share your project requirements, quantities, drawings, or BOQ. Our team will review and respond with options, timelines, and next steps.</p>' +
                    '<form id="enquiry-form" novalidate>' +
                        '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;" aria-hidden="true">' +
                        '<div class="enquiry-grid">' +
                            '<div class="enquiry-field full">' +
                                '<label for="enq-type">Enquiry Type</label>' +
                                '<select id="enq-type" name="enquiry_type">' +
                                    '<option value="Project / BOQ Submission">Project / BOQ Submission</option>' +
                                    '<option value="Custom Piece / Spec Sheet">Custom Piece / Spec Sheet</option>' +
                                    '<option value="General Sales Enquiry">General Sales Enquiry</option>' +
                                '</select>' +
                            '</div>' +
                            '<div class="enquiry-field">' +
                                '<label for="enq-name">Your Name <span class="updates-req">*</span></label>' +
                                '<input type="text" id="enq-name" name="name" placeholder="Full name" required autocomplete="name">' +
                            '</div>' +
                            '<div class="enquiry-field">' +
                                '<label for="enq-email">Work Email <span class="updates-req">*</span></label>' +
                                '<input type="email" id="enq-email" name="email" placeholder="you@studio.com" required autocomplete="email">' +
                            '</div>' +
                            '<div class="enquiry-field">' +
                                '<label for="enq-company">Studio / Company <span class="updates-opt">(optional)</span></label>' +
                                '<input type="text" id="enq-company" name="company" placeholder="Design studio, hotel, or operator">' +
                            '</div>' +
                            '<div class="enquiry-field">' +
                                '<label for="enq-location">Project City &amp; Country</label>' +
                                '<input type="text" id="enq-location" name="location" placeholder="e.g. Bali, Singapore, Sydney">' +
                            '</div>' +
                            '<div class="enquiry-field">' +
                                '<label for="enq-space">Space Type</label>' +
                                '<select id="enq-space" name="space_type">' +
                                    '<option value="Restaurant / Café">Restaurant / Café</option>' +
                                    '<option value="Hotel / Resort">Hotel / Resort</option>' +
                                    '<option value="Office / Workplace">Office / Workplace</option>' +
                                    '<option value="Commercial / Retail">Commercial / Retail</option>' +
                                    '<option value="Residential / Private">Residential / Private</option>' +
                                '</select>' +
                            '</div>' +
                            '<div class="enquiry-field">' +
                                '<label for="enq-timeline">Target Handover / Timeline <span class="updates-opt">(optional)</span></label>' +
                                '<input type="text" id="enq-timeline" name="timeline" placeholder="e.g. Q3 2026 / 12 weeks">' +
                            '</div>' +
                            '<div class="enquiry-field full">' +
                                '<label>Attach Drawings, Spec Sheet or BOQ <span class="updates-opt">(optional)</span></label>' +
                                '<label class="enquiry-dropzone" id="enq-dropzone">' +
                                    '<strong>Drop files here or click to browse</strong>' +
                                    '<span>Supports PDF, DWG, XLSX, ZIP, JPG, PNG</span>' +
                                    '<input type="file" id="enq-files" multiple accept=".pdf,.dwg,.dxf,.xls,.xlsx,.csv,.zip,.png,.jpg,.jpeg,.webp" style="display:none;">' +
                                '</label>' +
                                '<div class="enquiry-files-list" id="enq-files-list"></div>' +
                            '</div>' +
                            '<div class="enquiry-field full">' +
                                '<label for="enq-link">Or Share Folder Link <span class="updates-opt">(Google Drive / Dropbox / WeTransfer)</span></label>' +
                                '<input type="url" id="enq-link" name="file_link" placeholder="https://drive.google.com/...">' +
                            '</div>' +
                            '<div class="enquiry-field full">' +
                                '<label for="enq-notes">Project Brief &amp; Quantities</label>' +
                                '<textarea id="enq-notes" name="notes" placeholder="Describe the pieces, estimated quantities, materials, or special requirements..."></textarea>' +
                            '</div>' +
                        '</div>' +
                        '<label class="enquiry-check-row hidden" id="enq-include-list-row">' +
                            '<input type="checkbox" id="enq-include-list" checked>' +
                            '<span id="enq-include-list-label">Include items from Your List</span>' +
                        '</label>' +
                        '<p class="updates-feedback hidden" id="enq-feedback" role="status" aria-live="polite"></p>' +
                        '<div class="enquiry-actions-row">' +
                            '<button type="submit" class="btn btn-primary" id="enq-submit-btn">Submit Enquiry</button>' +
                            '<button type="button" class="btn btn-secondary" id="enq-wa-btn">Send via WhatsApp</button>' +
                        '</div>' +
                    '</form>' +
                    '<div class="updates-success hidden" id="enq-success">' +
                        '<span class="updates-success-mark" aria-hidden="true">&#10003;</span>' +
                        '<h4>Enquiry received.</h4>' +
                        '<p id="enq-success-text">Thank you. Our project team will review your brief and follow up shortly.</p>' +
                        '<div class="enquiry-actions-row">' +
                            '<a href="#" class="btn btn-primary" id="enq-success-wa" target="_blank" rel="noopener noreferrer">Also Send on WhatsApp</a>' +
                            '<button type="button" class="btn btn-secondary" id="enq-done-btn">Done</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }

    function init() {
        if (!document.getElementById('enquiry-modal')) {
            const wrap = document.createElement('div');
            wrap.innerHTML = buildModalMarkup();
            while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
        }

        const overlay = document.getElementById('enquiry-overlay');
        const modal = document.getElementById('enquiry-modal');
        const closeBtn = document.getElementById('close-enquiry-btn');
        const doneBtn = document.getElementById('enq-done-btn');
        const form = document.getElementById('enquiry-form');
        const eyebrowEl = document.getElementById('enquiry-eyebrow');
        const titleEl = document.getElementById('enquiry-modal-title');
        const typeEl = document.getElementById('enq-type');
        const nameEl = document.getElementById('enq-name');
        const emailEl = document.getElementById('enq-email');
        const companyEl = document.getElementById('enq-company');
        const locationEl = document.getElementById('enq-location');
        const spaceEl = document.getElementById('enq-space');
        const timelineEl = document.getElementById('enq-timeline');
        const linkEl = document.getElementById('enq-link');
        const notesEl = document.getElementById('enq-notes');
        const dropzone = document.getElementById('enq-dropzone');
        const fileInput = document.getElementById('enq-files');
        const filesListEl = document.getElementById('enq-files-list');
        const listRow = document.getElementById('enq-include-list-row');
        const listCheck = document.getElementById('enq-include-list');
        const listLabel = document.getElementById('enq-include-list-label');
        const feedbackEl = document.getElementById('enq-feedback');
        const submitBtn = document.getElementById('enq-submit-btn');
        const waBtn = document.getElementById('enq-wa-btn');
        const successEl = document.getElementById('enq-success');
        const successText = document.getElementById('enq-success-text');
        const successWa = document.getElementById('enq-success-wa');

        let attachedFiles = [];

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

        function renderFiles() {
            if (!attachedFiles.length) {
                filesListEl.innerHTML = '';
                return;
            }
            filesListEl.innerHTML = attachedFiles.map((f, i) =>
                '<div class="enquiry-file-chip">' +
                    '<span><strong>' + escapeHtml(f.name) + '</strong> (' + escapeHtml(formatSize(f.size)) + ')</span>' +
                    '<button type="button" data-rm-file="' + i + '" aria-label="Remove file">&times;</button>' +
                '</div>'
            ).join('');
        }

        function addFiles(fileList) {
            const incoming = Array.from(fileList || []);
            incoming.forEach(f => {
                if (!attachedFiles.some(x => x.name === f.name && x.size === f.size)) {
                    attachedFiles.push(f);
                }
            });
            renderFiles();
        }

        function syncListCheckbox() {
            const listApi = global.PactformList;
            const items = listApi && typeof listApi.getItems === 'function' ? listApi.getItems() : [];
            if (items.length > 0) {
                const pcs = listApi.getTotalUnits ? listApi.getTotalUnits() : items.length;
                listLabel.textContent = 'Include my "Your List" items (' + items.length + ' model' + (items.length === 1 ? '' : 's') + ', ' + pcs + ' pcs)';
                listRow.classList.remove('hidden');
            } else {
                listRow.classList.add('hidden');
            }
        }

        function openModal(opts) {
            const cfg = opts || {};
            clearFeedback();
            form.classList.remove('hidden');
            successEl.classList.add('hidden');
            if (cfg.mode === 'custom') {
                eyebrowEl.textContent = 'CUSTOM SPECIFICATION';
                titleEl.textContent = 'Send Your Custom Spec Sheet';
                typeEl.value = 'Custom Piece / Spec Sheet';
            } else if (cfg.mode === 'sales') {
                eyebrowEl.textContent = 'CONTACT SALES';
                titleEl.textContent = 'Discuss Your Project With Pactform';
                typeEl.value = 'General Sales Enquiry';
            } else {
                eyebrowEl.textContent = 'PROJECT ENQUIRY';
                titleEl.textContent = 'Submit Your Project Brief or BOQ';
                typeEl.value = 'Project / BOQ Submission';
            }
            if (cfg.files && cfg.files.length) addFiles(cfg.files);
            syncListCheckbox();

            modal.classList.remove('hidden');
            overlay.classList.remove('hidden');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('updates-modal-open');
            requestAnimationFrame(() => {
                overlay.classList.add('visible');
                modal.classList.add('visible');
                if (nameEl) nameEl.focus();
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

        function getListSummaryLines() {
            if (!listCheck.checked || listRow.classList.contains('hidden')) return [];
            const listApi = global.PactformList;
            const items = listApi && typeof listApi.getItems === 'function' ? listApi.getItems() : [];
            return items.map((it, idx) => (idx + 1) + '. ' + it.name + ' (x' + (it.qty || 1) + ')' + (it.meta ? ' — ' + it.meta : ''));
        }

        function collectPayload() {
            const listLines = getListSummaryLines();
            const fileNames = attachedFiles.map(f => f.name + ' (' + formatSize(f.size) + ')');
            return {
                enquiry_type: typeEl.value,
                name: (nameEl.value || '').trim(),
                email: (emailEl.value || '').trim(),
                company: (companyEl.value || '').trim(),
                location: (locationEl.value || '').trim(),
                space_type: spaceEl.value,
                timeline: (timelineEl.value || '').trim(),
                file_link: (linkEl.value || '').trim(),
                attached_files: fileNames.join(', '),
                notes: (notesEl.value || '').trim(),
                your_list: listLines.join('\n'),
                source_page: global.location.href
            };
        }

        function buildWhatsAppUrl(payload) {
            const lines = [
                'Hi Pactform, I would like to submit a ' + payload.enquiry_type + ':',
                ''
            ];
            if (payload.name) lines.push('Name: ' + payload.name);
            if (payload.company) lines.push('Company / Studio: ' + payload.company);
            if (payload.email) lines.push('Email: ' + payload.email);
            if (payload.location) lines.push('Location: ' + payload.location);
            if (payload.space_type) lines.push('Space Type: ' + payload.space_type);
            if (payload.timeline) lines.push('Timeline: ' + payload.timeline);
            if (payload.file_link) lines.push('BOQ / Reference Link: ' + payload.file_link);
            if (payload.attached_files) lines.push('Files Ready to Share: ' + payload.attached_files);
            if (payload.notes) lines.push('', 'Brief:', payload.notes);
            if (payload.your_list) lines.push('', 'Selected Pieces:', payload.your_list);
            return 'https://wa.me/' + encodeURIComponent(getWaNumber()) + '?text=' + encodeURIComponent(lines.join('\n'));
        }

        closeBtn.addEventListener('click', closeModal);
        doneBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('visible')) closeModal();
        });

        fileInput.addEventListener('change', (e) => {
            addFiles(e.target.files);
            e.target.value = '';
        });

        filesListEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-rm-file]');
            if (!btn) return;
            attachedFiles.splice(Number(btn.dataset.rmFile), 1);
            renderFiles();
        });

        ['dragenter', 'dragover'].forEach(ev => {
            dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); });
        });
        ['dragleave', 'drop'].forEach(ev => {
            dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('is-dragover'); });
        });
        dropzone.addEventListener('drop', (e) => {
            if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
        });

        waBtn.addEventListener('click', () => {
            const payload = collectPayload();
            global.open(buildWhatsAppUrl(payload), '_blank', 'noopener,noreferrer');
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearFeedback();
            const honeypot = (form.querySelector('[name="_gotcha"]').value || '').trim();
            if (honeypot) return;

            const payload = collectPayload();
            if (!payload.name) {
                showFeedback('Please enter your name.', true);
                nameEl.focus();
                return;
            }
            if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
                showFeedback('Please enter a valid work email address.', true);
                emailEl.focus();
                return;
            }

            const dynCfg = global.PACTFORM_UPDATES_CONFIG || {};
            const formspreeUrl = (dynCfg.FORMSPREE_ENDPOINT || '').trim();
            const web3Key = (dynCfg.WEB3FORMS_ACCESS_KEY || '').trim();
            const waUrl = buildWhatsAppUrl(payload);
            successWa.href = waUrl;

            if (!formspreeUrl && !web3Key) {
                try {
                    const stored = JSON.parse(localStorage.getItem('pactform-enquiries-preview') || '[]');
                    stored.unshift(Object.assign({ submitted_at: new Date().toISOString() }, payload));
                    localStorage.setItem('pactform-enquiries-preview', JSON.stringify(stored.slice(0, 30)));
                } catch (err) {}
                form.classList.add('hidden');
                successText.textContent = 'Your enquiry summary is ready. Click below to send it directly to our team on WhatsApp' +
                    (attachedFiles.length ? ' (you can attach your ' + attachedFiles.length + ' file(s) right in the chat).' : '.');
                successEl.classList.remove('hidden');
                form.reset();
                attachedFiles = [];
                renderFiles();
                return;
            }

            submitBtn.disabled = true;
            const origText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            try {
                let res;
                if (formspreeUrl) {
                    res = await fetch(formspreeUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(Object.assign({ _subject: 'Pactform — ' + payload.enquiry_type }, payload))
                    });
                } else {
                    res = await fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(Object.assign({
                            access_key: web3Key,
                            subject: 'Pactform — ' + payload.enquiry_type,
                            from_name: payload.name + (payload.company ? ' (' + payload.company + ')' : '')
                        }, payload))
                    });
                }
                if (!res.ok) throw new Error('HTTP ' + res.status);
                form.classList.add('hidden');
                successText.textContent = 'Thank you, ' + payload.name + '. We have received your ' + payload.enquiry_type.toLowerCase() + ' and will reply to ' + payload.email + ' shortly.';
                successEl.classList.remove('hidden');
                form.reset();
                attachedFiles = [];
                renderFiles();
            } catch (err) {
                showFeedback('Could not send via email right now. Please try "Send via WhatsApp" instead.', true);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = origText;
            }
        });

        // --- Bind triggers across Homepage, Projects, Custom, and Footer ---
        // 1. Homepage BOQ dropzone & Browse Files button
        const homeDropzone = document.querySelector('.boq-upload-section .boq-dropzone');
        const homeBrowseBtn = document.querySelector('.boq-upload-section .btn-primary');
        if (homeDropzone) {
            homeDropzone.style.cursor = 'pointer';
            homeDropzone.addEventListener('click', () => openModal({ mode: 'project' }));
            ['dragenter', 'dragover'].forEach(ev => {
                homeDropzone.addEventListener(ev, (e) => { e.preventDefault(); homeDropzone.classList.add('is-dragover'); });
            });
            ['dragleave', 'drop'].forEach(ev => {
                homeDropzone.addEventListener(ev, (e) => { e.preventDefault(); homeDropzone.classList.remove('is-dragover'); });
            });
            homeDropzone.addEventListener('drop', (e) => {
                const dropped = e.dataTransfer && e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
                openModal({ mode: 'project', files: dropped });
            });
        }
        if (homeBrowseBtn) {
            homeBrowseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openModal({ mode: 'project' });
            });
        }

        // 2. Projects page "REQUEST A PROJECT REVIEW"
        document.querySelectorAll('a[href="#upload-modal"]').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                openModal({ mode: 'project' });
            });
        });

        // 3. Custom page "Send your spec sheet"
        document.querySelectorAll('.contact-section a').forEach(a => {
            if (/spec sheet/i.test(a.textContent || '') && (a.getAttribute('href') || '').trim() === '#') {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    openModal({ mode: 'custom' });
                });
            }
        });

        // 4. Footer "Contact Sales" fallback when still href="#"
        document.querySelectorAll('footer .footer-contact a.btn-primary').forEach(a => {
            a.addEventListener('click', (e) => {
                if ((a.getAttribute('href') || '').trim() === '#') {
                    e.preventDefault();
                    openModal({ mode: 'sales' });
                }
            });
        });

        global.PactformEnquiry = { openModal, closeModal };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
