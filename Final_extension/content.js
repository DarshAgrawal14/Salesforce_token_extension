/**
 * Salesforce Token Testing Tool — Content Script
 *
 * Injected into every page. Waits for a message from the popup
 * (or reads stored values on load) and then:
 *   1. Replaces {{token}} placeholders inside <td> elements.
 *   2. Converts {{customText[opt1|opt2|...]}} into <select> dropdowns.
 *   3. Injects a floating "Preview" button + modal.
 *
 * Only LEAF <td> elements (those without nested <td> children) are
 * processed, preventing corruption in nested table structures.
 */

(() => {
    "use strict";

    const DATA_ATTR = "data-sf-original";

    /* ------------------------------------------------------------------ */
    /*  Default token map                                                  */
    /* ------------------------------------------------------------------ */
    const DEFAULT_TOKEN_MAP = {
        "{{userName}}":        "Saurabh",
        "{{userEmailAddress}}": "Saurabh.madhukar@sanofi.com",
        "{{User.Phone}}":      "+91(70047)36926",
        "{{accLname}}":        "Madhukar",
        "{{unsubscribe_product_link[,UnsubscribeComm]}}": "https://unsubscribe.sanofi.us/",
        "{{userPhoto}}":
            '<img style="display:inline-block;width:100px;height:100px;" ' +
            'src="https://www.dummyimage.com/100.png" alt="User Photo">'
    };

    /* ------------------------------------------------------------------ */
    /*  Helper: return only leaf <td> elements (no nested <td> inside)     */
    /* ------------------------------------------------------------------ */
    function getLeafTds() {
        return Array.from(document.querySelectorAll("td")).filter(
            (td) => !td.querySelector("td")
        );
    }

    /* ================================================================== */
    /*  SNAPSHOT / RESTORE                                                 */
    /* ================================================================== */

    function snapshotAndRestore() {
        getLeafTds().forEach((td) => {
            if (!td.hasAttribute(DATA_ATTR)) {
                td.setAttribute(DATA_ATTR, td.innerHTML);
            } else {
                td.innerHTML = td.getAttribute(DATA_ATTR);
            }
        });
    }

    /* ================================================================== */
    /*  1.  TOKEN REPLACEMENT                                              */
    /* ================================================================== */

    function replaceTokens(tokenMap) {
        getLeafTds().forEach((td) => {
            for (const [token, value] of Object.entries(tokenMap)) {
                const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const regex   = new RegExp(escaped, "g");
                td.innerHTML  = td.innerHTML.replace(regex, value);
            }
        });
    }

    /* ================================================================== */
    /*  2.  CUSTOM-TEXT DROPDOWN CONVERSION                                */
    /* ================================================================== */

    function convertCustomTextDropdowns() {
        const pattern = /\{\{customText\[([^\]]*)\]\}\}/g;

        getLeafTds().forEach((td) => {
            td.innerHTML = td.innerHTML.replace(pattern, (_match, content) => {
                const options = content
                    .split("|")
                    .map((text) => {
                        const trimmed = text.trim();
                        return `<option value="${trimmed}">${trimmed || "&nbsp;"}</option>`;
                    })
                    .join("");

                return `<select style="max-width:400px;display:inline-block;">${options}</select>`;
            });
        });
    }

    /* ================================================================== */
    /*  3.  PREVIEW BUTTON + MODAL  (only injected once)                   */
    /* ================================================================== */

    function injectPreviewButton() {
        if (document.getElementById("sf-token-preview-bar")) return;

        /* ---------- Container bar (holds Preview + Dismiss) ---------- */
        const bar = document.createElement("div");
        bar.id = "sf-token-preview-bar";
        Object.assign(bar.style, {
            position:    "fixed",
            top:         "10px",
            left:        "10px",
            zIndex:      "9999",
            display:     "flex",
            gap:         "6px",
            alignItems:  "center",
            fontFamily:  "Arial, sans-serif",
            fontSize:    "14px"
        });

        /* ---------- Preview button ---------- */
        const previewBtn = document.createElement("button");
        previewBtn.textContent = "\uD83D\uDD0D Preview";
        Object.assign(previewBtn.style, {
            padding:      "10px 15px",
            background:   "#007bff",
            color:        "#fff",
            border:       "none",
            borderRadius: "5px",
            cursor:       "pointer",
            fontFamily:   "inherit",
            fontSize:     "inherit"
        });

        /* ---------- Dismiss button (hides the whole bar) ---------- */
        const dismissBtn = document.createElement("button");
        dismissBtn.textContent = "\u2715";
        dismissBtn.title = "Hide preview button";
        Object.assign(dismissBtn.style, {
            width:        "30px",
            height:       "30px",
            background:   "#6b7280",
            color:        "#fff",
            border:       "none",
            borderRadius: "50%",
            cursor:       "pointer",
            fontSize:     "14px",
            fontWeight:   "bold",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center"
        });
        dismissBtn.addEventListener("click", () => {
            bar.style.display = "none";
        });

        bar.appendChild(previewBtn);
        bar.appendChild(dismissBtn);
        document.body.appendChild(bar);

        /* ---------- Modal overlay ---------- */
        const modal = document.createElement("div");
        modal.id = "sf-token-preview-modal";
        Object.assign(modal.style, {
            position:        "fixed",
            top:             "0",
            left:            "0",
            width:           "100%",
            height:          "100%",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display:         "none",
            zIndex:          "10000",
            justifyContent:  "center",
            alignItems:      "center"
        });

        /* ---------- Modal content ---------- */
        const modalContent = document.createElement("div");
        Object.assign(modalContent.style, {
            position:     "relative",
            background:   "#fff",
            padding:      "20px",
            borderRadius: "8px",
            maxWidth:     "90%",
            maxHeight:    "90%",
            overflowY:    "auto",
            fontFamily:   "Arial, sans-serif",
            fontSize:     "14px"
        });
        modal.appendChild(modalContent);

        /* ---------- Modal close button ---------- */
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "\u2715";
        Object.assign(closeBtn.style, {
            position:       "absolute",
            top:            "10px",
            right:          "10px",
            width:          "32px",
            height:         "32px",
            border:         "none",
            borderRadius:   "50%",
            background:     "#e5e7eb",
            color:          "#374151",
            fontSize:       "18px",
            fontWeight:     "bold",
            cursor:         "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            zIndex:         "1"
        });

        function closeModal() {
            modal.style.display = "none";
        }

        closeBtn.addEventListener("click", closeModal);

        /* ---------- CSS for preview body ---------- */
        if (!document.getElementById("sf-token-preview-style")) {
            const style = document.createElement("style");
            style.id = "sf-token-preview-style";
            style.textContent = `.previewHtmlCode { width: 80vw; margin-top: 10px; }`;
            document.head.appendChild(style);
        }

        /* ---------- Close modal: backdrop click ---------- */
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });

        /* ---------- Close modal: Escape key ---------- */
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.style.display === "flex") {
                closeModal();
            }
        });

        document.body.appendChild(modal);

        /* ---------- Preview click handler ---------- */
        previewBtn.addEventListener("click", () => {
            const clone           = document.body.cloneNode(true);
            const originalSelects = document.querySelectorAll("select");
            const clonedSelects   = clone.querySelectorAll("select");

            originalSelects.forEach((original, index) => {
                const selectedText =
                    original.options[original.selectedIndex]?.textContent || "";
                const span = document.createElement("span");
                span.textContent = selectedText;
                clonedSelects[index].replaceWith(span);
            });

            const previewHTML =
                clone.querySelector("table")?.outerHTML || clone.innerHTML;

            modalContent.innerHTML = "";
            modalContent.appendChild(closeBtn);
            const previewBody = document.createElement("div");
            previewBody.innerHTML =
                '<h3 style="margin-right:40px;">\uD83D\uDD0D Preview</h3>' +
                "<p>Caution: This is just a preview, not the actual rendered output.</p><hr>" +
                `<div class="previewHtmlCode">${previewHTML}</div>`;
            modalContent.appendChild(previewBody);

            modal.style.display = "flex";
        });
    }

    /* ================================================================== */
    /*  ORCHESTRATION                                                      */
    /* ================================================================== */

    function applyAll(tokenMap) {
        snapshotAndRestore();
        replaceTokens(tokenMap);
        convertCustomTextDropdowns();
        injectPreviewButton();
    }

    /* ------------------------------------------------------------------ */
    /*  Message listener — only register once                              */
    /* ------------------------------------------------------------------ */
    if (!window.__sfTokenToolListener) {
        window.__sfTokenToolListener = true;

        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            if (message.action === "applyTokens") {
                const map = message.tokenMap || DEFAULT_TOKEN_MAP;
                applyAll(map);
                sendResponse({ status: "done" });
            }
            return true;
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Auto-apply from storage — runs every time the script is injected   */
    /* ------------------------------------------------------------------ */
    chrome.storage.local.get("tokenMap", (result) => {
        if (result.tokenMap && Object.keys(result.tokenMap).length > 0) {
            applyAll(result.tokenMap);
        }
    });
})();
