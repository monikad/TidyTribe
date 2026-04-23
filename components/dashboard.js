/**
 * DASHBOARD — "My Day" Personal View
 * ────────────────────────────────────
 * Shows: Greeting + streak · Today's tasks · Weekly pulse ·
 *        Family leaderboard with streaks · Activity feed
 */

import { uiLogger } from '../utils/logger.js?v=7.0.0';
import store from '../store.js?v=7.0.0';
import { getStreakDisplay, generateWeeklyReport } from '../utils/streaks.js?v=7.0.0';
import { showConfetti, showPointsFloat } from '../utils/celebrations.js?v=7.0.0';
import { escapeHtml } from '../utils/safety.js?v=7.0.0';
import { getNotificationPromptHTML, attachNotifPromptListener } from '../utils/notifications.js?v=7.0.0';

/* ─── Helpers ─── */

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() === today.getTime()) return 'Today';
    if (date < today) return 'Overdue';
    const days = Math.ceil((date - today) / 86400000);
    return days === 1 ? 'Tomorrow' : `In ${days} days`;
}

function getTimeAgo(date) {
    const ms = Date.now() - date;
    const mins = Math.floor(ms / 60000);
    const hrs  = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs  < 24) return `${hrs}h ago`;
    return `${days}d ago`;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

/* ─── Render ─── */

export function renderDashboard() {
    uiLogger.lifecycle('Rendering Dashboard (My Day)');
    const main = document.getElementById('main-content');
    if (!main) return;

    const members     = store.getMembers();
    const chores      = store.getChores();
    const log         = store.state.activityLog || [];
    const currentUser = store.getCurrentUser();
    const report      = generateWeeklyReport(members, chores, log);

    let h = '';

    /* ═══════════════════════════════════════════
       1.  GREETING + STREAK CARD
       ═══════════════════════════════════════════ */
    if (currentUser) {
        const streak  = currentUser.streakData || { current: 0, best: 0 };
        const display = getStreakDisplay(streak.current);
        const greeting = getGreeting();

        h += `<div class="streak-card">
            <div class="streak-card-content">
                <div class="streak-greeting">${greeting}, ${escapeHtml(currentUser.name.split(' ')[0])}!</div>
                <div class="streak-count">
                    <span class="streak-flame">${display.emoji || '⭐'}</span>
                    <span class="streak-number">${streak.current}</span>
                    <span class="streak-label">day streak</span>
                </div>
                ${streak.best > streak.current ? `<div class="streak-best">Personal best: ${streak.best} days</div>` : ''}
            </div>
            <div class="streak-ring" style="--streak-color:${display.color}">
                <span style="font-size:32px">${display.emoji || '⭐'}</span>
            </div>
        </div>`;
    }

    /* ── Notification prompt banner ── */
    h += getNotificationPromptHTML();

    /* ── Empty state (no members yet) ── */
    if (members.length === 0) {
        h += `<div class="empty-state">
            <div class="empty-state-icon">🚀</div>
            <h3 class="empty-state-title">Welcome to TidyTribe!</h3>
            <p class="empty-state-text">Add family members and create chores to get started.</p>
            <button class="btn btn-primary mt-2" id="get-started-btn">Get Started</button>
        </div>`;
        main.innerHTML = h;
        document.getElementById('get-started-btn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'members' }));
        });
        return;
    }

    /* ═══════════════════════════════════════════
       2.  YOUR DAY — Today's Tasks (quick-complete)
       ═══════════════════════════════════════════ */
    const todayStr = new Date().toISOString().split('T')[0];
    const myPending = currentUser
        ? chores.filter(c => c.assignedTo === currentUser.id && c.status === 'Pending')
        : chores.filter(c => c.status === 'Pending');

    const todayTasks   = myPending.filter(c => c.dueDate <= todayStr);
    const upcomingNext = myPending.filter(c => c.dueDate > todayStr).slice(0, 3);

    if (todayTasks.length > 0 || upcomingNext.length > 0) {
        h += `<div class="ios-section">
            <div class="ios-section-title">${currentUser ? '📋 Your Day' : '📋 Today\'s Tasks'}</div>
            <div class="ios-group">`;

        todayTasks.forEach(chore => {
            const overdue = chore.dueDate < todayStr;
            h += `<div class="ios-row today-task">
                <input type="checkbox" class="chore-check dash-complete" data-id="${chore.id}" data-pts="${chore.points}">
                <div class="ios-row-body">
                    <div class="ios-row-title">${escapeHtml(chore.name)}</div>
                    <div class="ios-row-subtitle">${overdue ? '<span style="color:var(--ios-red)">Overdue</span>' : 'Due today'}</div>
                </div>
                <div class="ios-row-accessory">
                    <span class="badge badge-yellow">${chore.points} ⭐</span>
                </div>
            </div>`;
        });

        upcomingNext.forEach(chore => {
            h += `<div class="ios-row" style="opacity:.65">
                <div class="ios-row-icon" style="background:rgba(137,181,228,.1);font-size:14px">📅</div>
                <div class="ios-row-body">
                    <div class="ios-row-title">${escapeHtml(chore.name)}</div>
                    <div class="ios-row-subtitle">${formatDate(chore.dueDate)}</div>
                </div>
                <div class="ios-row-accessory">
                    <span class="badge badge-yellow">${chore.points} ⭐</span>
                </div>
            </div>`;
        });

        h += `</div></div>`;
    } else if (currentUser) {
        h += `<div class="ios-section">
            <div class="ios-section-title">📋 Your Day</div>
            <div class="ios-group" style="padding:24px;text-align:center">
                <div style="font-size:36px;margin-bottom:8px">🎉</div>
                <div style="font-size:15px;font-weight:600;color:var(--text-primary)">All caught up!</div>
                <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">No chores due today. Enjoy your free time!</div>
            </div>
        </div>`;
    }

    /* ═══════════════════════════════════════════
       3.  WEEKLY PULSE — Compact Report
       ═══════════════════════════════════════════ */
    h += `<div class="ios-section">
        <div class="ios-section-title">📊 This Week</div>
        <div class="ios-group">
            <div class="weekly-pulse">
                <div class="pulse-stat">
                    <div class="pulse-value" style="color:var(--ios-green)">${report.totalDone}</div>
                    <div class="pulse-label">Done</div>
                </div>
                <div class="pulse-stat">
                    <div class="pulse-value" style="color:var(--ios-orange)">${report.pendingCount}</div>
                    <div class="pulse-label">Pending</div>
                </div>
                <div class="pulse-stat">
                    <div class="pulse-value" style="color:var(--ios-blue)">${report.completionRate}%</div>
                    <div class="pulse-label">Rate</div>
                </div>
                <div class="pulse-stat">
                    <div class="pulse-value" style="color:var(--ios-red)">${report.bestStreaker?.streak || 0} 🔥</div>
                    <div class="pulse-label">Top Streak</div>
                </div>
            </div>
            ${report.topContributor && report.topContributor.completedThisWeek > 0 ? `
            <div style="padding:12px 16px;border-top:0.5px solid var(--separator);font-size:13px;color:var(--text-secondary)">
                ⭐ <strong>${escapeHtml(report.topContributor.name)}</strong> leads with ${report.topContributor.completedThisWeek} chore${report.topContributor.completedThisWeek !== 1 ? 's' : ''} this week
            </div>` : ''}
        </div>
    </div>`;

    /* ═══════════════════════════════════════════
       4.  FAMILY LEADERBOARD (with streak badges)
       ═══════════════════════════════════════════ */
    if (members.length > 0) {
        const sorted = [...members].sort((a, b) => b.points - a.points);
        h += `<div class="ios-section">
            <div class="ios-section-title">🏆 Family</div>
            <div class="ios-group">`;
        sorted.slice(0, 6).forEach((m, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            const streak = m.streakData?.current || 0;
            const sDisp = getStreakDisplay(streak);
            h += `<div class="leaderboard-item">
                <div class="leaderboard-rank">${medal}</div>
                <div class="leaderboard-name">${escapeHtml(m.name)}</div>
                ${streak > 0 ? `<span class="streak-badge" style="color:${sDisp.color}">${sDisp.emoji}${streak}</span>` : ''}
                <div class="leaderboard-points">${m.points} ⭐</div>
            </div>`;
        });
        h += `</div></div>`;
    }

    /* ═══════════════════════════════════════════
       5.  RECENT ACTIVITY
       ═══════════════════════════════════════════ */
    if (log.length) {
        h += `<div class="ios-section">
            <div class="ios-section-title">📝 Recent</div>
            <div class="ios-group">`;
        log.slice(0, 6).forEach(entry => {
            h += `<div class="ios-row">
                <div class="ios-row-icon" style="background:rgba(201,165,215,.15)">📌</div>
                <div class="ios-row-body">
                    <div class="ios-row-title" style="font-size:15px">${escapeHtml(entry.activity)}</div>
                    <div class="ios-row-subtitle">${getTimeAgo(new Date(entry.timestamp))}</div>
                </div>
            </div>`;
        });
        h += `</div></div>`;
    }

    /* ── Render & wire listeners ── */
    main.innerHTML = h;

    attachNotifPromptListener();

    // Quick-complete chores from dashboard
    main.querySelectorAll('.dash-complete').forEach(cb => {
        cb.addEventListener('change', e => {
            e.stopPropagation();
            const id  = parseInt(e.target.dataset.id);
            const pts = parseInt(e.target.dataset.pts) || 1;
            if (e.target.checked) {
                store.completeChore(id);
                showConfetti();
                showPointsFloat(e.target.closest('.ios-row'), pts);
                const row = e.target.closest('.ios-row');
                if (row) row.classList.add('celebration');
            }
        });
    });

    uiLogger.success('Dashboard rendered');
}
