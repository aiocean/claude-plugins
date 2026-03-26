# Print Stylesheets

## @media print Basics

Print stylesheets control how a webpage renders when printed or saved as PDF.
They are essential for articles, invoices, reports, receipts, and documentation.

```css
/* Method 1: Inline @media print block (preferred for maintenance) */
@media print {
  /* All print styles here */
}

/* Method 2: Separate stylesheet (use for complex print layouts) */
/* <link rel="stylesheet" href="print.css" media="print"> */

/* Method 3: Combined approach */
/* <link rel="stylesheet" href="base.css"> */
/* <link rel="stylesheet" href="print.css" media="print"> */
```

### Print Reset Foundation

Start every print stylesheet with this foundation:

```css
@media print {
  /* Reset colors for print economy */
  *,
  *::before,
  *::after {
    background: transparent !important;
    color: #000 !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }

  /* Base typography for print */
  body {
    font-family: Georgia, 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }

  /* Ensure full width */
  .container,
  .wrapper,
  main {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}
```

---

## Hiding Navigation and Interactive Elements

Navigation, ads, sidebars, buttons, and interactive widgets serve no purpose
on a printed page. Hide them.

```css
@media print {
  /* Navigation */
  nav,
  .nav,
  .navbar,
  .sidebar,
  .site-header,
  .site-footer,
  header nav,
  footer {
    display: none !important;
  }

  /* Interactive elements */
  button,
  .btn,
  [role="button"],
  input[type="submit"],
  input[type="button"],
  input[type="reset"] {
    display: none !important;
  }

  /* Forms (unless they are the print content) */
  .search-form,
  .newsletter-form,
  .comment-form {
    display: none !important;
  }

  /* Ads and tracking */
  .advertisement,
  .ad-banner,
  [class*="ad-"],
  [id*="ad-"],
  iframe,
  video,
  audio,
  .cookie-banner,
  .popup,
  .modal {
    display: none !important;
  }

  /* Social sharing, related posts */
  .social-share,
  .related-posts,
  .comments-section,
  .feedback-widget {
    display: none !important;
  }

  /* Sticky/fixed elements */
  .sticky,
  .fixed,
  [style*="position: fixed"],
  [style*="position: sticky"] {
    position: static !important;
  }
}
```

---

## Page Break Control

Control where content breaks across pages using the `break-*` properties.
These replaced the older `page-break-*` properties (though both work).

```css
@media print {
  /* ---- Break BEFORE element ---- */

  /* Always start a new page before major sections */
  h1,
  .chapter,
  .major-section {
    break-before: page;
  }

  /* Start h2 on new page only if not at top */
  h2 {
    break-before: avoid; /* Don't orphan h2 at bottom */
  }

  /* ---- Break AFTER element ---- */

  /* Force page break after specific elements */
  .page-break-after {
    break-after: page;
  }

  /* ---- Break INSIDE element ---- */

  /* Prevent breaking inside these elements */
  figure,
  table,
  pre,
  blockquote,
  .card,
  .invoice-item,
  .callout {
    break-inside: avoid;
  }

  /* Never break inside code blocks */
  pre, code {
    break-inside: avoid;
    white-space: pre-wrap;
  }

  /* Keep images with their captions */
  figure {
    break-inside: avoid;
  }

  /* ---- Heading widow prevention ---- */

  /* Don't leave headings alone at bottom of page */
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid;   /* Don't end page right after a heading */
    break-inside: avoid;
  }
}
```

### Utility Classes

```css
@media print {
  /* Force a page break */
  .print-page-break {
    break-after: page;
    display: block;
  }

  /* Prevent breaking across pages */
  .print-no-break {
    break-inside: avoid;
  }

  /* Force new page before this element */
  .print-new-page {
    break-before: page;
  }

  /* Show only in print */
  .print-only {
    display: block !important;
  }

  /* Hide in print */
  .no-print {
    display: none !important;
  }
}

/* Hidden in screen, visible in print */
.print-only {
  display: none;
}
```

---

## Showing URLs for Links

Printed hyperlinks are useless unless the URL is visible.

```css
@media print {
  /* Show URL after link text */
  a[href]::after {
    content: " (" attr(href) ")";
    font-size: 0.85em;
    color: #555;
    word-break: break-all;
  }

  /* Don't show URL for:
     - Anchor links (start with #)
     - JavaScript links
     - Internal navigation
  */
  a[href^="#"]::after,
  a[href^="javascript:"]::after,
  a.nav-link::after,
  .no-print-url::after {
    content: none;
  }

  /* Style printed links */
  a {
    text-decoration: underline;
    color: #000;
  }

  /* Show title attribute as well if available */
  abbr[title]::after {
    content: " (" attr(title) ")";
  }
}
```

---

## Print-Friendly Colors

Printers use ink — unnecessary backgrounds and dark colors waste it. Default
to high-contrast black on white with minimal color.

```css
@media print {
  /* Base: black text on white */
  body {
    color: #000;
    background: #fff;
  }

  /* Remove all backgrounds */
  * {
    background-color: transparent !important;
    background-image: none !important;
  }

  /* Preserve meaning where color carries semantic value */
  .status-success { color: #155724; }
  .status-error   { color: #721c24; }
  .status-warning { color: #856404; }

  /* Borders in gray instead of transparent/colored */
  table th,
  table td {
    border-color: #ccc !important;
  }

  /* Code blocks: use border instead of background */
  pre, code {
    border: 1px solid #ccc;
    padding: 0.25em 0.5em;
  }

  /* Blockquotes: left border instead of background shading */
  blockquote {
    border-left: 3px solid #666;
    padding-left: 1em;
    margin-left: 0;
    color: #333;
  }
}
```

---

## Page Margins (@page)

The `@page` rule controls the printed page's dimensions and margins.

```css
@media print {
  /* Default page margins */
  @page {
    margin: 2cm;
    /* or use directional values */
    margin-top: 2.5cm;
    margin-bottom: 2.5cm;
    margin-left: 2cm;
    margin-right: 2cm;
  }

  /* First page — no header, larger top margin */
  @page :first {
    margin-top: 4cm;
  }

  /* Left pages (verso) in book printing */
  @page :left {
    margin-left: 3cm;
    margin-right: 2cm;
  }

  /* Right pages (recto) in book printing */
  @page :right {
    margin-left: 2cm;
    margin-right: 3cm;
  }

  /* Landscape specific page */
  @page landscape {
    size: landscape;
    margin: 1.5cm;
  }

  /* Apply landscape to specific elements */
  .wide-table {
    page: landscape;
  }
}

/* Page size control */
@media print {
  @page {
    size: A4;            /* A4, A3, letter, legal, auto */
    size: A4 portrait;   /* explicit orientation */
    size: letter landscape;
  }
}
```

### Running Headers and Footers (via margin boxes)

```css
@media print {
  @page {
    /* Header: top-left, top-center, top-right */
    @top-left {
      content: "Company Name";
      font-size: 9pt;
      color: #666;
    }

    @top-right {
      content: "Confidential";
      font-size: 9pt;
      color: #666;
    }

    /* Footer: page numbers */
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9pt;
      color: #666;
    }

    @bottom-right {
      content: "Printed: " string(print-date);
      font-size: 8pt;
      color: #999;
    }
  }
}
```

---

## Orphans and Widows

Orphans and widows are typographic terms for isolated lines at page boundaries.

```
Widow: last line of a paragraph stranded alone at the top of a new page.
Orphan: first line of a paragraph stranded alone at the bottom of a page.
```

```css
@media print {
  /* Minimum lines that must appear at bottom of page (orphan control) */
  p, li, blockquote {
    orphans: 3;   /* Minimum 3 lines at bottom of page */
    widows: 3;    /* Minimum 3 lines at top of new page */
  }

  /* Stricter for important content */
  .lead-paragraph {
    orphans: 4;
    widows: 4;
  }

  /* Prevent widows in headings */
  h1, h2, h3, h4 {
    widows: 2;
    orphans: 2;
  }
}
```

---

## Print-Specific Typography

Screen fonts differ from optimal print fonts. Print benefits from serif fonts
at smaller sizes and tighter layouts.

```css
@media print {
  /* Body: serif for long reading, standard pt sizing */
  body {
    font-family: Georgia, 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #000;
  }

  /* Headings */
  h1 { font-size: 22pt; line-height: 1.2; margin-bottom: 12pt; }
  h2 { font-size: 18pt; line-height: 1.25; margin-bottom: 10pt; }
  h3 { font-size: 14pt; line-height: 1.3; margin-bottom: 8pt; }
  h4 { font-size: 12pt; line-height: 1.4; font-weight: bold; }

  /* Tighten line length for print (narrower than screen) */
  p {
    max-width: none; /* Let it fill the page width */
    margin-bottom: 0.5em;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }

  th {
    background-color: #eee !important;
    font-weight: bold;
    border: 1px solid #999;
    padding: 4pt 8pt;
    text-align: left;
  }

  td {
    border: 1px solid #bbb;
    padding: 4pt 8pt;
    vertical-align: top;
  }

  /* Alternating rows */
  tr:nth-child(even) td {
    background-color: #f9f9f9 !important;
  }

  /* Images: constrain to page width */
  img {
    max-width: 100% !important;
    height: auto !important;
    break-inside: avoid;
  }

  /* Remove decorative images */
  img.decorative,
  img[alt=""] {
    display: none;
  }
}
```

---

## Complete Print Stylesheet Example

A production-ready print stylesheet for an article or document page:

```css
/* ============================================
   PRINT STYLESHEET — Article / Document
   ============================================ */

@media print {
  /* Page setup */
  @page {
    size: A4 portrait;
    margin: 2cm 2.5cm;

    @bottom-center {
      content: counter(page);
      font-size: 9pt;
      color: #666;
    }
  }

  @page :first {
    @bottom-center { content: none; }
  }

  /* Reset */
  *, *::before, *::after {
    background: transparent !important;
    color: #000 !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }

  /* Hide: navigation, interactive, decorative */
  nav, header nav, .site-footer,
  .sidebar, .toc-sidebar,
  button, .btn,
  .social-share, .comments,
  .newsletter-cta, .related-articles,
  .advertisement, iframe,
  video, audio,
  .cookie-banner, .toast,
  [aria-hidden="true"] {
    display: none !important;
  }

  /* Layout */
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.6;
  }

  .article-container {
    width: 100%;
    max-width: none;
    padding: 0;
    margin: 0;
  }

  /* Typography */
  h1 { font-size: 20pt; break-after: avoid; margin-bottom: 8pt; }
  h2 { font-size: 16pt; break-after: avoid; break-before: auto; }
  h3 { font-size: 13pt; break-after: avoid; }

  p, li { orphans: 3; widows: 3; }

  /* Links */
  a[href]::after {
    content: " <" attr(href) ">";
    font-size: 0.8em;
    color: #444 !important;
    word-break: break-all;
  }

  a[href^="#"]::after,
  a[href^="javascript:"]::after,
  .no-print-url::after {
    content: none;
  }

  /* Media */
  img, figure {
    max-width: 100% !important;
    break-inside: avoid;
  }

  figure { margin-block: 1em; }

  figcaption {
    font-size: 9pt;
    color: #444 !important;
    margin-top: 4pt;
  }

  /* Code */
  pre, code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    border: 1px solid #ccc;
    break-inside: avoid;
    white-space: pre-wrap;
    word-break: break-all;
  }

  pre { padding: 0.5em; }

  /* Tables */
  table { border-collapse: collapse; width: 100%; break-inside: auto; }
  tr    { break-inside: avoid; }
  th, td {
    border: 1px solid #999;
    padding: 4pt 6pt;
    text-align: left;
    font-size: 10pt;
  }
  th { background: #eee !important; font-weight: bold; }

  /* Blockquotes */
  blockquote {
    border-left: 3px solid #666;
    padding-left: 1em;
    margin-left: 0;
    font-style: italic;
    break-inside: avoid;
  }

  /* Utility */
  .print-only { display: block !important; }
  .no-print   { display: none !important; }
  .print-page-break { break-after: page; }
}
```
