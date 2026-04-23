/**
 * MEMBERS COMPONENT – iOS grouped-list style
 * Shows household info, invite code, current user badge, member list
 */

import { uiLogger } from '../utils/logger.js?v=7.0.0';
import store from '../store.js?v=7.0.0';
import { openAddMemberModal, openEditMemberModal } from './modals.js?v=7.0.0';
import { getStreakDisplay } from '../utils/streaks.js?v=7.0.0';
import { escapeHtml, requirePin, isParent } from '../utils/safety.js?v=7.0.0';
import { isNotifEnabled, notificationsSupported, toggleNotifications } from '../utils/notifications.js?v=7.0.0';

const COLORS = ['#89B5E4','#8FD98E','#FFB366','#C9A5D7','#FFB3D9','#80D6D6','#FFD966','#FF9999'];

export function renderMembers() {
    uiLogger.lifecycle('Rendering Members view');
    const main = document.getElementById('main-content');
    if (!main) return;

    const members = store.getMembers();
    const hh = store.getHousehold();
    const currentId = store.getCurrentUserId();
    let h = '';

    /* ── Household card with invite code ── */
    if (hh) {
        h += `<div class="ios-section">
            <div class="ios-section-title">Household</div>
            <div class="ios-group">
                <div class="ios-row">
                    <div class="ios-row-icon" style="background:rgba(143,217,142,.15);font-size:20px">🏠</div>
                    <div class="ios-row-body">
                        <div class="ios-row-title" style="font-weight:600">${escapeHtml(hh.name)}</div>
                        <div class="ios-row-subtitle">${members.length} member${members.length !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                <div class="ios-row" style="cursor:pointer" id="copy-code-row">
                    <div class="ios-row-icon" style="background:rgba(137,181,228,.15);font-size:20px">🔗</div>
                    <div class="ios-row-body">
                        <div class="ios-row-subtitle">INVITE CODE</div>
                        <div class="ios-row-title" style="font-size:22px;font-weight:700;letter-spacing:4px;color:var(--ios-blue)">${hh.code}</div>
                    </div>
                    <div class="ios-row-accessory">
                        <span id="copy-label" class="badge badge-blue">Tap to copy</span>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /* ── Current user ── */
    if (currentId) {
        const me = store.getCurrentUser();
        if (me) {
            const myColor = COLORS[(members.findIndex(m => m.id === me.id)) % COLORS.length] || COLORS[0];
            h += `<div class="ios-section">
                <div class="ios-section-title">You</div>
                <div class="ios-group">
                    <div class="ios-row">
                        <div class="avatar" style="background:${myColor}">${me.name.charAt(0).toUpperCase()}</div>
                        <div class="ios-row-body">
                            <div class="ios-row-title" style="font-weight:600">${escapeHtml(me.name)}</div>
                            <div class="ios-row-subtitle">${me.role === 'parent' ? '👑 Parent' : '👶 Child'} · ${me.points} ⭐</div>
                        </div>
                        <button class="btn btn-secondary btn-small" id="switch-user-btn">Switch</button>
                    </div>
                </div>
            </div>`;
        }
    }

    if (notificationsSupported()) {
        h += `<div class="ios-section">
            <div class="ios-section-title">Notifications</div>
            <div class="ios-group">
                <div class="notif-toggle-row">
                    <div class="notif-toggle-label">
                        <div class="notif-toggle-title">Due date reminders</div>
                        <div class="notif-toggle-subtitle">Get alerts for due and overdue chores</div>
                    </div>
                    <label class="ios-switch">
                        <input type="checkbox" id="notif-toggle" ${isNotifEnabled() ? 'checked' : ''}>
                        <span class="ios-switch-track"></span>
                    </label>
                </div>
            </div>
        </div>`;
    }

    /* ── Members list ── */
    if (members.length === 0) {
        h += `<div class="empty-state">
            <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
            <h3 class="empty-state-title">No Family Members Yet</h3>
            <p class="empty-state-text">Tap + Add to add the first member, or share the invite code above!</p>
        </div>`;
    } else {
        h += `<div class="ios-section">
            <div class="ios-section-title">Family Members (${members.length})</div>
            <div class="ios-group">`;
        members.forEach((m, i) => {
            const bg = COLORS[i % COLORS.length];
            const initials = m.name.charAt(0).toUpperCase();
            const role = m.role === 'parent' ? '👑 Parent' : '👶 Child';
            const isMe = m.id === currentId;
            const streak = m.streakData?.current || 0;
            const sDisp = getStreakDisplay(streak);
            h += `<div class="ios-row" style="cursor:pointer" data-member-id="${m.id}">
                <div class="avatar" style="background:${bg}">${initials}</div>
                <div class="ios-row-body">
                    <div class="ios-row-title">${escapeHtml(m.name)}${isMe ? ' <span style="color:var(--ios-blue);font-size:13px">(you)</span>' : ''}</div>
                    <div class="ios-row-subtitle">${role} · ${m.points} ⭐${streak > 0 ? ` · <span style="color:${sDisp.color}">${sDisp.emoji}${streak} day streak</span>` : ''}</div>
                </div>
                <span class="ios-chevron"></span>
            </div>`;
        });
        h += `</div></div>`;
    }

    /* ── Share prompt ── */
    if (hh) {
        h += `<div class="ios-section">
            <div class="ios-group" style="padding:20px;text-align:center">
                <p style="font-size:15px;color:var(--text-secondary);margin-bottom:12px">📲 Share this code with your family so they can join:</p>
                <div style="font-size:28px;font-weight:700;letter-spacing:6px;color:var(--ios-purple);margin-bottom:12px">${hh.code}</div>
                <p style="font-size:13px;color:var(--text-tertiary)">They'll need to open this app and choose "Join a Household"</p>
            </div>
        </div>`;
    }

    main.innerHTML = h;

    /* ── Listeners ── */
    main.querySelectorAll('[data-member-id]').forEach(row => {
        row.addEventListener('click', () => {
            openEditMemberModal(parseInt(row.dataset.memberId));
        });
    });

    const copyRow = document.getElementById('copy-code-row');
    if (copyRow && hh) {
        copyRow.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(hh.code);
                const lbl = document.getElementById('copy-label');
                if (lbl) { lbl.textContent = 'Copied! ✓'; setTimeout(() => lbl.textContent = 'Tap to copy', 2000); }
            } catch {
                // Fallback for non-HTTPS
                prompt('Copy this code:', hh.code);
            }
        });
    }

    const switchBtn = document.getElementById('switch-user-btn');
    if (switchBtn) {
        switchBtn.addEventListener('click', async () => {
            if (!confirm('Switch to a different family member on this device?')) return;
            const ok = await requirePin('Switching profile');
            if (!ok) return;
            store.leaveHousehold(); // clears profile
            window.dispatchEvent(new CustomEvent('household-changed'));
        });
    }

    const notifToggle = document.getElementById('notif-toggle');
    if (notifToggle) {
        notifToggle.addEventListener('change', async () => {
            const enabled = await toggleNotifications();
            notifToggle.checked = enabled;
            if (!enabled && Notification.permission === 'denied') {
                alert('Notifications are blocked in your browser settings. Please enable them there to use reminders.');
            }
        });
    }

    uiLogger.success('Members rendered');
}
