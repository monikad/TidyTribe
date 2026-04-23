/**
 * APP – iOS Tab Bar Controller
 * Manages navigation, tab state, and view rendering
 * Gates on auth + household → shows onboarding when needed
 */

import store from './store.js?v=7.0.0';
import sync  from './utils/sync.js?v=7.0.0';
import { onAuthReady, getCurrentAuthUser } from './utils/auth.js?v=7.0.0';
import { requirePin } from './utils/safety.js?v=7.0.0';
import { startNotificationScheduler } from './utils/notifications.js?v=7.0.0';
import { renderOnboarding }  from './components/onboarding.js?v=7.0.0';
import { renderDashboard }   from './components/dashboard.js?v=7.0.0';
import { renderChores }      from './components/chores.js?v=7.0.0';
import { renderMembers }     from './components/members.js?v=7.0.0';
import { renderRewards }     from './components/rewards.js?v=7.0.0';
import { renderWishLists, setupWishListsListeners }   from './components/wishlists.js?v=7.0.0';
import { openAddChoreModal }     from './components/modals.js?v=7.0.0';
import { openAddMemberModal }    from './components/modals.js?v=7.0.0';
import { openAddRewardModal }    from './components/modals.js?v=7.0.0';

/* ─── View configuration ─── */
const VIEW_CONFIG = {
    dashboard:  { title: 'Home',       action: null },
    chores:     { title: 'Chores',     action: { label: '+ Add',  handler: () => openAddChoreModal() } },
    members:    { title: 'Family',     action: { label: '+ Add',  handler: async () => { const ok = await requirePin('Adding a family member'); if (ok) openAddMemberModal(); } } },
    rewards:    { title: 'Rewards',    action: { label: '+ Add',  handler: async () => { const ok = await requirePin('Adding a reward'); if (ok) openAddRewardModal(); } } },
};

let currentView = 'dashboard';
let onboardingMode = false;

/* ─── DOM refs ─── */
const navTitle  = document.getElementById('nav-title');
const navAction = document.getElementById('nav-action');
const mainEl    = document.getElementById('main-content');
const tabBar    = document.getElementById('tab-bar');
const tabs      = document.querySelectorAll('.tab-item');

/* ─── Check if we need onboarding ─── */
function needsOnboarding() {
    // Must be signed in via Firebase Auth AND have a household set up
    const authUser = getCurrentAuthUser();
    if (!authUser) return true;
    return !store.hasHousehold() || !store.getCurrentUserId();
}

function showOnboarding() {
    onboardingMode = true;
    navTitle.textContent = 'Welcome';
    navAction.classList.add('hidden');
    tabBar.classList.add('hidden');
    mainEl.style.paddingBottom = '16px'; // no tab bar padding
    renderOnboarding();
}

function showApp() {
    onboardingMode = false;
    tabBar.classList.remove('hidden');
    mainEl.style.paddingBottom = ''; // restore default
    navigate(currentView);
    startNotificationScheduler();
}

function boot() {
    if (needsOnboarding()) {
        showOnboarding();
    } else {
        showApp();
    }
}

/* ─── Navigate ─── */
function navigate(view) {
    if (onboardingMode) return;
    if (!VIEW_CONFIG[view]) return;
    currentView = view;

    // Update tab bar highlights
    tabs.forEach(t => t.classList.toggle('active', t.dataset.view === view));

    // Update nav bar – show household name on Home tab
    const cfg = VIEW_CONFIG[view];
    if (view === 'dashboard' && store.hasHousehold()) {
        navTitle.textContent = store.getHousehold().name;
    } else {
        navTitle.textContent = cfg.title;
    }

    if (cfg.action) {
        navAction.textContent = cfg.action.label;
        navAction.classList.remove('hidden');
        navAction.onclick = cfg.action.handler;
    } else {
        navAction.classList.add('hidden');
        navAction.onclick = null;
    }

    renderCurrentView();
}

/* ─── Render ─── */
function renderCurrentView() {
    if (onboardingMode) return;
    mainEl.scrollTop = 0;

    switch (currentView) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'chores':
            renderChores();
            break;
        case 'members':
            renderMembers();
            break;
        case 'rewards':
            renderRewards();
            break;
        default:
            mainEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚧</div><h3 class="empty-state-title">Coming Soon</h3></div>';
    }
}

/* ─── Tab bar clicks ─── */
tabs.forEach(tab => {
    tab.addEventListener('click', () => navigate(tab.dataset.view));
});

/* ─── Custom navigate event (used by components) ─── */
window.addEventListener('navigate', (e) => {
    navigate(e.detail);
});

/* ─── Household changed (from onboarding) ─── */
window.addEventListener('household-changed', () => {
    boot();
});

/* ─── Store change subscription ─── */
store.subscribe(() => {
    if (!onboardingMode) {
        renderCurrentView();
    }
});

/* ─── Boot (waits for Firebase Auth) ─── */
onAuthReady((user) => {
    console.log('[App] Auth ready — user:', user?.displayName || 'none');
    boot();
});

/* ─── Sync status indicator ─── */
const syncDot = document.getElementById('sync-status');
if (syncDot) {
    sync.onStatusChange = (status) => {
        syncDot.className = 'sync-dot ' + status;
        syncDot.title =
            status === 'synced'  ? 'All devices in sync' :
            status === 'syncing' ? 'Syncing…' :
            status === 'offline' ? 'Offline – changes saved locally' :
            status === 'error'   ? 'Sync error' : '';
    };
}

console.log('[App] TidyTribe loaded ✅');
