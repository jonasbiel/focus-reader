# Focus Reader — iPad PWA

Upload everything in this folder to the root of the existing GitHub Pages repository.

## iPad workflow
- Open PDF, EPUB, or Markdown (`.md` / `.markdown`) from Files.
- Reader occupies the full working area.
- Swipe up/down or use Previous/Next to move sentence-by-sentence.
- Highlight, underline, comment, or delete from the bottom toolbar.
- Tap PDF to inspect the source page; tap Reader to return.
- Tap Save PDF to create the annotated PDF. On iPadOS the native share sheet
  opens; choose Save to Files to save to iCloud Drive, On My iPad, OneDrive, etc.

The original PDF is not silently overwritten.

## EPUB and Markdown

EPUB and Markdown are converted locally in the browser to a searchable A4 PDF,
then opened in the same reader as ordinary PDFs. Highlight, underline, and
comment as usual. Save PDF works with or without annotations; exports always
use the `.pdf` extension. Source files are never overwritten or uploaded.

EPUB chapters follow the book's spine reading order. This is a text-focused
conversion: headings and paragraphs are retained, but original page layouts,
images (other than EPUB alternative text), and rich formatting are not reproduced.
DRM-protected and image-only EPUBs are unsupported. The bundled Noto Sans font
supports Latin, Greek, and Cyrillic text. Invisible EPUB layout characters are
normalized during conversion. Unsupported visible characters are replaced with
searchable Unicode markers such as `[U+1F600]`, with a notice listing the affected
codes, so the rest of the book can still be read and exported. These markers are
also present in the exported PDF. The font license is in `assets/OFL.txt`.

The first import requires internet access for the conversion libraries. Once
loaded and cached, those resources are available offline. Deploy `book-import.js`
and the `assets` folder along with the other app files.

## Updating an installed PWA
After GitHub Pages finishes deploying, fully close Focus Reader and reopen it.
If iPadOS keeps an old cached build, remove the Home Screen app once, visit the
Pages URL in Safari, and Add to Home Screen again.
