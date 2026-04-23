/**
 * CHALLENGES COMPONENT – iOS grouped-list style
 */

import { uiLogger } from '../utils/logger.js?v=7.0.0';
import store from '../store.js?v=7.0.0';
import { openAddChallengeModal } from './newModals.js?v=7.0.0';

export function renderChallenges() {
    uiLogger.lifecycle('Rendering Challenges view');

    const challenges = store.getChallenges();
    const members = store.getMembers();

    if (challenges.length === 0) {
        return `<div class="empty-state">
            <div class="empty-state-icon">🏆</div>
            <h3 class="empty-state-title">No Active Challenges</h3>
            <p class="empty-state-text">Tap + New to create a family challenge!</p>
        </div>`;
    }

    let h = `<div class="ios-section">
        <div class="ios-section-title">Active Challenges</div>`;

    challenges.forEach(c => {
        const pct = Math.min(Math.round((c.current / c.goal) * 100), 100);
        const done = c.current >= c.goal;
        const names = c.participants.map(id => members.find(m => m.id === id)?.name || '').filter(Boolean).join(', ');

        h += `<div class="ios-group mb-2">
            <div class="ios-row" style="flex-wrap:wrap;gap:8px">
                <div style="flex:1;min-width:0">
                    <div class="ios-row-title" style="font-weight:600">${done ? '🎉 ' : ''}${c.name}</div>
                    <div class="ios-row-subtitle">${c.description}</div>
                </div>
                <span class="badge ${done ? 'badge-green' : 'badge-blue'}">${done ? 'Done!' : `${pct}%`}</span>
            </div>
            <div style="padding:0 16px 12px">
                <div class="progress-bar"><div class="progress-fill${done ? '-green' : ''}" style="width:${pct}%"></div></div>
                <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:13px;color:var(--text-secondary)">
                    <span>${c.current} / ${c.goal}</span>
                    <span>🏅 ${c.reward} ⭐ each</span>
                </div>
            </div>
            <div class="ios-row" style="border-top:.5px solid var(--separator)">
                <div class="ios-row-body">
                    <div class="ios-row-subtitle">👥 ${names || 'No participants'} · Ends ${new Date(c.endDate).toLocaleDateString()}</div>
                </div>
            </div>
        </div>`;
    });

    h += `</div>`;
    return h;
}

export function setupChallengesListeners() {
    // Challenge-level listeners are minimal since add button is in the nav bar
    uiLogger.success('Challenges listeners attached');
}
