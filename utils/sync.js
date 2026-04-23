/**
 * SYNC MODULE — Firebase Firestore
 * ─────────────────────────────────
 * Real-time sync across devices using Firestore's onSnapshot listener.
 * Replaces the previous HTTP-polling approach with instant updates.
 *
 * The PUBLIC API is identical to the old version so that store.js,
 * app.js, and all other modules need ZERO changes.
 *
 *   sync.start(code, onRemoteUpdate)   – listen for real-time changes
 *   sync.stop()                        – detach listener
 *   sync.push(state)                   – write state to Firestore (debounced 500 ms)
 *   sync.pull()                        – one-shot read (rarely needed now)
 *   sync.fetchHousehold(code)          – read a household doc (join flow)
 *   sync.exists(code)                  – check if a household code exists
 *   sync.onStatusChange                – UI callback
 */

import { db } from './firebase-config.js';
import {
    doc,
    getDoc,
    setDoc,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { storeLogger } from './logger.js';

class SyncManager {
    constructor() {
        /** Currently tracked household code */
        this.householdCode = null;
        /** Debounce timer for push */
        this._pushTimer = null;
        /** Firestore onSnapshot unsubscribe function */
        this._unsubscribe = null;
        /** UI callback: (status) => void  status ∈ {syncing, synced, offline, error} */
        this.onStatusChange = null;
        /** Whether we're currently pushing (prevents echo) */
        this._pushing = false;
        /** Whether sync is active */
        this._active = false;
        /** Callback for remote updates */
        this._onRemoteUpdate = null;
        /** Timestamp of the last push we made (prevents processing our own writes) */
        this._lastPushTimestamp = 0;
    }

    // ─── Public API ────────────────────────────────────────────

    /**
     * Start real-time syncing for a household code.
     * Sets up a Firestore onSnapshot listener — updates arrive instantly.
     * @param {string} code  – 6-letter household code
     * @param {Function} onRemoteUpdate – called with clean state on remote changes
     */
    start(code, onRemoteUpdate) {
        if (!code) return;
        this.householdCode = code.toUpperCase();
        this._onRemoteUpdate = onRemoteUpdate;
        this._active = true;
        this._setStatus('synced');

        console.log('[Sync] 🔌 Starting real-time sync for:', this.householdCode);

        // Tear down any previous listener
        this._stopListening();

        // Set up Firestore real-time listener
        const docRef = doc(db, 'households', this.householdCode);

        this._unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                console.log('[Sync] 📥 onSnapshot fired, exists:', snapshot.exists());
                if (!snapshot.exists()) {
                    // Document doesn't exist yet — that's OK, we'll push later
                    this._setStatus('synced');
                    return;
                }

                const data = snapshot.data();
                const serverMod = data._lastModified || 0;

                // Skip echoes from our own writes
                if (this._pushing || serverMod <= this._lastPushTimestamp) {
                    this._setStatus('synced');
                    return;
                }

                // Strip server metadata before feeding into the store
                const cleanData = { ...data };
                delete cleanData._lastModified;

                if (this._onRemoteUpdate) {
                    this._onRemoteUpdate(cleanData);
                }

                storeLogger.info('[Sync] Real-time update from Firestore', { serverMod });
                this._setStatus('synced');
            },
            (error) => {
                storeLogger.error('[Sync] Firestore listener error', error);
                this._setStatus('offline');
            }
        );

        storeLogger.info('[Sync] Real-time listener started', { code: this.householdCode });
    }

    /** Stop syncing and detach the Firestore listener. */
    stop() {
        this._active = false;
        this._stopListening();
        clearTimeout(this._pushTimer);
        this.householdCode = null;
        this._lastPushTimestamp = 0;
        storeLogger.info('[Sync] Stopped');
    }

    /**
     * Push local state to Firestore (debounced 500 ms).
     * @param {object} state – the full store state object
     */
    push(state) {
        if (!this._active || !this.householdCode) return;
        clearTimeout(this._pushTimer);
        this._pushTimer = setTimeout(() => this._doPush(state), 500);
    }

    /**
     * Pull latest state from Firestore (one-shot read).
     * With onSnapshot this is rarely needed, but kept for API compatibility.
     */
    async pull() {
        if (!this._active || !this.householdCode) return;
        if (this._pushing) return;
        try {
            this._setStatus('syncing');
            const docRef = doc(db, 'households', this.householdCode);
            const snapshot = await getDoc(docRef);

            if (snapshot.exists()) {
                const data = snapshot.data();
                const cleanData = { ...data };
                delete cleanData._lastModified;
                this._setStatus('synced');
                return cleanData;
            }
            this._setStatus('synced');
            return null;
        } catch (err) {
            storeLogger.error('[Sync] Pull failed', err);
            this._setStatus('offline');
            return null;
        }
    }

    /**
     * Fetch household data by code (used during the Join flow).
     * Does NOT start a listener — caller should call start() afterwards.
     * Also stores the document's _lastModified so the subsequent
     * onSnapshot doesn't echo the same data back as a "remote update".
     * @returns {object|null} The household state, or null if not found.
     */
    async fetchHousehold(code) {
        const c = code.toUpperCase().trim();
        try {
            this._setStatus('syncing');
            const docRef = doc(db, 'households', c);
            const snapshot = await getDoc(docRef);

            if (snapshot.exists()) {
                const data = snapshot.data();
                // Remember the version so onSnapshot skips the initial echo
                this._lastPushTimestamp = data._lastModified || 0;
                const cleanData = { ...data };
                delete cleanData._lastModified;
                this._setStatus('synced');
                return cleanData;
            }
            this._setStatus('synced');
            return null;
        } catch (err) {
            storeLogger.error('[Sync] fetchHousehold failed', err);
            this._setStatus('offline');
            return null;
        }
    }

    /**
     * Check whether a household code exists in Firestore.
     * @returns {boolean}
     */
    async exists(code) {
        const c = code.toUpperCase().trim();
        try {
            const docRef = doc(db, 'households', c);
            const snapshot = await getDoc(docRef);
            return snapshot.exists();
        } catch {
            return false;
        }
    }

    // ─── Internal ──────────────────────────────────────────────

    async _doPush(state) {
        if (!this._active || !this.householdCode) return;
        this._pushing = true;
        try {
            this._setStatus('syncing');
            const timestamp = Date.now() / 1000;
            const docRef = doc(db, 'households', this.householdCode);

            // Firestore doesn't accept undefined values — strip them
            const cleanState = JSON.parse(JSON.stringify(state));

            await setDoc(docRef, {
                ...cleanState,
                _lastModified: timestamp
            });

            // Record the timestamp so onSnapshot ignores our own write
            this._lastPushTimestamp = timestamp;
            this._setStatus('synced');
            console.log('[Sync] ✅ Pushed to Firestore:', this.householdCode);
        } catch (err) {
            console.error('[Sync] ❌ Push FAILED:', err.message, err);
            this._setStatus('offline');
        } finally {
            this._pushing = false;
        }
    }

    _stopListening() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
    }

    _setStatus(status) {
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }
}

/** Singleton */
const sync = new SyncManager();
export default sync;
