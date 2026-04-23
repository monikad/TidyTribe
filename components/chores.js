/**
 * CHORES COMPONENT – iOS grouped-list style + Calendar toggle
 */

import { uiLogger } from '../utils/logger.js?v=7.0.0';
import store from '../store.js?v=7.0.0';
import { openAddChoreModal, openEditChoreModal } from './modals.js?v=7.0.0';
import { showConfetti, showPointsFloat } from '../utils/celebrations.js?v=7.0.0';
import { escapeHtml } from '../utils/safety.js?v=7.0.0';
import { renderCalendar, resetCalendar } from './calendar.js?v=7.0.0';

let viewMode = 'list'; // 'list' or 'calendar'

function formatDate(dateString) {
    const d = new Date(dateString);
    const today = new Date(); today.setHours(0,0,0,0);
    const tom = new Date(today); tom.setDate(tom.getDate()+1);
    d.setHours(0,0,0,0);
    if (d.getTime() === today.getTime()) return 'Today';
    if (d.getTime() === tom.getTime()) return 'Tomorrow';
    if (d < today) return 'Overdue';
    return d.toLocaleDateString();
}

export function renderChores() {
    uiLogger.lifecycle('Rendering Chores view');
    const main = document.getElementById('main-content');
    if (!main) return;

    const chores = store.getChores();

    /* ── View toggle (list / calendar) ── */
    let h = `<div class="view-toggle">
        <button class="view-toggle-btn ${viewMode === 'list' ? 'active' : ''}" data-mode="list">📋 List</button>
        <button class="view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}" data-mode="calendar">📅 Calendar</button>
    </div>`;

    if (viewMode === 'calendar') {
        h += '<div id="calendar-container"></div>';
        main.innerHTML = h;

        // Attach toggle listeners
        attachToggleListeners(main);

        // Render calendar into its container
        const calContainer = main.querySelector('#calendar-container');
        if (calContainer) renderCalendar(calContainer);
        uiLogger.success('Chores calendar rendered');
        return;
    }

    /* ── List view (original) ── */
    if (chores.length === 0) {
        h += `<div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3 class="empty-state-title">No Chores Yet</h3>
            <p class="empty-state-text">Tap + Add to create your first chore.</p>
        </div>`;
    } else {
        const pending   = chores.filter(c => c.status === 'Pending');
        const completed = chores.filter(c => c.status === 'Completed');

        /* ── Pending ── */
        if (pending.length) {
            h += `<div class="ios-section">
                <div class="ios-section-title">⏳ Pending (${pending.length})</div>
                <div class="ios-group">`;
            pending.forEach(chore => {
                const who = chore.assignedTo ? (store.getMemberById(chore.assignedTo)?.name || '—') : 'Unassigned';
                const due = formatDate(chore.dueDate);
                const overdue = new Date(chore.dueDate) < new Date();
                h += `<div class="ios-row" style="cursor:pointer" data-edit-id="${chore.id}">
                    <input type="checkbox" class="chore-check" data-id="${chore.id}">
                    <div class="ios-row-body">
                        <div class="ios-row-title">${escapeHtml(chore.name)}</div>
                        <div class="ios-row-subtitle">${escapeHtml(who)} · <span style="color:${overdue ? 'var(--ios-red)' : 'var(--ios-blue)'}">${due}</span></div>
                    </div>
                    <div class="ios-row-accessory">
                        <span class="badge badge-yellow">${chore.points} ⭐</span>
                        <span class="ios-chevron"></span>
                    </div>
                </div>`;
            });
            h += `</div></div>`;
        }

        /* ── Completed ── */
        if (completed.length) {
            h += `<div class="ios-section">
                <div class="ios-section-title">✅ Completed (${completed.length})</div>
                <div class="ios-group" style="opacity:.7">`;
            completed.forEach(chore => {
                const who = chore.assignedTo ? (store.getMemberById(chore.assignedTo)?.name || '—') : '—';
                h += `<div class="ios-row" data-edit-id="${chore.id}">
                    <input type="checkbox" class="chore-check" data-id="${chore.id}" checked>
                    <div class="ios-row-body">
                        <div class="ios-row-title" style="text-decoration:line-through;color:var(--text-secondary)">${escapeHtml(chore.name)}</div>
                        <div class="ios-row-subtitle">${escapeHtml(who)} · ${chore.points} ⭐</div>
                    </div>
                    <span class="ios-chevron"></span>
                </div>`;
            });
            h += `</div></div>`;
        }
    }

    main.innerHTML = h;

    /* ── Toggle listeners ── */
    attachToggleListeners(main);

    /* ── Listeners ── */
    main.querySelectorAll('.chore-check').forEach(cb => {
        cb.addEventListener('change', e => {
            e.stopPropagation();
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                store.completeChore(id);
                showConfetti();
                const row = e.target.closest('.ios-row');
                if (row) {
                    showPointsFloat(row, parseInt(row.querySelector('.badge')?.textContent) || 1);
                    row.classList.add('celebration');
                }
            } else {
                store.uncompleteChore(id);
            }
        });
    });

    main.querySelectorAll('[data-edit-id]').forEach(row => {
        row.addEventListener('click', e => {
            if (e.target.classList.contains('chore-check')) return;
            openEditChoreModal(parseInt(row.dataset.editId));
        });
    });

    uiLogger.success('Chores rendered');
}

/** Attach list/calendar toggle button listeners */
function attachToggleListeners(container) {
    container.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode === viewMode) return;
            viewMode = mode;
            if (mode === 'calendar') resetCalendar();
            renderChores();
        });
    });
}
