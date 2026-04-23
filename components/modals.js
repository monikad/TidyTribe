/**
 * MODALS COMPONENT
 * Handles all modal dialogs for CRUD operations
 */

import { uiLogger, validationLogger } from '../utils/logger.js?v=7.0.0';
import store from '../store.js?v=7.0.0';
import { renderChoreSuggestionsHTML, renderRewardSuggestionsHTML } from '../utils/suggestions.js?v=7.0.0';
import { escapeHtml, requirePin } from '../utils/safety.js?v=7.0.0';

export function openModal(title, content, onSubmit = null) {
    uiLogger.lifecycle('Opening modal', { title });
    
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
        uiLogger.error('Modal root element not found');
        return;
    }

    const modalHTML = `
        <div class="modal-overlay" id="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">${escapeHtml(title)}</h2>
                    <button class="modal-close" id="modal-close" aria-label="Close">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;

    modalRoot.innerHTML = modalHTML;

    // Close handlers
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    
    const closeModal = () => {
        uiLogger.userAction('Modal closed');
        modalRoot.innerHTML = '';
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });

    // Submit handler if provided
    if (onSubmit) {
        const form = modalRoot.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                uiLogger.userAction('Form submitted in modal');
                onSubmit(e);
            });
        }
    }

    uiLogger.success('Modal opened successfully');
}

export function closeModal() {
    uiLogger.lifecycle('Closing modal');
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
        modalRoot.innerHTML = '';
        uiLogger.success('Modal closed');
    }
}

// Validation helpers
function validateRequired(value, fieldName) {
    const isValid = value && value.trim() !== '';
    validationLogger.validation(fieldName, isValid ? 'pass' : 'fail', 
        isValid ? null : 'Field is required');
    return isValid;
}

function validateNumber(value, fieldName, min = 0) {
    const num = parseInt(value);
    const isValid = !isNaN(num) && num >= min;
    validationLogger.validation(fieldName, isValid ? 'pass' : 'fail',
        isValid ? null : `Must be a number >= ${min}`);
    return isValid;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        const errorEl = document.createElement('span');
        errorEl.className = 'form-error';
        errorEl.textContent = message;
        field.parentNode.appendChild(errorEl);
        uiLogger.warning('Field error displayed', { fieldId, message });
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.form-error').forEach(el => el.remove());
}

// Member modals
export function openAddMemberModal() {
    uiLogger.userAction('Opening Add Member modal');
    
    const content = `
        <form id="member-form">
            <div class="form-group">
                <label class="form-label" for="member-name">Name *</label>
                <input type="text" id="member-name" class="form-input" placeholder="Enter name" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="member-avatar">Avatar URL (optional)</label>
                <input type="text" id="member-avatar" class="form-input" placeholder="/assets/avatars/name.png">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Add Member</button>
            </div>
        </form>
    `;

    openModal('Add Family Member', content, (e) => {
        clearFieldErrors();
        
        const name = document.getElementById('member-name').value;
        const avatar = document.getElementById('member-avatar').value;

        if (!validateRequired(name, 'member-name')) {
            showFieldError('member-name', 'Name is required');
            return;
        }

        uiLogger.userAction('Adding new member', { name, avatar });
        store.addMember({ name, avatar: avatar || null });
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
}

export function openEditMemberModal(memberId) {
    uiLogger.userAction('Opening Edit Member modal', { memberId });
    
    const member = store.getMemberById(memberId);
    if (!member) {
        uiLogger.error('Member not found for editing', { memberId });
        return;
    }

    const content = `
        <form id="member-form">
            <div class="form-group">
                <label class="form-label" for="member-name">Name *</label>
                <input type="text" id="member-name" class="form-input" value="${escapeHtml(member.name)}" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="member-avatar">Avatar URL (optional)</label>
                <input type="text" id="member-avatar" class="form-input" value="${member.avatar || ''}" placeholder="/assets/avatars/name.png">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger btn-small" id="delete-btn">Delete</button>
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Save Changes</button>
            </div>
        </form>
    `;

    openModal('Edit Family Member', content, (e) => {
        clearFieldErrors();
        
        const name = document.getElementById('member-name').value;
        const avatar = document.getElementById('member-avatar').value;

        if (!validateRequired(name, 'member-name')) {
            showFieldError('member-name', 'Name is required');
            return;
        }

        uiLogger.userAction('Updating member', { memberId, name, avatar });
        store.updateMember(memberId, { name, avatar: avatar || null });
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    document.getElementById('delete-btn').addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete ${member.name}?`)) return;
        const ok = await requirePin('Deleting a family member');
        if (!ok) return;
        uiLogger.userAction('Deleting member', { memberId });
        store.deleteMember(memberId);
        closeModal();
    });
}

// Chore modals
export function openAddChoreModal() {
    uiLogger.userAction('Opening Add Chore modal');
    
    const members = store.getMembers();
    const memberOptions = members.map(m => 
        `<option value="${m.id}">${m.name}</option>`
    ).join('');

    const today = new Date().toISOString().split('T')[0];

    const content = `
        ${renderChoreSuggestionsHTML()}
        <form id="chore-form">
            <div class="form-group">
                <label class="form-label" for="chore-name">Chore Name *</label>
                <input type="text" id="chore-name" class="form-input" placeholder="Enter chore name" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="chore-assigned">Assign To</label>
                <select id="chore-assigned" class="form-select">
                    <option value="">Unassigned</option>
                    ${memberOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label" for="chore-due">Due Date *</label>
                <input type="date" id="chore-due" class="form-input" value="${today}" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="chore-points">Points/Stars *</label>
                <input type="number" id="chore-points" class="form-input" value="1" min="1" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="chore-recurring">Recurring</label>
                <select id="chore-recurring" class="form-select">
                    <option value="">One-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>
            <div class="form-group" id="rotation-group" style="display:none">
                <label class="checkbox-label">
                    <input type="checkbox" id="chore-rotate">
                    🔄 Auto-rotate among all members
                </label>
                <p style="font-size:12px;color:var(--text-secondary);margin-top:4px;padding-left:32px">Each time this chore recurs, it'll be assigned to the next family member</p>
            </div>
            <div class="form-group">
                <label class="form-label" for="chore-skill">Skill Category</label>
                <select id="chore-skill" class="form-select">
                    <option value="">None</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="cooking">Cooking</option>
                    <option value="organization">Organization</option>
                    <option value="petCare">Pet Care</option>
                    <option value="gardening">Gardening</option>
                    <option value="homework">Homework</option>
                </select>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="chore-photo">
                    Requires photo verification
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="chore-approval">
                    Requires parent approval
                </label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Add Chore</button>
            </div>
        </form>
    `;

    openModal('Add Chore', content, (e) => {
        clearFieldErrors();
        
        const name = document.getElementById('chore-name').value;
        const assignedTo = document.getElementById('chore-assigned').value;
        const dueDate = document.getElementById('chore-due').value;
        const points = document.getElementById('chore-points').value;
        const recurring = document.getElementById('chore-recurring').value;
        const skill = document.getElementById('chore-skill').value;
        const requiresPhoto = document.getElementById('chore-photo').checked;
        const requiresApproval = document.getElementById('chore-approval').checked;
        const rotateAmong = document.getElementById('chore-rotate')?.checked
            ? store.getMembers().map(m => m.id)
            : [];

        if (!validateRequired(name, 'chore-name')) {
            showFieldError('chore-name', 'Chore name is required');
            return;
        }

        if (!validateRequired(dueDate, 'chore-due')) {
            showFieldError('chore-due', 'Due date is required');
            return;
        }

        if (!validateNumber(points, 'chore-points', 1)) {
            showFieldError('chore-points', 'Points must be at least 1');
            return;
        }

        uiLogger.userAction('Adding new chore', { name, assignedTo, dueDate, points });
        store.addChore({
            name,
            assignedTo: assignedTo ? parseInt(assignedTo) : null,
            dueDate,
            points: parseInt(points),
            recurring: recurring || null,
            skill: skill || null,
            requiresPhoto,
            requiresApproval,
            rotateAmong
        });
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    // Show/hide rotation option when recurring is selected
    const recurringSelect = document.getElementById('chore-recurring');
    const rotationGroup = document.getElementById('rotation-group');
    if (recurringSelect && rotationGroup) {
        recurringSelect.addEventListener('change', () => {
            rotationGroup.style.display = recurringSelect.value ? 'block' : 'none';
        });
    }

    // Wire AI suggestion chips — tap to auto-fill the form
    document.querySelectorAll('.ai-chore-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            try {
                const s = JSON.parse(decodeURIComponent(chip.dataset.suggestion));
                document.getElementById('chore-name').value = s.name || '';
                document.getElementById('chore-points').value = s.points || 1;
                if (s.recurring) document.getElementById('chore-recurring').value = s.recurring;
                if (s.skill) document.getElementById('chore-skill').value = s.skill;
                // Scroll form into view
                document.getElementById('chore-name').focus();
                // Mark chip as selected
                document.querySelectorAll('.ai-chore-chip').forEach(c => c.classList.remove('ai-chip-selected'));
                chip.classList.add('ai-chip-selected');
            } catch(e) { /* ignore */ }
        });
    });
}

export function openEditChoreModal(choreId) {
    uiLogger.userAction('Opening Edit Chore modal', { choreId });
    
    const chore = store.getChoreById(choreId);
    if (!chore) {
        uiLogger.error('Chore not found for editing', { choreId });
        return;
    }

    const members = store.getMembers();
    const memberOptions = members.map(m => 
        `<option value="${m.id}" ${m.id === chore.assignedTo ? 'selected' : ''}>${m.name}</option>`
    ).join('');

    const content = `
        <form id="chore-form">
            <div class="form-group">
                <label class="form-label" for="chore-name">Chore Name *</label>
                <input type="text" id="chore-name" class="form-input" value="${escapeHtml(chore.name)}" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="chore-assigned">Assign To</label>
                <select id="chore-assigned" class="form-select">
                    <option value="" ${!chore.assignedTo ? 'selected' : ''}>Unassigned</option>
                    ${memberOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label" for="chore-due">Due Date *</label>
                <input type="date" id="chore-due" class="form-input" value="${chore.dueDate}" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="chore-points">Points/Stars *</label>
                <input type="number" id="chore-points" class="form-input" value="${chore.points}" min="1" required>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger btn-small" id="delete-btn">Delete</button>
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Save Changes</button>
            </div>
        </form>
    `;

    openModal('Edit Chore', content, (e) => {
        clearFieldErrors();
        
        const name = document.getElementById('chore-name').value;
        const assignedTo = document.getElementById('chore-assigned').value;
        const dueDate = document.getElementById('chore-due').value;
        const points = document.getElementById('chore-points').value;

        if (!validateRequired(name, 'chore-name')) {
            showFieldError('chore-name', 'Chore name is required');
            return;
        }

        if (!validateRequired(dueDate, 'chore-due')) {
            showFieldError('chore-due', 'Due date is required');
            return;
        }

        if (!validateNumber(points, 'chore-points', 1)) {
            showFieldError('chore-points', 'Points must be at least 1');
            return;
        }

        uiLogger.userAction('Updating chore', { choreId, name, assignedTo, dueDate, points });
        store.updateChore(choreId, {
            name,
            assignedTo: assignedTo ? parseInt(assignedTo) : null,
            dueDate,
            points: parseInt(points)
        });
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    document.getElementById('delete-btn').addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete "${chore.name}"?`)) return;
        const ok = await requirePin('Deleting a chore');
        if (!ok) return;
        uiLogger.userAction('Deleting chore', { choreId });
        store.deleteChore(choreId);
        closeModal();
    });
}

// Reward modals
export function openAddRewardModal() {
    uiLogger.userAction('Opening Add Reward modal');
    
    const content = `
        ${renderRewardSuggestionsHTML()}
        <form id="reward-form">
            <div class="form-group">
                <label class="form-label" for="reward-name">Reward Name *</label>
                <input type="text" id="reward-name" class="form-input" placeholder="Enter reward name" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="reward-points">Required Points/Stars *</label>
                <input type="number" id="reward-points" class="form-input" value="5" min="1" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="reward-description">Description</label>
                <input type="text" id="reward-description" class="form-input" placeholder="Optional description">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Add Reward</button>
            </div>
        </form>
    `;

    openModal('Add Reward', content, (e) => {
        clearFieldErrors();
        
        const name = document.getElementById('reward-name').value;
        const requiredPoints = document.getElementById('reward-points').value;
        const description = document.getElementById('reward-description').value;

        if (!validateRequired(name, 'reward-name')) {
            showFieldError('reward-name', 'Reward name is required');
            return;
        }

        if (!validateNumber(requiredPoints, 'reward-points', 1)) {
            showFieldError('reward-points', 'Points must be at least 1');
            return;
        }

        uiLogger.userAction('Adding new reward', { name, requiredPoints, description });
        store.addReward({
            name,
            requiredPoints: parseInt(requiredPoints),
            description
        });
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    // Wire AI suggestion chips — tap to auto-fill the form
    document.querySelectorAll('.ai-reward-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            try {
                const s = JSON.parse(decodeURIComponent(chip.dataset.suggestion));
                document.getElementById('reward-name').value = s.name || '';
                document.getElementById('reward-points').value = s.points || 5;
                document.getElementById('reward-description').value = s.description || '';
                // Scroll form into view
                document.getElementById('reward-name').focus();
                // Mark chip as selected
                document.querySelectorAll('.ai-reward-chip').forEach(c => c.classList.remove('ai-chip-selected'));
                chip.classList.add('ai-chip-selected');
            } catch(e) { /* ignore */ }
        });
    });
}

export function openEditRewardModal(rewardId) {
    uiLogger.userAction('Opening Edit Reward modal', { rewardId });
    
    const reward = store.getRewardById(rewardId);
    if (!reward) {
        uiLogger.error('Reward not found for editing', { rewardId });
        return;
    }

    const content = `
        <form id="reward-form">
            <div class="form-group">
                <label class="form-label" for="reward-name">Reward Name *</label>
                <input type="text" id="reward-name" class="form-input" value="${escapeHtml(reward.name)}" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="reward-points">Required Points/Stars *</label>
                <input type="number" id="reward-points" class="form-input" value="${reward.requiredPoints}" min="1" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="reward-description">Description</label>
                <input type="text" id="reward-description" class="form-input" value="${escapeHtml(reward.description || '')}" placeholder="Optional description">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger btn-small" id="delete-btn">Delete</button>
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Save Changes</button>
            </div>
        </form>
    `;

    openModal('Edit Reward', content, (e) => {
        clearFieldErrors();
        
        const name = document.getElementById('reward-name').value;
        const requiredPoints = document.getElementById('reward-points').value;
        const description = document.getElementById('reward-description').value;

        if (!validateRequired(name, 'reward-name')) {
            showFieldError('reward-name', 'Reward name is required');
            return;
        }

        if (!validateNumber(requiredPoints, 'reward-points', 1)) {
            showFieldError('reward-points', 'Points must be at least 1');
            return;
        }

        uiLogger.userAction('Updating reward', { rewardId, name, requiredPoints, description });
        store.updateReward(rewardId, {
            name,
            requiredPoints: parseInt(requiredPoints),
            description
        });
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    document.getElementById('delete-btn').addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete "${reward.name}"?`)) return;
        const ok = await requirePin('Deleting a reward');
        if (!ok) return;
        uiLogger.userAction('Deleting reward', { rewardId });
        store.deleteReward(rewardId);
        closeModal();
    });
}

// Redemption modal
export function openRedeemRewardModal(rewardId) {
    uiLogger.userAction('Opening Redeem Reward modal', { rewardId });
    
    const reward = store.getRewardById(rewardId);
    if (!reward) {
        uiLogger.error('Reward not found for redemption', { rewardId });
        return;
    }

    const members = store.getMembers().filter(m => m.points >= reward.requiredPoints);
    
    if (members.length === 0) {
        uiLogger.warning('No members have enough points', { requiredPoints: reward.requiredPoints });
        alert('No family members have enough points for this reward yet!');
        return;
    }

    const memberOptions = members.map(m => 
        `<option value="${m.id}">${m.name} (${m.points} ⭐)</option>`
    ).join('');

    const content = `
        <form id="redeem-form">
            <div class="form-group">
                <label class="form-label">Reward</label>
                <div style="padding: 1rem; background: var(--bg-grouped); border-radius: var(--radius-md); border: 2px solid var(--ios-purple);">
                    <h3 style="color: var(--ios-purple); margin-bottom: 0.5rem;">${escapeHtml(reward.name)}</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">${escapeHtml(reward.description)}</p>
                    <p style="color: var(--ios-blue); font-weight: 600;">Cost: ${reward.requiredPoints} ⭐</p>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label" for="redeem-member">Redeem For *</label>
                <select id="redeem-member" class="form-select" required>
                    <option value="">Select family member</option>
                    ${memberOptions}
                </select>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-success btn-small">Redeem Now</button>
            </div>
        </form>
    `;

    openModal('Redeem Reward', content, (e) => {
        clearFieldErrors();
        
        const memberId = document.getElementById('redeem-member').value;

        if (!memberId) {
            showFieldError('redeem-member', 'Please select a family member');
            return;
        }

        uiLogger.userAction('Redeeming reward', { rewardId, memberId: parseInt(memberId) });
        const result = store.redeemReward(rewardId, parseInt(memberId));
        
        if (result.success) {
            // Show celebration
            const modalBody = document.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="text-center celebration" style="padding: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                        <h2 style="color: var(--ios-green); margin-bottom: 1rem;">Success!</h2>
                        <p style="font-size: 1.2rem; color: var(--text-primary);">${result.message}</p>
                        <button class="btn btn-primary mt-2" id="close-success-btn">Close</button>
                    </div>
                `;
                document.getElementById('close-success-btn').addEventListener('click', closeModal);
            }
        } else {
            alert(result.message);
        }
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
}
