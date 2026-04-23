/**
 * ONBOARDING COMPONENT — Firebase Auth
 * ──────────────────────────────────────
 * Two-step flow:
 *   Step 1: Sign in with Google or Apple
 *   Step 2: Create a new household OR Join an existing one
 *
 * Once signed in & linked to a household, the user never sees this again
 * (unless they sign out).
 */

import { uiLogger } from '../utils/logger.js?v=7.0.0';
import store from '../store.js?v=7.0.0';
import {
    signInWithGoogle,
    signInWithApple,
    getCurrentAuthUser,
    getUserProfile,
    setUserProfile,
    signOut
} from '../utils/auth.js';
import { showSetPinModal, hasPinSet } from '../utils/safety.js?v=7.0.0';

/* ─── State ─── */
let _currentStep = 'signin'; // signin | household | pickMember

/* ─── Public: render the onboarding screen ─── */
export function renderOnboarding() {
    uiLogger.lifecycle('Rendering Onboarding');
    const main = document.getElementById('main-content');
    if (!main) return;

    const authUser = getCurrentAuthUser();

    if (!authUser) {
        _currentStep = 'signin';
        _renderSignIn(main);
    } else if (!store.hasHousehold()) {
        _currentStep = 'household';
        _renderHouseholdSetup(main, authUser);
    } else {
        _currentStep = 'pickMember';
        _renderPickMember(main);
    }
}

/* ═══════════════════════════════════════════════════════════
   STEP 1 — Sign In
   ═══════════════════════════════════════════════════════════ */
function _renderSignIn(main) {
    main.innerHTML = `
    <div class="onboarding">
        <div class="onboarding-hero">
            <div class="onboarding-logo">🏠</div>
            <h1 class="onboarding-title">TidyTribe</h1>
            <p class="onboarding-sub">Turn household chaos into teamwork!</p>
        </div>

        <div class="ios-section">
            <div class="ios-section-title">Sign in to get started</div>
            <div class="ios-group" style="padding:20px">
                <button id="google-signin-btn" class="btn btn-full auth-btn auth-btn-google">
                    <svg width="20" height="20" viewBox="0 0 48 48" style="flex-shrink:0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    <span>Continue with Google</span>
                </button>

                <button id="apple-signin-btn" class="btn btn-full auth-btn auth-btn-apple" style="margin-top:12px">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <span>Continue with Apple</span>
                </button>

                <div id="signin-error" class="form-error" style="margin-top:12px;text-align:center"></div>
            </div>
        </div>

        <p style="color:var(--text-tertiary);font-size:12px;text-align:center;margin-top:24px;line-height:1.4;padding:0 20px">
            Sign in to sync your family's chores across all devices securely.
        </p>
    </div>`;

    // Attach listeners
    document.getElementById('google-signin-btn').addEventListener('click', _handleGoogleSignIn);
    document.getElementById('apple-signin-btn').addEventListener('click', _handleAppleSignIn);
}

async function _handleGoogleSignIn() {
    const btn = document.getElementById('google-signin-btn');
    const errEl = document.getElementById('signin-error');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Signing in…';
    errEl.textContent = '';

    try {
        const user = await signInWithGoogle();
        if (user) {
            // Popup flow — user is signed in, proceed
            await _onSignedIn(user);
        }
        // If null → redirect flow, page will reload and onAuthReady handles it
    } catch (err) {
        errEl.textContent = _friendlyError(err);
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Continue with Google';
    }
}

async function _handleAppleSignIn() {
    const btn = document.getElementById('apple-signin-btn');
    const errEl = document.getElementById('signin-error');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Signing in…';
    errEl.textContent = '';

    try {
        const user = await signInWithApple();
        if (user) {
            await _onSignedIn(user);
        }
    } catch (err) {
        errEl.textContent = _friendlyError(err);
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Continue with Apple';
    }
}

/**
 * Called after successful sign-in — check if user already has a household.
 */
async function _onSignedIn(user) {
    const profile = await getUserProfile(user.uid);

    // Update basic profile info
    await setUserProfile(user.uid, {
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        lastLogin: new Date().toISOString()
    });

    if (profile && profile.householdCode) {
        // User already linked to a household — load it
        const loaded = await store.loadHouseholdFromFirebase(profile.householdCode, profile.memberId);
        if (loaded) {
            window.dispatchEvent(new CustomEvent('household-changed'));
            return;
        }
    }

    // No household yet — show household setup
    window.dispatchEvent(new CustomEvent('household-changed'));
}

/* ═══════════════════════════════════════════════════════════
   STEP 2 — Create or Join Household
   ═══════════════════════════════════════════════════════════ */
function _renderHouseholdSetup(main, authUser) {
    const displayName = authUser.displayName || authUser.email || '';
    const photoURL = authUser.photoURL || '';

    main.innerHTML = `
    <div class="onboarding">
        <div class="onboarding-hero" style="padding-bottom:8px">
            ${photoURL ? `<img src="${photoURL}" style="width:56px;height:56px;border-radius:50%;margin-bottom:8px" alt="">` : '<div class="onboarding-logo">👋</div>'}
            <h1 class="onboarding-title" style="font-size:22px">Hi, ${displayName.split(' ')[0]}!</h1>
            <p class="onboarding-sub">Set up or join your family household</p>
        </div>

        <div class="onboarding-cards">
            <!-- Create household -->
            <div class="ios-group mb-2">
                <div class="ios-row" style="padding:20px 16px;cursor:pointer" id="show-create-btn">
                    <div class="ios-row-icon" style="background:rgba(143,217,142,.15);width:44px;height:44px;border-radius:12px;font-size:22px">🏡</div>
                    <div class="ios-row-body">
                        <div class="ios-row-title" style="font-weight:600">Create a Household</div>
                        <div class="ios-row-subtitle">Start fresh — invite your family after</div>
                    </div>
                    <span class="ios-chevron"></span>
                </div>
            </div>

            <!-- Join household -->
            <div class="ios-group">
                <div class="ios-row" style="padding:20px 16px;cursor:pointer" id="show-join-btn">
                    <div class="ios-row-icon" style="background:rgba(137,181,228,.15);width:44px;height:44px;border-radius:12px;font-size:22px">🔗</div>
                    <div class="ios-row-body">
                        <div class="ios-row-title" style="font-weight:600">Join a Household</div>
                        <div class="ios-row-subtitle">Enter the 6-letter code from your family</div>
                    </div>
                    <span class="ios-chevron"></span>
                </div>
            </div>
        </div>

        <!-- Create form -->
        <div id="create-form-area" class="hidden" style="margin-top:12px">
            <div class="ios-section">
                <div class="ios-section-title">Create Your Household</div>
                <div class="ios-group" style="padding:20px">
                    <form id="create-household-form">
                        <div class="form-group">
                            <label class="form-label" for="hh-name">Household Name</label>
                            <input type="text" id="hh-name" class="form-input" placeholder="e.g. The Smiths" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="creator-role">Your Role</label>
                            <select id="creator-role" class="form-select">
                                <option value="parent">👑 Parent</option>
                                <option value="child">👶 Child</option>
                            </select>
                        </div>
                        <div id="create-error" class="form-error" style="margin-bottom:12px"></div>
                        <button type="submit" class="btn btn-primary btn-full btn-disabled" id="create-submit-btn" disabled>Create Household</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Join form -->
        <div id="join-form-area" class="hidden" style="margin-top:12px">
            <div class="ios-section">
                <div class="ios-section-title">Join a Household</div>
                <div class="ios-group" style="padding:20px">
                    <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px;line-height:1.4">
                        Ask your family member for the <strong>6-letter code</strong> from their Family tab.
                    </p>
                    <form id="join-household-form">
                        <div class="form-group">
                            <label class="form-label" for="join-code">Household Code</label>
                            <input type="text" id="join-code" class="form-input" placeholder="e.g. A3BX9K" maxlength="6"
                                   style="text-transform:uppercase;letter-spacing:6px;text-align:center;font-size:22px;font-weight:700" required
                                   autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="join-role">Your Role</label>
                            <select id="join-role" class="form-select">
                                <option value="child">👶 Child</option>
                                <option value="parent">👑 Parent</option>
                            </select>
                        </div>
                        <div id="join-error" class="form-error" style="margin-bottom:12px"></div>
                        <button type="submit" class="btn btn-primary btn-full btn-disabled" id="join-submit-btn" disabled>Join Household</button>
                    </form>
                </div>
            </div>
        </div>

        <button id="signout-btn" class="btn btn-text" style="margin-top:24px;display:block;width:100%;text-align:center;color:var(--text-tertiary)">
            Sign out
        </button>
    </div>`;

    _attachHouseholdListeners(authUser);
}

function _attachHouseholdListeners(authUser) {
    /* Toggle forms */
    const showCreate = document.getElementById('show-create-btn');
    const showJoin   = document.getElementById('show-join-btn');
    const createArea = document.getElementById('create-form-area');
    const joinArea   = document.getElementById('join-form-area');

    if (showCreate && createArea) {
        showCreate.addEventListener('click', () => {
            createArea.classList.toggle('hidden');
            if (joinArea) joinArea.classList.add('hidden');
        });
    }
    if (showJoin && joinArea) {
        showJoin.addEventListener('click', () => {
            joinArea.classList.toggle('hidden');
            if (createArea) createArea.classList.add('hidden');
        });
    }

    /* Create form: enable button when household name is filled */
    const hhNameInput = document.getElementById('hh-name');
    const createBtn   = document.getElementById('create-submit-btn');
    if (hhNameInput && createBtn) {
        hhNameInput.addEventListener('input', () => {
            const ready = hhNameInput.value.trim().length > 0;
            createBtn.disabled = !ready;
            createBtn.classList.toggle('btn-disabled', !ready);
        });
    }

    /* Join form: enable button when code is 6 chars */
    const joinCodeInput = document.getElementById('join-code');
    const joinBtn       = document.getElementById('join-submit-btn');
    if (joinCodeInput && joinBtn) {
        joinCodeInput.addEventListener('input', () => {
            const ready = joinCodeInput.value.trim().length >= 6;
            joinBtn.disabled = !ready;
            joinBtn.classList.toggle('btn-disabled', !ready);
        });
    }

    /* Create household submit */
    const createForm = document.getElementById('create-household-form');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('hh-name').value.trim();
            const role = document.getElementById('creator-role').value;
            const errEl = document.getElementById('create-error');

            if (!name) { errEl.textContent = 'Please enter a name.'; return; }

            // Use display name from auth for the member name
            const memberName = authUser.displayName || authUser.email?.split('@')[0] || 'Member';

            const result = store.createHousehold(name, memberName, role);

            // Link this user's Firebase UID to the household
            await setUserProfile(authUser.uid, {
                householdCode: result.code,
                role: role,
                memberId: result.member.id
            });

            // If the creator is a parent and no PIN set yet, prompt for one
            if (role === 'parent' && !hasPinSet()) {
                await showSetPinModal();
            }

            uiLogger.success('Household created', result);
            window.dispatchEvent(new CustomEvent('household-changed'));
        });
    }

    /* Join household submit */
    const joinForm = document.getElementById('join-household-form');
    if (joinForm) {
        joinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('join-code').value.trim();
            const role = document.getElementById('join-role').value;
            const errEl = document.getElementById('join-error');
            const submitBtn = joinForm.querySelector('button[type="submit"]');

            if (!code) { errEl.textContent = 'Enter the household code.'; return; }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Joining…';
            errEl.textContent = '';

            try {
                const memberName = authUser.displayName || authUser.email?.split('@')[0] || 'Member';
                const result = await store.joinHousehold(code, memberName, role);

                if (!result.success) {
                    errEl.textContent = result.message;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Join Household';
                    return;
                }

                // Link this user's Firebase UID to the household
                await setUserProfile(authUser.uid, {
                    householdCode: code.toUpperCase(),
                    role: role,
                    memberId: result.member.id
                });

                uiLogger.success('Joined household', result);
                window.dispatchEvent(new CustomEvent('household-changed'));
            } catch (err) {
                errEl.textContent = 'Connection error. Please try again.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Join Household';
            }
        });
    }

    /* Sign out */
    document.getElementById('signout-btn')?.addEventListener('click', async () => {
        await signOut();
        window.dispatchEvent(new CustomEvent('household-changed'));
    });
}

/* ═══════════════════════════════════════════════════════════
   STEP 3 — Pick Member (household exists, no profile yet)
   Only used when signed-in user's profile lost their memberId
   ═══════════════════════════════════════════════════════════ */
function _renderPickMember(main) {
    const hh = store.getHousehold();
    const members = store.getMembers();

    main.innerHTML = `
    <div class="onboarding">
        <div class="onboarding-hero" style="padding-bottom:8px">
            <div class="onboarding-logo">🏠</div>
            <h1 class="onboarding-title" style="font-size:22px">Welcome to ${hh.name}</h1>
            <p class="onboarding-sub">Who are you?</p>
        </div>
        <div class="ios-section">
            <div class="ios-group" style="padding:20px;text-align:center">
                ${members.length > 0 ? `<div id="pick-member-list">` +
                    members.map(m => `
                        <button class="btn btn-secondary btn-full pick-member-btn mb-1" data-id="${m.id}" style="justify-content:flex-start;gap:12px">
                            <span style="font-size:20px">${m.role === 'parent' ? '👑' : '👶'}</span>
                            <span>${m.name}</span>
                        </button>
                    `).join('') +
                `</div>` : '<p style="color:var(--text-secondary)">No members yet.</p>'}
            </div>
        </div>
    </div>`;

    document.querySelectorAll('.pick-member-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            store.setCurrentUser(id);

            // Also save to Firebase user profile
            const authUser = getCurrentAuthUser();
            if (authUser) {
                await setUserProfile(authUser.uid, { memberId: id });
            }

            window.dispatchEvent(new CustomEvent('household-changed'));
        });
    });
}

/* ─── Helpers ──────────────────────────────────────────── */

function _friendlyError(err) {
    const code = err.code || '';
    if (code.includes('popup-closed'))       return 'Sign-in window was closed. Try again.';
    if (code.includes('popup-blocked'))       return 'Pop-up blocked. Allow pop-ups and try again.';
    if (code.includes('network-request'))     return 'Network error. Check your connection.';
    if (code.includes('cancelled'))           return 'Sign-in was cancelled.';
    if (code.includes('account-exists'))      return 'An account already exists with this email. Try a different sign-in method.';
    return 'Sign-in failed. Please try again.';
}
