/**
 * Salesforce Token Testing Tool — Popup Script
 *
 * Manages the popup form: loads saved / default values, lets the user
 * edit them, persists to chrome.storage.local, and sends a message to
 * the active tab's content script to apply the tokens.
 *
 * If the content script hasn't been injected yet (tab was open before
 * the extension was installed / enabled), it falls back to programmatic
 * injection via chrome.scripting.executeScript.
 */

(() => {
    "use strict";

    /* ------------------------------------------------------------------ */
    /*  Default values (same as content.js)                                */
    /* ------------------------------------------------------------------ */
    const DEFAULTS = {
        "{{userName}}":        "Saurabh",
        "{{userEmailAddress}}": "Saurabh.madhukar@sanofi.com",
        "{{User.Phone}}":      "+91(70047)36926",
        "{{accLname}}":        "Madhukar",
        "{{unsubscribe_product_link[,UnsubscribeComm]}}": "https://unsubscribe.sanofi.us/",
        "{{userPhoto}}":       "https://www.dummyimage.com/100.png"
    };

    const BUILTIN_KEYS = Object.keys(DEFAULTS);

    /* ------------------------------------------------------------------ */
    /*  DOM references                                                     */
    /* ------------------------------------------------------------------ */
    const applyBtn         = document.getElementById("applyBtn");
    const resetBtn         = document.getElementById("resetBtn");
    const disableBtn       = document.getElementById("disableBtn");
    const addCustomBtn     = document.getElementById("addCustomBtn");
    const customTokensList = document.getElementById("customTokensList");
    const statusMsg        = document.getElementById("statusMsg");

    /* ------------------------------------------------------------------ */
    /*  Helper: build the full token map from current form state           */
    /* ------------------------------------------------------------------ */
    function buildTokenMap() {
        const map = {};

        document.querySelectorAll("[data-token]").forEach((input) => {
            const token = input.dataset.token;
            const value = input.value.trim();
            if (value) {
                if (token === "{{userPhoto}}") {
                    map[token] =
                        '<img style="display:inline-block;width:100px;height:100px;" ' +
                        `src="${value}" alt="User Photo">`;
                } else {
                    map[token] = value;
                }
            }
        });

        document.querySelectorAll(".custom-token-row").forEach((row) => {
            const keyInput   = row.querySelector(".custom-key");
            const valueInput = row.querySelector(".custom-value");
            const key   = keyInput?.value.trim();
            const value = valueInput?.value.trim();
            if (key && value) {
                const wrappedKey = key.startsWith("{{") ? key : `{{${key}}}`;
                map[wrappedKey] = value;
            }
        });

        return map;
    }

    /* ------------------------------------------------------------------ */
    /*  Helper: populate form fields from a token map                      */
    /* ------------------------------------------------------------------ */
    function populateFields(tokenMap) {
        document.querySelectorAll("[data-token]").forEach((input) => {
            const token = input.dataset.token;
            if (token === "{{userPhoto}}" && tokenMap[token]) {
                const srcMatch = tokenMap[token].match(/src="([^"]+)"/);
                input.value = srcMatch ? srcMatch[1] : tokenMap[token];
            } else {
                input.value = tokenMap[token] || "";
            }
        });

        customTokensList.innerHTML = "";
        for (const [key, value] of Object.entries(tokenMap)) {
            if (!BUILTIN_KEYS.includes(key)) {
                addCustomRow(key, value);
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Helper: add a custom token row                                     */
    /* ------------------------------------------------------------------ */
    function addCustomRow(key = "", value = "") {
        const row = document.createElement("div");
        row.className = "custom-token-row";

        const keyInput = document.createElement("input");
        keyInput.type        = "text";
        keyInput.className   = "custom-key";
        keyInput.placeholder = "Token key";
        keyInput.value       = key.replace(/^\{\{|\}\}$/g, "");

        const valueInput = document.createElement("input");
        valueInput.type        = "text";
        valueInput.className   = "custom-value";
        valueInput.placeholder = "Value";
        valueInput.value       = value;

        const removeBtn = document.createElement("button");
        removeBtn.type      = "button";
        removeBtn.className = "remove-token-btn";
        removeBtn.textContent = "\u00D7";
        removeBtn.addEventListener("click", () => row.remove());

        row.appendChild(keyInput);
        row.appendChild(valueInput);
        row.appendChild(removeBtn);
        customTokensList.appendChild(row);
    }

    /* ------------------------------------------------------------------ */
    /*  Helper: flash a status message                                     */
    /* ------------------------------------------------------------------ */
    function showStatus(text, type = "success") {
        statusMsg.textContent = text;
        statusMsg.className   = `status-msg ${type}`;
        setTimeout(() => {
            statusMsg.className = "status-msg hidden";
        }, 2500);
    }

    /* ------------------------------------------------------------------ */
    /*  "Save & Apply" handler                                             */
    /*                                                                     */
    /*  Strategy: save to storage FIRST, then inject content.js into the   */
    /*  tab. The script always reads from storage on injection, so it      */
    /*  picks up the new values automatically — no message passing needed  */
    /*  for the first click. We also send a message as a fast-path for     */
    /*  tabs where the script is already loaded.                           */
    /* ------------------------------------------------------------------ */
    applyBtn.addEventListener("click", () => {
        const tokenMap = buildTokenMap();

        chrome.storage.local.set({ tokenMap }, () => {
            chrome.tabs.query(
                { active: true, currentWindow: true },
                (tabs) => {
                    if (!tabs[0]?.id) {
                        showStatus("No active tab found.", "error");
                        return;
                    }

                    const tabId = tabs[0].id;

                    chrome.scripting.executeScript(
                        {
                            target: { tabId },
                            files:  ["content.js"]
                        },
                        () => {
                            if (chrome.runtime.lastError) {
                                showStatus(
                                    "Cannot access this page (restricted URL).",
                                    "error"
                                );
                                return;
                            }
                            showStatus("Tokens applied successfully!");
                        }
                    );
                }
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  "Disable" handler — roll back page to original, clear storage      */
    /* ------------------------------------------------------------------ */
    disableBtn.addEventListener("click", () => {
        chrome.storage.local.remove("tokenMap", () => {
            chrome.tabs.query(
                { active: true, currentWindow: true },
                (tabs) => {
                    if (!tabs[0]?.id) {
                        showStatus("No active tab found.", "error");
                        return;
                    }

                    const tabId = tabs[0].id;

                    chrome.scripting.executeScript(
                        {
                            target: { tabId },
                            func:   () => {
                                const DATA_ATTR = "data-sf-original";

                                /* Restore every leaf <td> to its original HTML */
                                Array.from(document.querySelectorAll("td"))
                                    .filter((td) => !td.querySelector("td"))
                                    .forEach((td) => {
                                        if (td.hasAttribute(DATA_ATTR)) {
                                            td.innerHTML = td.getAttribute(DATA_ATTR);
                                            td.removeAttribute(DATA_ATTR);
                                        }
                                    });

                                /* Remove the preview bar and modal */
                                const bar   = document.getElementById("sf-token-preview-bar");
                                const modal = document.getElementById("sf-token-preview-modal");
                                const style = document.getElementById("sf-token-preview-style");
                                if (bar)   bar.remove();
                                if (modal) modal.remove();
                                if (style) style.remove();
                            }
                        },
                        () => {
                            if (chrome.runtime.lastError) {
                                showStatus(
                                    "Cannot access this page (restricted URL).",
                                    "error"
                                );
                                return;
                            }
                            showStatus("Extension disabled — page restored.");
                        }
                    );
                }
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  "Reset Defaults" handler                                           */
    /* ------------------------------------------------------------------ */
    resetBtn.addEventListener("click", () => {
        populateFields(DEFAULTS);
        chrome.storage.local.set({ tokenMap: DEFAULTS }, () => {
            showStatus("Reset to defaults.");
        });
    });

    /* ------------------------------------------------------------------ */
    /*  "Add Custom Token" handler                                         */
    /* ------------------------------------------------------------------ */
    addCustomBtn.addEventListener("click", () => addCustomRow());

    /* ------------------------------------------------------------------ */
    /*  On popup open: load saved values (or defaults)                     */
    /* ------------------------------------------------------------------ */
    chrome.storage.local.get("tokenMap", (result) => {
        const saved = result.tokenMap;
        if (saved && Object.keys(saved).length > 0) {
            populateFields(saved);
        } else {
            populateFields(DEFAULTS);
        }
    });
})();
