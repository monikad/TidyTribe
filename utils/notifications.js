/**
 * NOTIFICATIONS UTILITY – Browser notification support for chore due dates
 * Handles permission requests, scheduling, and preference storage.
 */

import store from '../store.js?v=7.0.0';

const PREF_KEY = 'tidytribe-notif-enabled';
const LAST_CHECK_KEY = 'tidytribe-notif-last-check';
const CHECK_INTERVAL = 60 * 60 * 1000; // re-check every hour

/* ─── Permission & Preference helpers ─── */

/** Is the Notification API available in this browser? */
export function notificationsSupported() {
    return 'Notification' in window;
}

/** Has the user granted notification permission? */
export function hasNotificationPermission() {
    return notificationsSupported() && Notification.permission === 'granted';
}

/** Has the user enabled notifications in our app? */
export function isNotifEnabled() {
    return localStorage.getItem(PREF_KEY) === 'true';
}

/** Toggle the notification preference on/off. Returns the new state. */
export async function toggleNotifications() {
    if (isNotifEnabled()) {
        // Turn off
        localStorage.setItem(PREF_KEY, 'false');
        return false;
    }

    // Turn on → request permission first
    if (!notificationsSupported()) return false;

    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
        localStorage.setItem(PREF_KEY, 'true');
        sendNotification('🔔 Notifications On', 'You\'ll get reminders for chore due dates!');
        return true;
    }
    return false;
}

/** Explicitly request permission (returns 'granted' | 'denied' | 'default') */
export async function requestNotificationPermission() {
    if (!notificationsSupported()) return 'denied';
    return Notification.requestPermission();
}

/* ─── Send a notification ─── */

export function sendNotification(title, body, tag) {
    if (!hasNotificationPermission()) return;

    // Try Service Worker notification first (persists even when tab is hidden)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
                body,
                icon: '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/icon-144x144.png',
                tag: tag || 'tidytribe-' + Date.now(),
                vibrate: [100, 50, 100],
                requireInteraction: false,
            });
        }).catch(() => {
            // Fallback to basic notification
            new Notification(title, { body, icon: '/assets/icons/icon-192x192.png', tag });
        });
    } else {
        new Notification(title, { body, icon: '/assets/icons/icon-192x192.png', tag });
    }
}

/* ─── Chore due-date checker ─── */

/** Check for chores due today / overdue and send notifications. */
export function checkDueChores() {
    if (!isNotifEnabled() || !hasNotificationPermission()) return;

    // Throttle: don't spam checks
    const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0');
    if (Date.now() - lastCheck < CHECK_INTERVAL) return;
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

    const chores = store.getChores();
    if (!chores.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const overdue = [];
    const dueToday = [];
    const dueTomorrow = [];

    chores.forEach(chore => {
        if (chore.status === 'Completed') return;
        if (!chore.dueDate) return;

        const due = new Date(chore.dueDate);
        due.setHours(0, 0, 0, 0);

        if (due < today) {
            overdue.push(chore);
        } else if (due.getTime() === today.getTime()) {
            dueToday.push(chore);
        } else if (due.getTime() === tomorrow.getTime()) {
            dueTomorrow.push(chore);
        }
    });

    // Send grouped notifications
    if (overdue.length > 0) {
        const names = overdue.slice(0, 3).map(c => c.name).join(', ');
        const extra = overdue.length > 3 ? ` +${overdue.length - 3} more` : '';
        sendNotification(
            `⚠️ ${overdue.length} Overdue Chore${overdue.length > 1 ? 's' : ''}`,
            `${names}${extra}`,
            'tidytribe-overdue'
        );
    }

    if (dueToday.length > 0) {
        const names = dueToday.slice(0, 3).map(c => c.name).join(', ');
        const extra = dueToday.length > 3 ? ` +${dueToday.length - 3} more` : '';
        sendNotification(
            `📋 ${dueToday.length} Chore${dueToday.length > 1 ? 's' : ''} Due Today`,
            `${names}${extra}`,
            'tidytribe-due-today'
        );
    }

    if (dueTomorrow.length > 0) {
        const names = dueTomorrow.slice(0, 3).map(c => c.name).join(', ');
        const extra = dueTomorrow.length > 3 ? ` +${dueTomorrow.length - 3} more` : '';
        sendNotification(
            `🔔 ${dueTomorrow.length} Chore${dueTomorrow.length > 1 ? 's' : ''} Due Tomorrow`,
            `${names}${extra}`,
            'tidytribe-due-tomorrow'
        );
    }
}

/** Start periodic due-date check (call once on app boot) */
export function startNotificationScheduler() {
    // Check immediately on boot
    checkDueChores();

    // Re-check periodically
    setInterval(checkDueChores, CHECK_INTERVAL);

    // Also check when the app becomes visible again (e.g. phone unlocked)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkDueChores();
        }
    });
}

/* ─── Notification prompt banner HTML (for dashboard) ─── */

/** Returns HTML for the "Enable Notifications" prompt if not yet set up */
export function getNotificationPromptHTML() {
    // Don't show if already enabled, not supported, or previously dismissed
    if (!notificationsSupported()) return '';
    if (Notification.permission === 'denied') return '';
    if (isNotifEnabled()) return '';

    return `<div class="notif-banner" id="notif-prompt">
        <div class="notif-banner-icon">🔔</div>
        <div class="notif-banner-body">
            <div class="notif-banner-title">Enable Notifications</div>
            <div class="notif-banner-text">Get reminders when chores are due or overdue</div>
        </div>
        <button class="notif-banner-action" id="notif-enable-btn">Enable</button>
    </div>`;
}

/** Attach listener for the enable button (call after inserting prompt HTML) */
export function attachNotifPromptListener() {
    const btn = document.getElementById('notif-enable-btn');
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const enabled = await toggleNotifications();
        const banner = document.getElementById('notif-prompt');
        if (banner) {
            if (enabled) {
                banner.innerHTML = `
                    <div class="notif-banner-icon">✅</div>
                    <div class="notif-banner-body">
                        <div class="notif-banner-title">Notifications Enabled!</div>
                        <div class="notif-banner-text">You'll get reminders for due chores</div>
                    </div>`;
                setTimeout(() => { banner.style.display = 'none'; }, 2500);
            } else {
                banner.innerHTML = `
                    <div class="notif-banner-icon">😔</div>
                    <div class="notif-banner-body">
                        <div class="notif-banner-title">Permission Denied</div>
                        <div class="notif-banner-text">You can enable notifications in your browser settings</div>
                    </div>`;
            }
        }
    });
}
