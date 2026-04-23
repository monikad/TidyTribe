/**
 * CALENDAR COMPONENT – Monthly chore calendar view
 * iOS-style calendar grid with chore dots and day detail panel
 */

import store from '../store.js?v=7.0.0';
import { escapeHtml } from '../utils/safety.js?v=7.0.0';
import { openEditChoreModal } from './modals.js?v=7.0.0';
import { showConfetti, showPointsFloat } from '../utils/celebrations.js?v=7.0.0';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

let currentMonth = new Date().getMonth();
let currentYear  = new Date().getFullYear();
let selectedDate = null; // YYYY-MM-DD or null

function toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function todayKey() {
    return toDateKey(new Date());
}

/** Group chores by their dueDate (YYYY-MM-DD key) */
function choresByDate() {
    const map = {};
    store.getChores().forEach(chore => {
        if (!chore.dueDate) return;
        const key = chore.dueDate.slice(0, 10); // handle ISO strings
        if (!map[key]) map[key] = [];
        map[key].push(chore);
    });
    return map;
}

/** Build the calendar grid HTML */
function buildCalendarGrid(map) {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = todayKey();

    let html = '';

    // Weekday headers
    html += '<div class="cal-weekdays">';
    WEEKDAYS.forEach(d => { html += `<div class="cal-weekday">${d}</div>`; });
    html += '</div>';

    // Day cells
    html += '<div class="cal-grid">';

    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-cell cal-cell-empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const chores = map[key] || [];
        const isToday = key === today;
        const isSelected = key === selectedDate;
        const hasPending = chores.some(c => c.status === 'Pending');
        const hasOverdue = chores.some(c => c.status === 'Pending' && new Date(c.dueDate) < new Date());
        const allDone = chores.length > 0 && chores.every(c => c.status === 'Completed');

        let classes = 'cal-cell';
        if (isToday)    classes += ' cal-today';
        if (isSelected) classes += ' cal-selected';

        html += `<div class="${classes}" data-date="${key}">
            <span class="cal-day-num">${day}</span>`;

        if (chores.length > 0) {
            html += '<div class="cal-dots">';
            if (hasOverdue)       html += '<span class="cal-dot cal-dot-red"></span>';
            else if (hasPending)  html += '<span class="cal-dot cal-dot-blue"></span>';
            if (allDone)          html += '<span class="cal-dot cal-dot-green"></span>';
            html += '</div>';
        }

        html += '</div>';
    }

    // Trailing blanks to complete the last row
    const totalCells = firstDay + daysInMonth;
    const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < trailing; i++) {
        html += '<div class="cal-cell cal-cell-empty"></div>';
    }

    html += '</div>';
    return html;
}

/** Build the detail panel for the selected date */
function buildDayDetail(map) {
    if (!selectedDate) return '';

    const chores = map[selectedDate] || [];
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const label = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    let html = `<div class="ios-section" style="margin-top:16px">
        <div class="ios-section-title">📋 ${escapeHtml(label)}</div>`;

    if (chores.length === 0) {
        html += `<div class="ios-group">
            <div class="ios-row" style="justify-content:center;color:var(--text-secondary)">
                No chores scheduled
            </div>
        </div>`;
    } else {
        html += '<div class="ios-group">';
        chores.forEach(chore => {
            const who = chore.assignedTo
                ? (store.getMemberById(chore.assignedTo)?.name || '—')
                : 'Unassigned';
            const done = chore.status === 'Completed';
            html += `<div class="ios-row" style="cursor:pointer" data-edit-id="${chore.id}">
                <input type="checkbox" class="chore-check" data-id="${chore.id}" ${done ? 'checked' : ''}>
                <div class="ios-row-body">
                    <div class="ios-row-title" ${done ? 'style="text-decoration:line-through;color:var(--text-secondary)"' : ''}>${escapeHtml(chore.name)}</div>
                    <div class="ios-row-subtitle">${escapeHtml(who)} · ${chore.points} ⭐</div>
                </div>
                <span class="ios-chevron"></span>
            </div>`;
        });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

/** Render full calendar view (called by chores.js when in calendar mode) */
export function renderCalendar(container) {
    const map = choresByDate();

    let html = `
        <div class="cal-header">
            <button class="cal-nav-btn" id="cal-prev">‹</button>
            <span class="cal-month-label">${MONTHS[currentMonth]} ${currentYear}</span>
            <button class="cal-nav-btn" id="cal-next">›</button>
        </div>
        <div class="cal-legend">
            <span class="cal-legend-item"><span class="cal-dot cal-dot-blue"></span> Pending</span>
            <span class="cal-legend-item"><span class="cal-dot cal-dot-red"></span> Overdue</span>
            <span class="cal-legend-item"><span class="cal-dot cal-dot-green"></span> All done</span>
        </div>
        ${buildCalendarGrid(map)}
        ${buildDayDetail(map)}
    `;

    container.innerHTML = html;

    /* ── Listeners ── */

    // Month navigation
    container.querySelector('#cal-prev')?.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        selectedDate = null;
        renderCalendar(container);
    });

    container.querySelector('#cal-next')?.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        selectedDate = null;
        renderCalendar(container);
    });

    // Day cell tap
    container.querySelectorAll('.cal-cell:not(.cal-cell-empty)').forEach(cell => {
        cell.addEventListener('click', () => {
            selectedDate = cell.dataset.date;
            renderCalendar(container);
        });
    });

    // Chore checkbox (in day detail)
    container.querySelectorAll('.chore-check').forEach(cb => {
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

    // Edit chore on row click
    container.querySelectorAll('[data-edit-id]').forEach(row => {
        row.addEventListener('click', e => {
            if (e.target.classList.contains('chore-check')) return;
            openEditChoreModal(parseInt(row.dataset.editId));
        });
    });
}

/** Reset calendar to current month (called when switching views) */
export function resetCalendar() {
    currentMonth = new Date().getMonth();
    currentYear  = new Date().getFullYear();
    selectedDate = todayKey();
}
