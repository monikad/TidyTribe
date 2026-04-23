/**
 * NEW FEATURE MODALS
 */

import { uiLogger } from '../utils/logger.js?v=7.0.0';
import store from '../store.js?v=7.0.0';
import { openModal, closeModal } from './modals.js?v=7.0.0';

// Photo Upload Modal
export function openPhotoUploadModal(choreId) {
    uiLogger.userAction('Opening Photo Upload modal', { choreId });
    
    const chore = store.getChoreById(choreId);
    if (!chore) return;

    const content = `
        <form id="photo-form">
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                Take a photo to verify completion of "${chore.name}"
            </p>
            <div class="form-group">
                <input type="file" id="photo-input" accept="image/*" capture="camera" class="form-input">
                <div id="photo-preview" style="margin-top: 1rem; text-align: center;"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Upload Photo</button>
            </div>
        </form>
    `;

    openModal('Upload Photo', content, (e) => {
        const fileInput = document.getElementById('photo-input');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a photo');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            store.uploadChorePhoto(choreId, event.target.result);
            alert('Photo uploaded! Waiting for parent approval.');
            closeModal();
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('photo-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('photo-preview').innerHTML = `
                    <img src="${event.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
                `;
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
}

// Challenge Modal
export function openAddChallengeModal() {
    uiLogger.userAction('Opening Add Challenge modal');
    
    const members = store.getMembers();
    const memberCheckboxes = members.map(m => 
        `<label class="checkbox-label">
            <input type="checkbox" name="participants" value="${m.id}"> ${m.name}
        </label>`
    ).join('');

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const defaultEndDate = nextWeek.toISOString().split('T')[0];

    const content = `
        <form id="challenge-form">
            <div class="form-group">
                <label class="form-label" for="challenge-name">Challenge Name *</label>
                <input type="text" id="challenge-name" class="form-input" placeholder="e.g., Clean Sweep Week" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="challenge-desc">Description *</label>
                <textarea id="challenge-desc" class="form-input" rows="2" placeholder="e.g., Complete 10 cleaning tasks" required></textarea>
            </div>
            <div class="form-group">
                <label class="form-label" for="challenge-goal">Goal (number of tasks) *</label>
                <input type="number" id="challenge-goal" class="form-input" value="10" min="1" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="challenge-reward">Bonus Stars for Each Participant *</label>
                <input type="number" id="challenge-reward" class="form-input" value="20" min="1" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="challenge-end">End Date *</label>
                <input type="date" id="challenge-end" class="form-input" value="${defaultEndDate}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Participants *</label>
                ${memberCheckboxes}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Create Challenge</button>
            </div>
        </form>
    `;

    openModal('Create Family Challenge', content, (e) => {
        const name = document.getElementById('challenge-name').value;
        const description = document.getElementById('challenge-desc').value;
        const goal = document.getElementById('challenge-goal').value;
        const reward = document.getElementById('challenge-reward').value;
        const endDate = document.getElementById('challenge-end').value;
        
        const checkboxes = document.querySelectorAll('input[name="participants"]:checked');
        const participants = Array.from(checkboxes).map(cb => parseInt(cb.value));

        if (!name || !description || !goal || !reward || !endDate) {
            alert('Please fill in all fields');
            return;
        }

        if (participants.length === 0) {
            alert('Please select at least one participant');
            return;
        }

        store.addChallenge({
            name,
            description,
            goal: parseInt(goal),
            reward: parseInt(reward),
            endDate,
            participants
        });
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
}

// Wish List Modal
export function openAddWishModal(memberId) {
    uiLogger.userAction('Opening Add Wish modal', { memberId });
    
    const member = store.getMemberById(memberId);
    if (!member) return;

    const content = `
        <form id="wish-form">
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                Adding wish for <strong>${member.name}</strong> (Current: ${member.points} ⭐)
            </p>
            <div class="form-group">
                <label class="form-label" for="wish-item">Item Name *</label>
                <input type="text" id="wish-item" class="form-input" placeholder="e.g., New bicycle" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="wish-points">Stars Needed *</label>
                <input type="number" id="wish-points" class="form-input" value="50" min="1" required>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Add to Wish List</button>
            </div>
        </form>
    `;

    openModal('Add Wish List Item', content, (e) => {
        const itemName = document.getElementById('wish-item').value;
        const requiredPoints = document.getElementById('wish-points').value;

        if (!itemName || !requiredPoints) {
            alert('Please fill in all fields');
            return;
        }

        store.addWishListItem(memberId, itemName, parseInt(requiredPoints));
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
}

// Template Modal
export function openAddTemplateModal() {
    uiLogger.userAction('Opening Add Template modal');

    const content = `
        <form id="template-form">
            <div class="form-group">
                <label class="form-label" for="template-name">Template Name *</label>
                <input type="text" id="template-name" class="form-input" placeholder="e.g., Daily Kitchen Cleanup" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="template-tasks">Tasks (one per line) *</label>
                <textarea id="template-tasks" class="form-input" rows="4" placeholder="Wash dishes
Wipe counters
Sweep floor" required></textarea>
            </div>
            <div class="form-group">
                <label class="form-label" for="template-points">Total Points *</label>
                <input type="number" id="template-points" class="form-input" value="5" min="1" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="template-skill">Skill Category</label>
                <select id="template-skill" class="form-select">
                    <option value="">None</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="cooking">Cooking</option>
                    <option value="organization">Organization</option>
                    <option value="petCare">Pet Care</option>
                    <option value="gardening">Gardening</option>
                    <option value="homework">Homework</option>
                </select>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-small" id="cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary btn-small">Create Template</button>
            </div>
        </form>
    `;

    openModal('Create Chore Template', content, (e) => {
        const name = document.getElementById('template-name').value;
        const tasksText = document.getElementById('template-tasks').value;
        const points = document.getElementById('template-points').value;
        const skill = document.getElementById('template-skill').value;

        if (!name || !tasksText || !points) {
            alert('Please fill in all fields');
            return;
        }

        const tasks = tasksText.split('\n').filter(t => t.trim());

        store.addTemplate({
            name,
            tasks,
            points: parseInt(points),
            skill: skill || null
        });
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
}
