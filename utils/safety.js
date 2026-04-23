/**
 * SAFETY UTILITIES
 * ────────────────
 * Provides kid-safety features:
 *   1. escapeHtml()     – sanitise user strings before innerHTML
 *   2. Parent PIN gate  – prompt for 4-digit PIN before admin actions
 *   3. isParent()       – quick role check for current user
 */

/* ═══════════════════════════════════════════
   1. HTML ESCAPING
   ═══════════════════════════════════════════ */

const ESC_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

/**
 * Escape a string for safe insertion via innerHTML.
 * @param {string} str – untrusted user input
 * @returns {string}
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return str ?? '';
    return str.replace(/[&<>"']/g, ch => ESC_MAP[ch]);
}

/* ═══════════════════════════════════════════
   2. PARENT PIN SYSTEM
   ═══════════════════════════════════════════ */

const PIN_KEY = 'tidytribe-parent-pin';

/** Check whether a parent PIN has been set for this household. */
export function hasPinSet() {
    return !!localStorage.getItem(PIN_KEY);
}

/** Save a new 4-digit parent PIN. */
export function setPin(pin) {
    if (!/^\d{4}$/.test(pin)) return false;
    localStorage.setItem(PIN_KEY, pin);
    return true;
}

/** Clear the stored PIN (for testing / reset). */
export function clearPin() {
    localStorage.removeItem(PIN_KEY);
}

/**
 * Show a modal prompting for the 4-digit parent PIN.
 * Returns a Promise that resolves to `true` if correct, `false` if cancelled or wrong.
 */
export function requirePin(actionLabel = 'This action') {
    return new Promise((resolve) => {
        if (!hasPinSet()) {
            // No PIN configured yet — allow the action
            resolve(true);
            return;
        }

        const stored = localStorage.getItem(PIN_KEY);

        // Build the PIN modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'pin-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:340px">
                <div class="modal-header">
                    <h2 class="modal-title">🔒 Parent PIN Required</h2>
                    <button class="modal-close" id="pin-close" aria-label="Close">×</button>
                </div>
                <div class="modal-body" style="text-align:center">
                    <p style="color:var(--text-secondary);margin-bottom:16px;font-size:14px">${escapeHtml(actionLabel)} requires the parent PIN.</p>
                    <input type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" id="pin-input"
                           class="form-input" placeholder="Enter 4-digit PIN"
                           style="text-align:center;font-size:24px;letter-spacing:12px;max-width:200px;margin:0 auto">
                    <div id="pin-error" class="form-error" style="margin-top:8px;text-align:center"></div>
                    <div class="modal-footer" style="margin-top:16px">
                        <button class="btn btn-secondary btn-small" id="pin-cancel">Cancel</button>
                        <button class="btn btn-primary btn-small" id="pin-confirm">Unlock</button>
                    </div>
                </div>
            </div>
        `;

        const root = document.getElementById('modal-root') || document.body;
        root.appendChild(overlay);

        const input     = document.getElementById('pin-input');
        const errorEl   = document.getElementById('pin-error');
        const confirmBtn = document.getElementById('pin-confirm');

        function cleanup(result) {
            overlay.remove();
            resolve(result);
        }

        document.getElementById('pin-close').addEventListener('click', () => cleanup(false));
        document.getElementById('pin-cancel').addEventListener('click', () => cleanup(false));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });

        confirmBtn.addEventListener('click', () => {
            if (input.value === stored) {
                cleanup(true);
            } else {
                errorEl.textContent = 'Incorrect PIN. Try again.';
                input.value = '';
                input.focus();
            }
        });

        // Allow Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmBtn.click();
            }
        });

        // Auto-submit when 4 digits entered
        input.addEventListener('input', () => {
            errorEl.textContent = '';
            if (input.value.length === 4) {
                confirmBtn.click();
            }
        });

        setTimeout(() => input.focus(), 100);
    });
}

/* ═══════════════════════════════════════════
   3. ROLE HELPERS
   ═══════════════════════════════════════════ */

/**
 * Check if the current device user is a parent.
 * @param {object} store – the store singleton
 * @returns {boolean}
 */
export function isParent(store) {
    const user = store.getCurrentUser();
    return user?.role === 'parent';
}

/**
 * Show a "Set Parent PIN" modal.
 * Called once when a parent first creates or joins a household.
 * Returns a Promise that resolves when the PIN is saved.
 */
export function showSetPinModal() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'set-pin-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:380px">
                <div class="modal-header">
                    <h2 class="modal-title">🔐 Set Parent PIN</h2>
                </div>
                <div class="modal-body" style="text-align:center">
                    <p style="color:var(--text-secondary);margin-bottom:16px;font-size:14px;line-height:1.5">
                        Choose a 4-digit PIN to protect admin actions<br>
                        (deleting members, editing rewards, etc.)
                    </p>
                    <input type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" id="new-pin-input"
                           class="form-input" placeholder="Choose PIN"
                           style="text-align:center;font-size:24px;letter-spacing:12px;max-width:200px;margin:0 auto">
                    <input type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" id="confirm-pin-input"
                           class="form-input" placeholder="Confirm PIN"
                           style="text-align:center;font-size:24px;letter-spacing:12px;max-width:200px;margin:8px auto 0">
                    <div id="set-pin-error" class="form-error" style="margin-top:8px;text-align:center"></div>
                    <div class="modal-footer" style="margin-top:16px">
                        <button class="btn btn-secondary btn-small" id="skip-pin-btn">Skip for now</button>
                        <button class="btn btn-primary btn-small" id="save-pin-btn">Save PIN</button>
                    </div>
                </div>
            </div>
        `;

        const root = document.getElementById('modal-root') || document.body;
        root.appendChild(overlay);

        const pinInput     = document.getElementById('new-pin-input');
        const confirmInput = document.getElementById('confirm-pin-input');
        const errorEl      = document.getElementById('set-pin-error');

        function cleanup() {
            overlay.remove();
            resolve();
        }

        document.getElementById('skip-pin-btn').addEventListener('click', cleanup);

        document.getElementById('save-pin-btn').addEventListener('click', () => {
            const pin = pinInput.value;
            const confirm = confirmInput.value;

            if (!/^\d{4}$/.test(pin)) {
                errorEl.textContent = 'PIN must be exactly 4 digits.';
                return;
            }
            if (pin !== confirm) {
                errorEl.textContent = 'PINs don\'t match. Try again.';
                confirmInput.value = '';
                confirmInput.focus();
                return;
            }

            setPin(pin);
            cleanup();
        });

        // Enter on confirm field → submit
        confirmInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('save-pin-btn').click();
            }
        });

        setTimeout(() => pinInput.focus(), 100);
    });
}
