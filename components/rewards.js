/**
 * REWARDS COMPONENT – iOS grouped-list style
 */

import { uiLogger } from '../utils/logger.js?v=7.0.0';
import store from '../store.js?v=7.0.0';
import { openAddRewardModal, openEditRewardModal, openRedeemRewardModal } from './modals.js?v=7.0.0';
import { escapeHtml, requirePin, isParent } from '../utils/safety.js?v=7.0.0';

export function renderRewards() {
    uiLogger.lifecycle('Rendering Rewards view');
    const main = document.getElementById('main-content');
    if (!main) return;

    const rewards = store.getRewards();
    const members = store.getMembers();
    let h = '';

    if (rewards.length === 0) {
        h = `<div class="empty-state">
            <div class="empty-state-icon">🎁</div>
            <h3 class="empty-state-title">No Rewards Yet</h3>
            <p class="empty-state-text">Tap + Add to create motivating rewards!</p>
        </div>`;
    } else {
        /* ── Reward list ── */
        h += `<div class="ios-section">
            <div class="ios-section-title">Available Rewards</div>
            <div class="ios-group">`;
        rewards.forEach(r => {
            const canAfford = members.some(m => m.points >= r.requiredPoints);
            h += `<div class="ios-row">
                <div class="ios-row-icon" style="background:${canAfford ? 'rgba(143,217,142,.15)' : 'rgba(174,174,178,.1)'}; font-size:22px">
                    🎁
                </div>
                <div class="ios-row-body">
                    <div class="ios-row-title">${escapeHtml(r.name)}</div>
                    <div class="ios-row-subtitle">${escapeHtml(r.description)} · ${r.requiredPoints} ⭐</div>
                </div>
                <div class="ios-row-accessory" style="gap:6px">
                    <button class="btn btn-secondary btn-small btn-icon edit-reward-btn" data-id="${r.id}" style="font-size:14px">✏️</button>
                    <button class="btn ${canAfford ? 'btn-success' : 'btn-secondary'} btn-small redeem-reward-btn" data-id="${r.id}" ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? '🎉 Redeem' : '🔒'}
                    </button>
                </div>
            </div>`;
        });
        h += `</div></div>`;

        /* ── Leaderboard ── */
        if (members.length) {
            const sorted = [...members].sort((a, b) => b.points - a.points);
            h += `<div class="ios-section">
                <div class="ios-section-title">🏆 Points Leaderboard</div>
                <div class="ios-group">`;
            sorted.forEach((m, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
                h += `<div class="leaderboard-item">
                    <div class="leaderboard-rank">${medal}</div>
                    <div class="leaderboard-name">${escapeHtml(m.name)}</div>
                    <div class="leaderboard-points">${m.points} ⭐</div>
                </div>`;
            });
            h += `</div></div>`;
        }
    }

    main.innerHTML = h;

    /* ── Listeners ── */
    main.querySelectorAll('.edit-reward-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const ok = await requirePin('Editing rewards');
            if (!ok) return;
            openEditRewardModal(parseInt(btn.dataset.id));
        });
    });

    main.querySelectorAll('.redeem-reward-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            if (!isParent(store)) {
                // Children can only redeem for themselves
                const me = store.getCurrentUser();
                const rewardId = parseInt(btn.dataset.id);
                const reward = store.getRewardById(rewardId);
                if (!me || !reward) return;
                if (me.points < reward.requiredPoints) {
                    alert(`You need ${reward.requiredPoints} ⭐ but only have ${me.points} ⭐`);
                    return;
                }
                if (confirm(`Redeem "${reward.name}" for ${reward.requiredPoints} ⭐?`)) {
                    const result = store.redeemReward(rewardId, me.id);
                    if (result.success) alert(`🎉 ${result.message}`);
                    else alert(result.message);
                }
                return;
            }
            openRedeemRewardModal(parseInt(btn.dataset.id));
        });
    });

    uiLogger.success('Rewards rendered');
}
