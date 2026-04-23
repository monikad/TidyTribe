/**
 * AUTH MODULE — Firebase Authentication
 * ──────────────────────────────────────
 * Provides Google and Apple sign-in for TidyTribe.
 *
 * Flow:
 *  1. User signs in with Google or Apple → gets a Firebase UID
 *  2. We check Firestore "users/{uid}" for their linked household code
 *  3. If they have one → load that household and start sync
 *  4. If not → show Create / Join household screen
 *
 * Public API:
 *   auth module exports:
 *     signInWithGoogle()   → { user }
 *     signInWithApple()    → { user }
 *     signOut()
 *     onAuthReady(callback) → called once auth state is resolved
 *     getCurrentAuthUser() → Firebase user or null
 *     getUserProfile(uid)  → Firestore user doc
 *     setUserProfile(uid, data) → write user doc
 */

import { auth, db } from './firebase-config.js';
import {
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import {
    doc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// ─── Providers ─────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();
const appleProvider  = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// ─── Detect mobile (popup doesn't work well on iOS Safari) ──
function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// ─── Sign In ───────────────────────────────────────────

/**
 * Sign in with Google.
 * Uses redirect on mobile (popup blocked in iOS Safari), popup on desktop.
 */
export async function signInWithGoogle() {
    try {
        if (isMobile()) {
            await signInWithRedirect(auth, googleProvider);
            // Page will reload — result handled by onAuthReady
            return null;
        } else {
            const result = await signInWithPopup(auth, googleProvider);
            console.log('[Auth] ✅ Google sign-in:', result.user.displayName);
            return result.user;
        }
    } catch (err) {
        console.error('[Auth] ❌ Google sign-in failed:', err);
        throw err;
    }
}

/**
 * Sign in with Apple.
 * Uses redirect on mobile, popup on desktop.
 */
export async function signInWithApple() {
    try {
        if (isMobile()) {
            await signInWithRedirect(auth, appleProvider);
            return null;
        } else {
            const result = await signInWithPopup(auth, appleProvider);
            console.log('[Auth] ✅ Apple sign-in:', result.user.displayName);
            return result.user;
        }
    } catch (err) {
        console.error('[Auth] ❌ Apple sign-in failed:', err);
        throw err;
    }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
    try {
        await firebaseSignOut(auth);
        console.log('[Auth] Signed out');
    } catch (err) {
        console.error('[Auth] Sign-out failed:', err);
    }
}

// ─── Auth State ────────────────────────────────────────

/**
 * Get the currently signed-in Firebase user (or null).
 */
export function getCurrentAuthUser() {
    return auth.currentUser;
}

/**
 * Register a callback that fires once auth state is resolved.
 * Handles redirect results from mobile sign-in.
 * @param {Function} callback – receives (user) or (null)
 */
export function onAuthReady(callback) {
    // First check if we're returning from a redirect sign-in
    getRedirectResult(auth)
        .then(result => {
            if (result && result.user) {
                console.log('[Auth] ✅ Redirect sign-in completed:', result.user.displayName);
            }
        })
        .catch(err => {
            console.error('[Auth] Redirect result error:', err);
        });

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('[Auth] User:', user.displayName, user.uid);
        } else {
            console.log('[Auth] No user signed in');
        }
        callback(user);
    });
}

// ─── User Profile in Firestore ─────────────────────────
// Each authenticated user has a doc at "users/{uid}" that stores:
//   { displayName, email, photoURL, householdCode, role, memberId, lastLogin }

/**
 * Get the user's profile from Firestore.
 * @returns {object|null}
 */
export async function getUserProfile(uid) {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        return snap.exists() ? snap.data() : null;
    } catch (err) {
        console.error('[Auth] Failed to read user profile:', err);
        return null;
    }
}

/**
 * Write / update the user's profile in Firestore.
 */
export async function setUserProfile(uid, data) {
    try {
        await setDoc(doc(db, 'users', uid), data, { merge: true });
        console.log('[Auth] ✅ User profile saved');
    } catch (err) {
        console.error('[Auth] Failed to save user profile:', err);
    }
}
