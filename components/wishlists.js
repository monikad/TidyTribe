/**
 * WISHLISTS COMPONENT – iOS grouped-list style
 */

import { uiLogger } from '../utils/logger.js?v=7.0.0';
import store from '../store.js?v=7.0.0';
import { openAddWishModal } from './newModals.js?v=7.0.0';

export function renderWishLists() {
    uiLogger.lifecycle('Rendering Wish Lists view');

    const members = store.getMembers();
    const wishLists = store.getWishLists();
    store.updateWishListProgress();

    if (members.length === 0) {
        return `<div class="empty-state">
            <div class="empty-state-icon">🎁</div>
            <h3 class="empty-state-title">No Family Members</h3>
            <p class="empty-state-text">Add family members first to create wish lists!</p>
        </div>`;
    }

    let h = '';
    members.forEach(member => {
        const wishes = wishLists.filter(w => w.memberId === member.id);

        h += `<div class="ios-section">
            <div class="ios-section-title" style="display:flex;justify-content:space-between;align-items:center">
                <span>${member.name}'s Wishes (${member.points} ⭐)</span>
                <button class="btn btn-text btn-small add-wish-btn" data-member-id="${member.id}" style="padding:0;min-height:auto;text-transform:none;font-size:13px">+ Add Wish</button>
            </div>`;

        if (wishes.length === 0) {
            h += `<div class="ios-group"><div class="ios-row">
                <div class="ios-row-body"><div class="ios-row-subtitle" style="text-align:center;padding:12px 0">No wishes yet</div></div>
            </div></div>`;
        } else {
            h += `<div class="ios-group">`;
            wishes.forEach(w => {
                const pct = Math.min(Math.round((w.currentProgress / w.requiredPoints) * 100), 100);
                const ready = w.currentProgress >= w.requiredPoints;

                h += `<div class="ios-row" style="flex-wrap:wrap;gap:8px">
                    <div style="flex:1;min-width:0">
                        <div class="ios-row-title">${ready ? '✨ ' : ''}${w.itemName}</div>
                        <div class="ios-row-subtitle">${w.currentProgress} / ${w.requiredPoints} ⭐</div>
                        <div class="progress-bar mt-1" style="max-width:200px">
                            <div class="progress-fill${ready ? '-green' : ''}" style="width:${pct}%"></div>
                        </div>
                    </div>
                    ${ready
                        ? `<button class="btn btn-success btn-small redeem-wish-btn" data-wish-id="${w.id}">🎁 Redeem</button>`
                        : `<span class="badge badge-blue">${w.requiredPoints - w.currentProgress} ⭐ to go</span>`
                    }
                </div>`;
            });
            h += `</div>`;
        }

        h += `</div>`;
    });

    return h;
}

export function setupWishListsListeners() {
    document.querySelectorAll('.add-wish-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const memberId = parseInt(btn.dataset.memberId);
            uiLogger.userAction('Add Wish button clicked', { memberId });
            openAddWishModal(memberId);
        });
    });

    document.querySelectorAll('.redeem-wish-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const wishId = parseInt(btn.dataset.wishId);
            if (confirm('Redeem this wish?')) {
                const result = store.redeemWishListItem(wishId);
                if (result.success) {
                    alert(`🎉 ${result.member.name} redeemed "${result.wish.itemName}"!`);
                } else {
                    alert(result.message);
                }
            }
        });
    });

    uiLogger.success('Wish list listeners attached');
}
