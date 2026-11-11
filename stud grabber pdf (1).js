// ==UserScript==
// @name         Studocu Hack & Direct PDF Grabber
// @namespace    https://github.com/CATIOR/Studocu-PDF-downloader-userscript/tree/main
// @version      1.0
// @description  Прямое скачивание документов в настоящий .PDF файл без искажения пропорций шрифтов для Studocu и Studeersnel.
// @author       Anonymous & thanks to danieltyukov
// @match        *://*.studocu.com/*
// @match        *://*.studeersnel.nl/*
// @match        *://*.studocu.vn/*
// @match        *://*.studocu.id/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      doc-assets.studocu.com
// @connect      studocu.com
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    // ----------------------------------------------------
    // 1. СТИЛИ И ИНТЕРФЕЙС
    // ----------------------------------------------------
    const STYLES = `
        .blurred-container,
        [class*="blurred"],
        [class*="blur"],
        [class*="premium-blur"],
        #page-container, #page-container *,
        .pf, .pc, .p2hv,
        [style*="filter: blur"],
        [style*="filter:blur"] {
            filter: none !important;
            -webkit-filter: none !important;
            user-select: text !important;
            -webkit-user-select: text !important;
            clip-path: none !important;
            mask-image: none !important;
        }

        #modal-overlay,
        [id*="modal-overlay"],
        [class*="modal-overlay"],
        [class*="Upsell"],
        [class*="upsell"],
        [class*="PremiumOverlay"],
        [class*="banner-wrapper"],
        [class*="preview-banner"],
        div[data-testid="document-viewer-upsell"],
        div[data-testid="banner-wrapper"] {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        #sh-control-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 2147483640;
            display: flex;
            gap: 8px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(8px);
            padding: 8px 12px;
            border-radius: 999px;
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            align-items: center;
        }

        .sh-btn {
            background: #2563eb;
            color: #ffffff !important;
            border: none;
            padding: 9px 15px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }

        .sh-btn:active {
            transform: scale(0.97);
        }

        .sh-btn-secondary {
            background: rgba(255, 255, 255, 0.14);
            color: #f8fafc !important;
        }

        #sh-progress-modal {
            position: fixed;
            inset: 0;
            background: rgba(9, 13, 24, 0.88);
            backdrop-filter: blur(10px);
            z-index: 2147483645;
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 16px;
        }

        .sh-progress-box {
            background: #1e293b;
            border: 1px solid #334155;
            padding: 24px;
            border-radius: 16px;
            text-align: center;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 16px 40px rgba(0,0,0,0.5);
        }

        .sh-progress-bar-bg {
            width: 100%;
            height: 8px;
            background: #334155;
            border-radius: 4px;
            overflow: hidden;
            margin: 16px 0;
        }

        .sh-progress-bar-fill {
            width: 0%;
            height: 100%;
            background: #38bdf8;
            transition: width 0.15s ease;
        }

        #sh-print-wrapper {
            display: none;
            background: #333639;
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow-y: auto;
            z-index: 2147483642;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        #sh-print-toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            background: #18181b;
            color: #fff;
            padding: 12px 16px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        #sh-print-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
            padding: 16px 10px 80px;
        }

        .sh-rendered-page {
            max-width: 100%;
            height: auto;
            background: #fff;
            box-shadow: 0 4px 16px rgba(0,0,0,0.35);
            display: block;
        }

        @media print {
            body > *:not(#sh-print-wrapper) {
                display: none !important;
            }
            #sh-print-wrapper {
                display: block !important;
                position: static !important;
                background: #fff !important;
                overflow: visible !important;
            }
            #sh-print-toolbar {
                display: none !important;
            }
            #sh-print-container {
                padding: 0 !important;
                gap: 0 !important;
                display: block !important;
            }
            .sh-rendered-page {
                width: 100% !important;
                max-width: none !important;
                box-shadow: none !important;
                page-break-after: always !important;
                break-after: page !important;
            }
            @page {
                margin: 0;
                size: auto;
            }
        }
    `;

    const injectStyles = () => {
        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(STYLES);
        } else {
            const style = document.createElement('style');
            style.textContent = STYLES;
            (document.head || document.documentElement).appendChild(style);
        }
    };
    injectStyles();

    // ----------------------------------------------------
    // 2. ЗАГРУЗКА КАРТИНОК В ОБХОД CORS
    // ----------------------------------------------------
    const fetchImageBitmap = (url) => {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300 && res.response) {
                            const blobUrl = URL.createObjectURL(res.response);
                            const img = new Image();
                            img.onload = () => {
                                URL.revokeObjectURL(blobUrl);
                                resolve(img);
                            };
                            img.onerror = (e) => {
                                URL.revokeObjectURL(blobUrl);
                                reject(e);
                            };
                            img.src = blobUrl;
                        } else {
                            reject(new Error(`HTTP ${res.status}`));
                        }
                    },
                    onerror: reject
                });
            } else {
                fetch(url, { credentials: 'include' })
                    .then(r => {
                        if (!r.ok) throw new Error(`HTTP ${r.status}`);
                        return r.blob();
                    })
                    .then(blob => {
                        const blobUrl = URL.createObjectURL(blob);
                        const img = new Image();
                        img.onload = () => {
                            URL.revokeObjectURL(blobUrl);
                            resolve(img);
                        };
                        img.onerror = reject;
                        img.src = blobUrl;
                    })
                    .catch(reject);
            }
        });
    };

    // ----------------------------------------------------
    // 3. ГЕНЕРАТОР БИНАРНОГО PDF 1.4
    // ----------------------------------------------------
    const base64ToUint8Array = (base64) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    };

    const buildPdfBlobFromJpegs = (pagesData) => {
        const chunks = [];
        const offsets = {};
        let currentOffset = 0;
        const encoder = new TextEncoder();

        const writeStr = (str) => {
            const bytes = encoder.encode(str);
            chunks.push(bytes);
            currentOffset += bytes.length;
        };

        const writeBytes = (bytes) => {
            chunks.push(bytes);
            currentOffset += bytes.length;
        };

        const startObj = (id) => {
            offsets[id] = currentOffset;
            writeStr(`${id} 0 obj\n`);
        };

        const endObj = () => {
            writeStr(`\nendobj\n`);
        };

        writeBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xFF, 0xFF, 0xFF, 0xFF, 0x0A]));

        startObj(1);
        writeStr(`<< /Type /Catalog /Pages 2 0 R >>`);
        endObj();

        const count = pagesData.length;
        const kids = pagesData.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
        startObj(2);
        writeStr(`<< /Type /Pages /Kids [ ${kids} ] /Count ${count} >>`);
        endObj();

        for (let i = 0; i < count; i++) {
            const { width, height, jpegDataUrl } = pagesData[i];
            const base64 = jpegDataUrl.split(',')[1];
            const jpegBytes = base64ToUint8Array(base64);

            const pageObjId = 3 + i * 3;
            const contentObjId = 4 + i * 3;
            const imgObjId = 5 + i * 3;

            const pdfW = 595.28;
            const pdfH = Number(((height / width) * pdfW).toFixed(2));

            startObj(pageObjId);
            writeStr(
                `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${pdfW} ${pdfH} ] ` +
                `/Contents ${contentObjId} 0 R ` +
                `/Resources << /XObject << /Im1 ${imgObjId} 0 R >> >> >>`
            );
            endObj();

            const streamContent = `q ${pdfW} 0 0 ${pdfH} 0 0 cm /Im1 Do Q`;
            startObj(contentObjId);
            writeStr(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
            endObj();

            startObj(imgObjId);
            writeStr(
                `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
                `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
                `/Length ${jpegBytes.length} >>\nstream\n`
            );
            writeBytes(jpegBytes);
            writeStr(`\nendstream`);
            endObj();
        }

        const xrefOffset = currentOffset;
        const totalObjs = 3 + count * 3;
        writeStr(`xref\n0 ${totalObjs}\n`);
        writeStr(`0000000000 65535 f \n`);
        for (let id = 1; id < totalObjs; id++) {
            const off = String(offsets[id]).padStart(10, '0');
            writeStr(`${off} 00000 n \n`);
        }

        writeStr(
            `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\n` +
            `startxref\n${xrefOffset}\n%%EOF\n`
        );

        return new Blob(chunks, { type: 'application/pdf' });
    };

    // ----------------------------------------------------
    // 4. ГЛАВНЫЙ КЛАСС ЗАХВАТА И ТОЧНОЙ ОТРИСОВКИ ШРИФТОВ
    // ----------------------------------------------------
    class StudocuGrabber {
        constructor() {
            this.isCapturing = false;
            this.lastPdfBlob = null;
            this.docTitle = 'Studocu-Document';
            this.initUI();
            this.bindObserver();
        }

        initUI() {
            if (!document.body || document.getElementById('sh-control-panel')) return;

            const panel = document.createElement('div');
            panel.id = 'sh-control-panel';
            panel.innerHTML = `
                <button id="sh-dl-btn" class="sh-btn">
                    📥 Скачать в PDF
                </button>
                <button id="sh-unblur-btn" class="sh-btn sh-btn-secondary">
                    🔓 Unblur
                </button>
            `;
            document.body.appendChild(panel);

            const modal = document.createElement('div');
            modal.id = 'sh-progress-modal';
            modal.innerHTML = `
                <div class="sh-progress-box">
                    <h3 id="sh-status-title" style="margin: 0 0 8px 0; font-size: 17px;">Захват страниц...</h3>
                    <p id="sh-status-desc" style="color: #94a3b8; font-size: 13px; margin: 0;">Не сворачивайте вкладку до завершения</p>
                    <div class="sh-progress-bar-bg">
                        <div id="sh-progress-bar" class="sh-progress-bar-fill"></div>
                    </div>
                    <div id="sh-status-pages" style="font-weight: bold; font-size: 15px; color: #38bdf8;">0 / 0</div>
                </div>
            `;
            document.body.appendChild(modal);

            const printWrapper = document.createElement('div');
            printWrapper.id = 'sh-print-wrapper';
            printWrapper.innerHTML = `
                <div id="sh-print-toolbar">
                    <div style="font-weight: 600; font-size: 14px; max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" id="sh-doc-title">Документ</div>
                    <div style="display: flex; gap: 8px;">
                        <button id="sh-direct-dl-btn" class="sh-btn">💾 Скачать файл .PDF</button>
                        <button id="sh-save-pdf-btn" class="sh-btn sh-btn-secondary">🖨️ Печать</button>
                        <button id="sh-close-preview-btn" class="sh-btn sh-btn-secondary">✕</button>
                    </div>
                </div>
                <div id="sh-print-container"></div>
            `;
            document.body.appendChild(printWrapper);

            document.getElementById('sh-dl-btn').addEventListener('click', () => this.startCapture());
            document.getElementById('sh-unblur-btn').addEventListener('click', () => this.forceUnblur());
            document.getElementById('sh-direct-dl-btn').addEventListener('click', () => this.triggerFileDownload());
            document.getElementById('sh-save-pdf-btn').addEventListener('click', () => window.print());
            document.getElementById('sh-close-preview-btn').addEventListener('click', () => {
                printWrapper.style.display = 'none';
            });
        }

        forceUnblur() {
            document.querySelectorAll('#page-container *, .pf, .pc, [class*="blurred"]').forEach(el => {
                if (el.style) {
                    el.style.filter = 'none';
                    el.style.webkitFilter = 'none';
                    el.style.clipPath = 'none';
                }
            });
            document.querySelectorAll('#modal-overlay, [class*="upsell"]').forEach(el => el.remove());
        }

        bindObserver() {
            const observer = new MutationObserver(() => {
                if (document.body && !document.getElementById('sh-control-panel')) {
                    this.initUI();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }

        getPageSlots() {
            const container = document.getElementById('page-container');
            if (container) {
                const slots = Array.from(container.children).filter(el => el.tagName === 'DIV');
                if (slots.length > 0) return slots;
            }
            return Array.from(document.querySelectorAll('.pf'));
        }

        findSampleSignedUrl() {
            const imgs = Array.from(document.querySelectorAll('#page-container img[src*="doc-assets.studocu.com"]'));
            for (const img of imgs) {
                if (img.src && /\/bg[0-9a-f]+\.(png|jpg|jpeg|webp)/i.test(img.src)) {
                    return img.src;
                }
            }
            return null;
        }

        buildFallbackUrl(sampleUrl, pageNumber1Based, useHex = true) {
            if (!sampleUrl) return null;
            const indexStr = useHex ? pageNumber1Based.toString(16).toLowerCase() : String(pageNumber1Based);
            return sampleUrl.replace(/\/bg[0-9a-f]+(\.(?:png|jpg|jpeg|webp))/i, `/bg${indexStr}$1`);
        }

        async waitForSlotImage(slot, timeoutMs = 2000) {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                const img = slot.querySelector('img[src*="doc-assets.studocu.com"], img[src]');
                if (img && img.src && (!img.src.startsWith('http') || img.complete)) {
                    return img.src;
                }
                await new Promise(r => setTimeout(r, 100));
            }
            const img = slot.querySelector('img[src]');
            return img ? img.src : null;
        }

        // Вычисляет итоговый CSS-масштаб элемента относительно вьюпорта через перемножение DOMMatrix
        getElementViewportScale(el) {
            let mat = new DOMMatrix();
            let cur = el;
            while (cur && cur !== document.body && cur !== document.documentElement) {
                const tr = window.getComputedStyle(cur).transform;
                if (tr && tr !== 'none') {
                    try {
                        mat = new DOMMatrix(tr).multiply(mat);
                    } catch (e) {}
                }
                cur = cur.parentElement;
            }
            return {
                sx: Math.hypot(mat.a, mat.b) || 1,
                sy: Math.hypot(mat.c, mat.d) || 1
            };
        }

        renderTextLayerOnCanvas(ctx, slot, canvasW, canvasH) {
            const imgEl = slot.querySelector('img');
            const baseRect = (imgEl || slot).getBoundingClientRect();
            if (!baseRect || baseRect.width < 10 || baseRect.height < 10) return;

            const scaleX = canvasW / baseRect.width;
            const scaleY = canvasH / baseRect.height;

            const walker = document.createTreeWalker(slot, NodeFilter.SHOW_TEXT, null);
            let node;
            while ((node = walker.nextNode())) {
                const text = node.nodeValue;
                if (!text || !text.trim()) continue;
                const parent = node.parentElement;
                if (!parent) continue;

                const cs = window.getComputedStyle(parent);
                if (
                    cs.display === 'none' ||
                    cs.visibility === 'hidden' ||
                    parseFloat(cs.opacity) === 0 ||
                    cs.color === 'transparent' ||
                    cs.color === 'rgba(0, 0, 0, 0)'
                ) {
                    continue;
                }

                const range = document.createRange();
                range.selectNodeContents(node);
                const rect = range.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) continue;

                // 1. Точный кегль шрифта из CSS и матрицы трансформаций
                const vpScale = this.getElementViewportScale(parent);
                const cssFontSize = parseFloat(cs.fontSize) || 16;
                let fontSize = cssFontSize * vpScale.sy * scaleY;

                // 2. Собственная пропорция сжатия/растяжения из CSS-матрицы pdf2htmlEX (.m0 и т.д.)
                const matrixAspectX = (vpScale.sx / vpScale.sy) || 1;

                const x = (rect.left - baseRect.left) * scaleX;
                const targetW = rect.width * scaleX;

                ctx.save();

                // Учитываем межбуквенный и межсловный интервал, если они заданы в CSS
                const lsPx = (parseFloat(cs.letterSpacing) || 0) * vpScale.sx * scaleX;
                const wsPx = (parseFloat(cs.wordSpacing) || 0) * vpScale.sx * scaleX;
                if ('letterSpacing' in ctx) ctx.letterSpacing = `${lsPx.toFixed(2)}px`;
                if ('wordSpacing' in ctx) ctx.wordSpacing = `${wsPx.toFixed(2)}px`;

                const fontFamily = cs.fontFamily || 'sans-serif';
                ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize.toFixed(2)}px ${fontFamily}`;

                // 3. Если из-за разницы метрик шрифта ширина отличается — масштабируем КЕГЛЬ пропорционально (и X, и Y!), не сплющивая буквы
                let metrics = ctx.measureText(text);
                let measuredW = metrics.width * matrixAspectX;

                if (measuredW > 0 && text.trim().length > 1) {
                    const ratio = targetW / measuredW;
                    if (ratio > 0.65 && ratio < 1.65) {
                        fontSize = fontSize * ratio;
                        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize.toFixed(2)}px ${fontFamily}`;
                        metrics = ctx.measureText(text);
                        measuredW = metrics.width * matrixAspectX;
                    }
                }

                // 4. Точная постановка на базовую линию (alphabetic baseline)
                ctx.fillStyle = cs.color || '#000000';
                ctx.textBaseline = 'alphabetic';

                let baselineY;
                if (
                    metrics.fontBoundingBoxAscent !== undefined &&
                    metrics.fontBoundingBoxDescent !== undefined &&
                    (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) > 0
                ) {
                    const fontBoxH = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
                    const rectCenterY = ((rect.top + rect.bottom) / 2 - baseRect.top) * scaleY;
                    baselineY = rectCenterY - fontBoxH / 2 + metrics.fontBoundingBoxAscent;
                } else {
                    baselineY = (rect.bottom - baseRect.top) * scaleY - (rect.height * scaleY * 0.18);
                }

                ctx.translate(x, baselineY);
                if (Math.abs(matrixAspectX - 1) > 0.01) {
                    ctx.scale(matrixAspectX, 1);
                }
                ctx.fillText(text, 0, 0);
                ctx.restore();
            }
        }

        triggerFileDownload() {
            if (!this.lastPdfBlob) return;
            const safeName = this.docTitle.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120) || 'Studocu_Document';
            const blobUrl = URL.createObjectURL(this.lastPdfBlob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${safeName}.pdf`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 2000);
        }

        async startCapture() {
            if (this.isCapturing) return;
            this.isCapturing = true;

            // Дожидаемся готовности всех веб-шрифтов страницы перед отрисовкой
            if (document.fonts && document.fonts.ready) {
                try { await document.fonts.ready; } catch (e) {}
            }

            const modal = document.getElementById('sh-progress-modal');
            const titleEl = document.getElementById('sh-status-title');
            const descEl = document.getElementById('sh-status-desc');
            const pagesEl = document.getElementById('sh-status-pages');
            const barEl = document.getElementById('sh-progress-bar');

            modal.style.display = 'flex';
            barEl.style.width = '0%';

            const slots = this.getPageSlots();
            const total = slots.length;

            if (total === 0) {
                alert('Не найден контейнер страниц #page-container. Дождитесь загрузки документа.');
                modal.style.display = 'none';
                this.isCapturing = false;
                return;
            }

            pagesEl.textContent = `0 / ${total}`;
            let sampleSignedUrl = this.findSampleSignedUrl();
            const renderedPages = [];

            for (let i = 0; i < total; i++) {
                const slot = slots[i];
                const pageNum = i + 1;

                titleEl.textContent = `Загрузка и сборка страниц...`;
                descEl.textContent = `Обрабатывается страница ${pageNum} из ${total}`;

                slot.scrollIntoView({ behavior: 'instant', block: 'center' });
                let imgUrl = await this.waitForSlotImage(slot, 1800);

                if (imgUrl && !sampleSignedUrl && imgUrl.includes('doc-assets.studocu.com')) {
                    sampleSignedUrl = imgUrl;
                }

                let loadedImg = null;
                const urlsToTry = [];
                if (imgUrl) urlsToTry.push(imgUrl);
                if (sampleSignedUrl) {
                    const hexUrl = this.buildFallbackUrl(sampleSignedUrl, pageNum, true);
                    const decUrl = this.buildFallbackUrl(sampleSignedUrl, pageNum, false);
                    if (hexUrl && !urlsToTry.includes(hexUrl)) urlsToTry.push(hexUrl);
                    if (decUrl && !urlsToTry.includes(decUrl)) urlsToTry.push(decUrl);
                }

                for (const candidateUrl of urlsToTry) {
                    try {
                        loadedImg = await fetchImageBitmap(candidateUrl);
                        break;
                    } catch (e) {}
                }

                const canvas = document.createElement('canvas');
                canvas.width = loadedImg ? (loadedImg.naturalWidth || loadedImg.width || 1200) : 1200;
                canvas.height = loadedImg ? (loadedImg.naturalHeight || loadedImg.height || 1697) : 1697;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (loadedImg) {
                    ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);
                }

                this.renderTextLayerOnCanvas(ctx, slot, canvas.width, canvas.height);

                const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
                renderedPages.push({
                    width: canvas.width,
                    height: canvas.height,
                    jpegDataUrl
                });

                const pct = Math.round((pageNum / total) * 100);
                barEl.style.width = `${pct}%`;
                pagesEl.textContent = `${pageNum} / ${total}`;
            }

            titleEl.textContent = 'Упаковка в PDF-файл...';
            await new Promise(r => setTimeout(r, 80));

            this.docTitle = document.querySelector('h1')?.textContent?.trim() || 'Studocu-Document';
            this.lastPdfBlob = buildPdfBlobFromJpegs(renderedPages);

            const printContainer = document.getElementById('sh-print-container');
            printContainer.innerHTML = '';
            for (const page of renderedPages) {
                const img = document.createElement('img');
                img.src = page.jpegDataUrl;
                img.className = 'sh-rendered-page';
                printContainer.appendChild(img);
            }

            document.getElementById('sh-doc-title').textContent = `${this.docTitle} (${renderedPages.length} стр.)`;

            modal.style.display = 'none';
            this.isCapturing = false;

            document.getElementById('sh-print-wrapper').style.display = 'block';
            this.triggerFileDownload();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new StudocuGrabber());
    } else {
        new StudocuGrabber();
    }
})();