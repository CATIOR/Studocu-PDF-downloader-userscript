# Studocu Direct PDF Grabber & Unblur

A lightweight, zero-dependency browser userscript for **Studocu** and **Studeersnel**. It eliminates client-side preview restrictions, reconstructs vector typography over high-resolution page assets, and compiles entire documents into standalone, valid **PDF 1.4** files directly in your browser.

Unlike naive extensions that capture screen-resolution raster screenshots, this script leverages the HTML5 Canvas API and DOM matrix decomposition to accurately render the text layer over page backgrounds—generating a sharp, properly aligned PDF without relying on third-party servers or heavyweight libraries like `jsPDF` or `pdf-lib`.

---

## ✨ Key Features

* **Smart Client-Side Unblur:** Overrides CSS blur filters (`filter: blur(...)`) and automatically strips intrusive paywall/upsell modal overlays.
* **Accurate Typography & Canvas Engine:**
  * Extracts and applies nested CSS transform matrices (`DOMMatrix`) used by `pdf2htmlEX`.
  * Preserves glyph aspect ratios and resolves metric discrepancies without squishing or stretching fonts.
  * Calculates precise alphabetic baselines (`metrics.fontBoundingBoxAscent`).
  * Honors CSS `letter-spacing` and `word-spacing`.
* **Zero-Dependency PDF 1.4 Synthesis:** Directly constructs raw binary PDF objects (`/Catalog`, `/Pages`, `/XObject`, `/DCTDecode`), builds the xref offset table, and finalizes the file trailer in pure JavaScript.
* **Built-in UI:** Floating control bar, real-time page assembly progress bar, and dedicated print/preview modal.
* **Fallback Asset Resolver:** Identifies signed image asset patterns (`bg*.png/jpg/webp`) and dynamically computes fallback URLs using decimal or hexadecimal indexing.

---

## 🚀 Installation

1. Install a userscript manager in your browser:
   * [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
   * [Violentmonkey](https://violentmonkey.github.io/)
2. Open your userscript manager dashboard and create a new script.
3. Copy and paste the contents of `studocu_grabber.user.js` into the editor.
4. Save the script (`Ctrl + S` / `Cmd + S`).
5. Navigate to any document page on Studocu or Studeersnel—the control widget will appear in the bottom-right corner.

---

## 🛠 How It Works

1. **DOM & Style Injection:** High-priority CSS rules (`!important`) are injected at `document-start` to unmask blurred containers (`.pf`, `.pc`, `#page-container`) and enable text selection.
2. **Page Crawler & Asset Fetching:** The script iterates through page containers, automatically triggering lazy-loading. Background images are fetched via `GM_xmlhttpRequest` to safely bypass strict CORS policies.
3. **Canvas Rasterization & Text Overlay:**
   * A high-DPI canvas matching the natural image dimensions is allocated.
   * Background graphics are rendered.
   * A `TreeWalker` traverses visible DOM text nodes, computes their exact bounding boxes relative to the canvas scale, and paints typography onto the canvas with sub-pixel alignment.
4. **Binary PDF Assembly:** Rendered pages are exported as JPEG buffers and formatted directly into standard PDF 1.4 binary chunks:
   ```
   %PDF-1.4
   1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
   2 0 obj << /Type /Pages /Kids [...] /Count N >> endobj
   ... [Page, Content Stream, and XObject Image objects] ...
   xref
   trailer << /Size N /Root 1 0 R >>
   startxref ... %%EOF
   ```
5. **Memory-Safe Export:** The assembled binary array is packaged into an `application/pdf` Blob and downloaded through a temporary virtual anchor tag, with automatic object URL revocation to prevent memory leaks.

---

## 📋 Supported Domains

* `studocu.com` (*and all localized subdomains*)
* `studeersnel.nl`
* `studocu.vn`
* `studocu.id`

---

## ⚠️ Disclaimer

> [!CAUTION]
> This repository and script are developed strictly for **educational, testing, and research purposes** (exploring client-side PDF binary generation, font metric calculations, and DOM manipulation).
> 
> The author assumes no liability for misuse. Please review and adhere to the Terms of Service of the respective platforms you interact with.

***

# Studocu Direct PDF Grabber & Unblur

Пользовательский скрипт (Userscript) для браузера, позволяющий комфортно просматривать документы на Studocu / Studeersnel, снимать визуальные ограничения предпросмотра и экспортировать страницы в единый файл PDF с сохранением верстки и пропорций шрифтов.

В отличие от простых расширений, делающих грубый скриншот окна, данный скрипт заново собирает векторный текстовый слой поверх фоновых растровых подложек через HTML5 Canvas и генерирует валидный бинарный файл PDF 1.4 прямо в браузере — без привлечения сторонних серверов и тяжелых внешних библиотек.

---

## ✨ Основные возможности

* **Умный Unblur:** Отключение CSS-фильтров размытия (`filter: blur(...)`) и автоматическое удаление перекрывающих модальных окон (пейволлов).
* **Собственный движок Canvas-рендеринга:**
  * Учет трансформаций `pdf2htmlEX` (масштабирование, CSS-матрицы `DOMMatrix`).
  * Сохранение точных пропорций глифов (устранение сплющивания букв при разнице метрик шрифтов).
  * Корректный расчет алфавитной базовой линии текста (`alphabetic baseline`).
  * Поддержка межбуквенных и межсловных интервалов (`letterSpacing`, `wordSpacing`).
* **Zero-Dependency PDF Engine:** Прямая генерация бинарного формата PDF 1.4 из потоков JPEG с формированием таблицы перекрестных ссылок (`xref`) и дерева страниц. Не требует `jsPDF`, `pdfmake` или Node.js.
* **Встроенный интерфейс:** Панель быстрого запуска, прогресс-бар обработки страниц и режим предпросмотра/печати.

---

## 🚀 Установка

1. Установите менеджер пользовательских скриптов для вашего браузера:
   * [Tampermonkey](https://www.tampermonkey.net/) (рекомендуется)
   * [Violentmonkey](https://violentmonkey.github.io/)
2. Создайте новый скрипт в панели расширения.
3. Скопируйте содержимое файла `studocu_grabber.user.js` и вставьте в редактор.
4. Сохраните скрипт (`Ctrl + S` / `Cmd + S`).

---

## 🛠 Как это работает

1. **Обход размытия и блокировок:** Скрипт инжектирует глобальные CSS-правила с наивысшим приоритетом (`!important`), отключающие маскирование, фильтры и блокировки выделения текста на элементах `.pf`, `.pc`, `#page-container`.
2. **Парсинг слотов:** Определяются все контейнеры страниц. Скрипт плавно скроллит документ для инициализации подгрузки ассетов и находит подписанные URL графических подложек (`bg*.png/jpg/webp`), при необходимости восстанавливая адреса для пропущенных страниц (hex/dec индексация).
3. **Рендеринг в Canvas:** Для каждой страницы создается Canvas высокого разрешения. На него последовательно накладываются:
   * Фоновое изображение страницы (загружается через `GM_xmlhttpRequest` в обход строгой политики CORS).
   * Текстовые узлы с расчетом координат относительно родительских контейнеров и масштаба вьюпорта.
4. **Сборка PDF:** Из полученных холстов извлекаются JPEG-буферы, упаковываемые в структуру объектов спецификации PDF 1.4:
   * `/Catalog` -> `/Pages` -> `/Page`
   * `/XObject` (изображения DCTDecode)
   * Контентные потоки отображения (`cm`, `Do`)
   * Таблица смещений `xref` и `trailer`
5. **Выгрузка:** Готовый `Blob` скачивается локально через виртуальную ссылку, не нагружая оперативную память браузера утечками URL.

---

## 📋 Поддерживаемые платформы

* `studocu.com` (*все региональные поддомены*)
* `studeersnel.nl`
* `studocu.vn`
* `studocu.id`

---

## ⚠️ Отказ от ответственности (Disclaimer)

> [!CAUTION]
> Данный проект создан исключительно в ознакомительных, научно-исследовательских и образовательных целях (анализ работы веб-шрифтов, DOM-трансформаций и реализации спецификации формата PDF на чистом JavaScript). 
>
> Автор не несет ответственности за любое нецелевое использование данного скрипта. Пожалуйста, соблюдайте пользовательское соглашение и правила сервисов, с которыми вы взаимодействуете.
