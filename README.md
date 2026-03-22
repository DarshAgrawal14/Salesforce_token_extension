# Salesforce Token Testing Tool

A Microsoft Edge (Chromium) extension that replaces Salesforce-style `{{token}}` placeholders in email templates viewed in the browser, converts dynamic text patterns into interactive dropdowns, and provides a live preview of the rendered output — all without touching the actual Salesforce environment.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Installation](#installation)
- [How to Use](#how-to-use)
  - [Applying Tokens](#applying-tokens)
  - [Custom Tokens](#custom-tokens)
  - [Preview](#preview)
  - [Disabling the Extension](#disabling-the-extension)
  - [Resetting to Defaults](#resetting-to-defaults)
- [Built-in Token Reference](#built-in-token-reference)
- [Custom Text Dropdowns](#custom-text-dropdowns)
- [File Structure](#file-structure)
- [Architecture](#architecture)
  - [Data Flow](#data-flow)
  - [Content Script Lifecycle](#content-script-lifecycle)
  - [Nested Table Handling](#nested-table-handling)
- [Permissions](#permissions)
- [Troubleshooting](#troubleshooting)

---

## What It Does

Salesforce Marketing Cloud email templates use placeholder tokens like `{{userName}}` and dynamic content blocks like `{{customText[Option A|Option B|Option C]}}`. These tokens are only resolved when an email is actually sent, making it difficult to preview what a real recipient would see during development.

This extension solves that problem by performing three operations on any web page containing those templates:

1. **Token Replacement** — Scans all `<td>` elements on the page and replaces every `{{token}}` placeholder with user-provided (or default) values. For example, `{{userName}}` becomes `Saurabh`.

2. **Custom Text Dropdown Conversion** — Finds patterns like `{{customText[Hello|Hi|Dear]}}` and converts them into interactive `<select>` dropdown menus so you can pick which variant to preview.

3. **Live Preview** — Injects a floating "Preview" button onto the page. Clicking it opens a modal overlay that shows the fully rendered email with all dropdowns resolved to their currently selected text.

---

## Installation

1. Download or clone this repository to a local folder.
2. Open Microsoft Edge and navigate to `edge://extensions`.
3. Enable **Developer mode** using the toggle in the bottom-left corner.
4. Click **Load unpacked** and select the folder containing `manifest.json` (the root of this project).
5. The extension icon will appear in the Edge toolbar.

> **Note:** This also works in Google Chrome. Navigate to `chrome://extensions` instead.

---

## How to Use

### Applying Tokens

1. Open the web page that contains your Salesforce email template (this can be a local `.html` file, a Salesforce preview URL, a Gmail draft, etc.).
2. Click the extension icon in the toolbar to open the popup.
3. The popup shows input fields for six built-in tokens, each pre-filled with default values. Edit any value you want to test with.
4. Click **Save & Apply**.
5. The page will immediately update: all `{{token}}` placeholders in `<td>` cells are replaced with your values, `{{customText[...]}}` patterns become dropdowns, and a floating Preview button appears on the page.

You can change values and click **Save & Apply** again at any time — the extension restores the original template HTML before each re-application, so tokens are never "lost" after the first replacement.

### Custom Tokens

The six built-in tokens cover the most common Salesforce placeholders, but your templates may use additional ones. To handle those:

1. In the popup, scroll to the **Custom Tokens** section.
2. Click **+ Add Token**.
3. Enter the token key (e.g., `companyName` — the extension automatically wraps it in `{{ }}` if you don't).
4. Enter the replacement value (e.g., `Acme Corp`).
5. Add as many custom tokens as needed. Each row has a red X button to remove it.
6. Click **Save & Apply** to apply all tokens (built-in + custom) to the page.

Custom tokens are saved alongside the built-in ones and persist across browser sessions.

### Preview

After applying tokens, a floating blue **"Preview"** button appears at the top-left corner of the page, along with a small gray dismiss button (X) next to it.

- **Click the Preview button** to open a full-screen modal that shows the rendered email. All `<select>` dropdowns are resolved to the text of whichever option is currently selected, giving you a clean view of what the final email would look like.
- **Close the modal** by:
  - Clicking the X button in the top-right corner of the modal.
  - Clicking the dark backdrop area outside the modal content.
  - Pressing the **Escape** key.
- **Hide the Preview button** from the page by clicking the gray X dismiss button next to it. It will reappear the next time you click Save & Apply.

> **Important:** The preview is a client-side approximation. It shows what the template looks like with your test values, not the actual server-rendered output from Salesforce.

### Disabling the Extension

Click the red **Disable** button in the popup to:

1. **Restore the page** to its original unmodified state (all `<td>` elements revert to their original HTML, including raw `{{token}}` placeholders and `{{customText[...]}}` patterns).
2. **Remove the Preview button and modal** from the page.
3. **Clear saved token values** from storage so the extension won't auto-apply on future page loads.

This is a full rollback — the page will look exactly as it did before the extension ever touched it.

### Resetting to Defaults

Click the **Reset Defaults** button to restore all six built-in token fields to their original default values and remove any custom tokens. This updates the form and saves the defaults to storage, but does not immediately re-apply to the page. Click **Save & Apply** afterward to apply the defaults.

---

## Built-in Token Reference

| Token | Default Value | Description |
|---|---|---|
| `{{userName}}` | `xxxxxxx` | Recipient's first name |
| `{{userEmailAddress}}` | `XXXXX.XXXX@XXXXXi.com` | Recipient's email address |
| `{{User.Phone}}` | `+91(70047)36926` | Recipient's phone number |
| `{{accLname}}` | `XXXXXXX` | Account last name |
| `{{unsubscribe_product_link[,UnsubscribeComm]}}` | `https://unsubscribe.XXXX.us/` | Unsubscribe URL |
| `{{userPhoto}}` | Placeholder 100x100 image | User profile photo (rendered as an `<img>` tag) |

The `{{userPhoto}}` token is special: you enter a plain image URL in the popup, and the extension wraps it in a `100x100` inline `<img>` tag before injecting it into the page.

---

## Custom Text Dropdowns

Salesforce's `{{customText[...]}}` syntax allows template authors to define multiple content variants separated by pipes. For example:

```
{{customText[Hello|Hi there|Dear friend]}}
```

The extension converts this into a `<select>` dropdown with three options: "Hello", "Hi there", and "Dear friend". The user can select any option, and when they click the Preview button, the selected text is rendered in the preview modal.

This works for any number of options and can appear multiple times within the same template.

---

## File Structure

```
salesforce-token-testing-tool/
├── manifest.json      Extension configuration (Manifest V3)
├── content.js         Content script injected into web pages
├── popup.html         Popup UI markup
├── popup.css          Popup styling
├── popup.js           Popup logic and event handlers
├── icons/
│   ├── icon16.png     Toolbar icon (16x16)
│   ├── icon48.png     Extensions page icon (48x48)
│   └── icon128.png    Store/install icon (128x128)
└── README.md          This file
```

### manifest.json

The extension manifest using **Manifest V3** (required by Edge and modern Chrome). Declares:

- **Permissions:** `storage` (persist token values), `activeTab` (access the current tab), `scripting` (programmatically inject the content script).
- **Content Scripts:** `content.js` is injected into all URLs at `document_idle`.
- **Action:** The toolbar icon opens `popup.html`.

### content.js

The core script that runs on every web page. It contains four main functions:

- **`getLeafTds()`** — Returns only the innermost `<td>` elements (those with no nested `<td>` children). This prevents corruption when processing nested HTML table structures.
- **`snapshotAndRestore()`** — On first encounter, saves each leaf `<td>`'s original `innerHTML` into a `data-sf-original` attribute. On subsequent calls, restores the original HTML so the next token replacement starts from a clean slate.
- **`replaceTokens(tokenMap)`** — Iterates the token map, escapes each key for safe regex usage, and performs a global find-and-replace on every leaf `<td>`.
- **`convertCustomTextDropdowns()`** — Finds `{{customText[...]}}` patterns via regex and replaces them with `<select>` elements.
- **`injectPreviewButton()`** — Creates the floating Preview/Dismiss bar and the full-screen modal with its close button, backdrop click, and Escape key handling.

The script registers a `chrome.runtime.onMessage` listener (once) and reads from `chrome.storage.local` every time it is injected — ensuring both message-based and injection-based triggers work reliably.

### popup.html / popup.css

The popup UI with:

- Six labeled input fields for built-in tokens (text, email, tel, url types for appropriate validation hints).
- A dynamic "Custom Tokens" section where rows can be added/removed.
- Three action buttons: **Disable** (red), **Reset Defaults** (outline), **Save & Apply** (blue).
- A status message area that briefly flashes success/error feedback.

The popup is 380px wide with a clean, modern design using the Segoe UI font family.

### popup.js

Manages the popup lifecycle:

- **On open:** Reads `chrome.storage.local` for saved token values. If found, populates the form; otherwise fills in defaults.
- **Save & Apply:** Builds a token map from the current form state, writes it to storage, then uses `chrome.scripting.executeScript` to inject `content.js` into the active tab. The content script reads the freshly-saved values from storage and applies them.
- **Disable:** Removes the `tokenMap` from storage, then injects a small inline function that restores all `<td>` elements and removes the Preview UI.
- **Reset Defaults:** Resets the form fields and saves the default token map to storage.
- **Add Custom Token:** Dynamically creates a key/value input row with a remove button.

---

## Architecture

### Data Flow

```
User fills form in popup
        │
        ▼
popup.js saves tokenMap to chrome.storage.local
        │
        ▼
popup.js injects content.js into the active tab
        │
        ▼
content.js reads tokenMap from chrome.storage.local
        │
        ▼
content.js runs:
   1. snapshotAndRestore()  ─── save originals / restore from previous run
   2. replaceTokens()       ─── swap {{tokens}} with values
   3. convertCustomTextDropdowns() ─── {{customText[...]}} → <select>
   4. injectPreviewButton() ─── add floating Preview UI (once)
```

### Content Script Lifecycle

The content script can be loaded in two ways:

1. **Automatically via manifest** — On every page load, `content.js` is injected at `document_idle`. If token values exist in storage, they are applied immediately.

2. **Programmatically via popup** — When the user clicks "Save & Apply", the popup uses `chrome.scripting.executeScript` to inject `content.js` into the active tab. This handles the case where the tab was already open before the extension was installed.

To prevent duplicate side effects:
- The `chrome.runtime.onMessage` listener is guarded by `window.__sfTokenToolListener` so it only registers once.
- The Preview bar is guarded by a DOM `id` check (`sf-token-preview-bar`) so it only appears once.
- The storage read and `applyAll()` call run on every injection, which is intentional — it ensures the latest saved values are always picked up.

### Nested Table Handling

Email templates commonly use deeply nested `<table>` structures. If the extension processed all `<td>` elements (including outer wrapper cells), setting `innerHTML` on an outer `<td>` would serialize the inner elements — including their `data-sf-original` attributes — and the regex replacements would corrupt those attribute values.

To prevent this, the `getLeafTds()` helper filters to only `<td>` elements that contain no nested `<td>` children. This ensures:

- Only the innermost cells are snapshotted and modified.
- Outer wrapper cells are left untouched.
- Changes to inner cells naturally propagate up through the DOM tree.

---

## Permissions

| Permission | Why It's Needed |
|---|---|
| `storage` | Persist token values across browser sessions so they auto-apply on page load. |
| `activeTab` | Access the currently active tab to inject the content script and apply tokens. |
| `scripting` | Programmatically inject `content.js` into tabs that were open before the extension was loaded. |

The extension does not collect, transmit, or store any data outside of `chrome.storage.local`. All processing happens entirely within the browser.

---

## Troubleshooting

**Tokens are not being replaced**
- Make sure the tokens in your template are inside `<td>` elements. The extension only scans `<td>` cells.
- Verify the token syntax matches exactly, including capitalization and special characters (e.g., `{{User.Phone}}` not `{{user.phone}}`).

**"Cannot access this page" error**
- The extension cannot inject scripts into restricted pages like `edge://`, `chrome://`, the extensions page, or the Web Store. Open your template on a regular `http://` or `file://` URL.

**Changes don't appear after Save & Apply**
- Try refreshing the page first, then clicking Save & Apply. The extension auto-applies saved values on page load.
- On single-page apps (like Gmail), the DOM may have changed since the initial load. A page refresh ensures clean injection.

**Preview button is not visible**
- The Preview button only appears after at least one successful Save & Apply. If you previously dismissed it with the X button, click Save & Apply again to re-inject it.

**Dropdowns appear as raw text**
- Make sure the `{{customText[...]}}` pattern uses square brackets and pipes: `{{customText[Option A|Option B]}}`. Curly braces, brackets, and pipes are all required.

**Extension doesn't work on local HTML files**
- In `edge://extensions`, find the extension and check **"Allow access to file URLs"** to enable it on `file:///` pages.
