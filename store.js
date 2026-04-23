/**
 * STORE MODULE
 * Manages application state and localStorage persistence
 */

import { storeLogger } from './utils/logger.js';
import sync from './utils/sync.js';
import { updateStreak } from './utils/streaks.js';

const STORAGE_KEY = 'tidytribe-data';
const PROFILE_KEY = 'tidytribe-profile'; // per-device profile

// Generate a short household invite code (6 alphanumeric chars)
function generateHouseholdCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous I/O/0/1
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// Names used in old mock data — if we detect these in localStorage we wipe it
const MOCK_MEMBER_NAMES = ['alice', 'bob', 'charlie', 'dana'];

class Store {
    constructor() {
        storeLogger.lifecycle('Store initializing');
        this.state = {
            household: null,
            familyMembers: [],
            chores: [],
            rewards: [],
            choreTemplates: [],
            challenges: [],
            wishLists: [],
            activityLog: []
        };
        this.listeners = [];
        this.nextMemberId = 1;
        this.nextChoreId = 1;
        this.nextRewardId = 1;
        this.nextTemplateId = 1;
        this.nextChallengeId = 1;
        this.nextWishId = 1;
        
        // Per-device profile (which member am I)
        this.profile = this._loadProfile();
        
        this.init();
    }

    init() {
        storeLogger.lifecycle('Loading data from localStorage');

        // ── Firebase migration: wipe pre-Firebase localStorage so all devices start fresh ──
        const FIREBASE_MIGRATED_KEY = 'tidytribe-firebase-v3';
        if (!localStorage.getItem(FIREBASE_MIGRATED_KEY)) {
            storeLogger.warning('TidyTribe migration — clearing old localStorage data');
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(PROFILE_KEY);
            // Also clear legacy keys from old app name
            localStorage.removeItem('family-chore-manager-data');
            localStorage.removeItem('family-chore-manager-profile');
            localStorage.setItem(FIREBASE_MIGRATED_KEY, Date.now().toString());
            this.profile = null;
            storeLogger.info('Old data cleared — onboarding will handle fresh setup with Firebase');
            return;
        }

        const savedData = this.loadFromStorage();
        
        if (savedData) {
            // Detect and wipe stale mock data (Alice/Bob/Charlie/Dana)
            if (this._isMockData(savedData)) {
                storeLogger.warning('Detected old mock data — wiping for clean start');
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(PROFILE_KEY);
                this.profile = null;
                storeLogger.info('Mock data cleared — onboarding will handle setup');
                return;
            }

            storeLogger.success('Data loaded from localStorage', savedData);
            this.state = savedData;
            // Ensure household field exists for data saved before this feature
            if (!this.state.household) {
                // Auto-migrate: if there's existing data with members, create a household
                if (this.state.familyMembers && this.state.familyMembers.length > 0) {
                    this.state.household = {
                        name: 'My Family',
                        code: generateHouseholdCode(),
                        createdAt: new Date().toISOString()
                    };
                    this.saveToStorage();
                    storeLogger.info('Auto-migrated existing data to household');
                } else {
                    this.state.household = null;
                }
            }
            this._updateNextIds();

            // Start server sync if we already have a household
            if (this.state.household && this.state.household.code) {
                this._startSync();
            }
        } else {
            // No saved data — leave state empty so onboarding shows Create / Join
            storeLogger.info('No saved data found — onboarding will handle setup');
        }
    }

    /** Detect whether saved data is leftover mock data from an old version. */
    _isMockData(data) {
        if (!data || !data.familyMembers || data.familyMembers.length === 0) return false;
        const names = data.familyMembers.map(m => (m.name || '').toLowerCase());
        // If 3+ of the 4 mock names are present, it's mock data
        const matches = MOCK_MEMBER_NAMES.filter(n => names.includes(n));
        return matches.length >= 3;
    }

    _updateNextIds() {
        if (this.state.familyMembers.length > 0) {
            this.nextMemberId = Math.max(...this.state.familyMembers.map(m => m.id)) + 1;
        }
        if (this.state.chores.length > 0) {
            this.nextChoreId = Math.max(...this.state.chores.map(c => c.id)) + 1;
        }
        if (this.state.rewards.length > 0) {
            this.nextRewardId = Math.max(...this.state.rewards.map(r => r.id)) + 1;
        }
        if (this.state.choreTemplates && this.state.choreTemplates.length > 0) {
            this.nextTemplateId = Math.max(...this.state.choreTemplates.map(t => t.id)) + 1;
        }
        if (this.state.challenges && this.state.challenges.length > 0) {
            this.nextChallengeId = Math.max(...this.state.challenges.map(c => c.id)) + 1;
        }
        if (this.state.wishLists && this.state.wishLists.length > 0) {
            this.nextWishId = Math.max(...this.state.wishLists.map(w => w.id)) + 1;
        }
        storeLogger.debug('Next IDs updated', {
            nextMemberId: this.nextMemberId,
            nextChoreId: this.nextChoreId,
            nextRewardId: this.nextRewardId,
            nextTemplateId: this.nextTemplateId,
            nextChallengeId: this.nextChallengeId,
            nextWishId: this.nextWishId
        });
    }

    // Storage operations
    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
            storeLogger.success('Data saved to localStorage');
            // Push to server for cross-device sync
            sync.push(this.state);
        } catch (error) {
            storeLogger.error('Failed to save to localStorage', error);
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            storeLogger.error('Failed to load from localStorage', error);
            return null;
        }
    }

    clearStorage() {
        storeLogger.warning('Clearing all data from localStorage');
        localStorage.removeItem(STORAGE_KEY);
        sync.stop();
        this.state = {
            familyMembers: [],
            chores: [],
            rewards: [],
            choreTemplates: [],
            challenges: [],
            wishLists: [],
            activityLog: []
        };
        this.notifyListeners();
    }

    // ── Server sync helpers ──

    /** Start the sync engine for the current household code. */
    _startSync() {
        if (!this.state.household || !this.state.household.code) return;
        sync.start(this.state.household.code, (remoteState) => {
            this._handleRemoteUpdate(remoteState);
        });
        // Do an initial pull so we pick up any changes from other devices
        sync.pull();
        // Also push current state so the server has our data immediately
        sync.push(this.state);
    }

    /** Called when the server has newer data than us. */
    _handleRemoteUpdate(remoteState) {
        // Preserve our own household metadata in case the server version is slightly different
        if (!remoteState || !remoteState.household) return;

        storeLogger.info('[Sync] Applying remote update');
        this.state = {
            ...remoteState,
            // Ensure arrays exist
            familyMembers: remoteState.familyMembers || [],
            chores: remoteState.chores || [],
            rewards: remoteState.rewards || [],
            choreTemplates: remoteState.choreTemplates || [],
            challenges: remoteState.challenges || [],
            wishLists: remoteState.wishLists || [],
            activityLog: remoteState.activityLog || []
        };
        this._updateNextIds();
        // Persist to localStorage (but don't re-push since this came FROM the server)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) { /* ignore */ }
        this.notifyListeners();
    }

    // ── Per-device profile ──
    _loadProfile() {
        try {
            const p = localStorage.getItem(PROFILE_KEY);
            return p ? JSON.parse(p) : null;
        } catch { return null; }
    }

    _saveProfile() {
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
        } catch (e) { storeLogger.error('Failed to save profile', e); }
    }

    /** Get current user's member ID on this device */
    getCurrentUserId() {
        return this.profile?.memberId || null;
    }

    /** Set which family member this device belongs to */
    setCurrentUser(memberId) {
        this.profile = { memberId };
        this._saveProfile();
        this.notifyListeners();
        storeLogger.success('Current user set', { memberId });
    }

    getCurrentUser() {
        const id = this.getCurrentUserId();
        return id ? this.getMemberById(id) : null;
    }

    // ── Household management ──
    hasHousehold() {
        return !!(this.state.household && this.state.household.code);
    }

    getHousehold() {
        return this.state.household;
    }

    /** Create a brand-new household (first device) */
    createHousehold(householdName, creatorName, creatorRole = 'parent') {
        storeLogger.info('Creating new household', { householdName, creatorName });
        const code = generateHouseholdCode();

        this.state = {
            household: { name: householdName, code, createdAt: new Date().toISOString() },
            familyMembers: [],
            chores: [],
            rewards: [],
            choreTemplates: [],
            challenges: [],
            wishLists: [],
            activityLog: []
        };
        this.nextMemberId = 1;
        this.nextChoreId = 1;
        this.nextRewardId = 1;
        this.nextTemplateId = 1;
        this.nextChallengeId = 1;
        this.nextWishId = 1;

        // Start syncing FIRST so subsequent saves actually push to server
        this._startSync();

        // Add the creator as the first member (this calls saveToStorage → sync.push)
        const creator = this.addMember({ name: creatorName, role: creatorRole });
        this.setCurrentUser(creator.id);

        // Force-push the final state to ensure it reaches the server
        this.saveToStorage();
        this.notifyListeners();

        storeLogger.success('Household created', { code });
        return { code, member: creator };
    }

    /** Join a household by code — works same-device AND cross-device.
     *  Now fetches real data from the server so all devices share the same state.
     *  Returns a Promise because the server fetch is async. */
    async joinHousehold(code, memberName, memberRole = 'child') {
        const codeUpper = code.toUpperCase().trim();

        if (this.hasHousehold()) {
            // ── Same device: verify the code matches the local household ──
            if (this.state.household.code !== codeUpper) {
                return { success: false, message: 'That code doesn\'t match this device\'s household. Double-check the code or create a new household.' };
            }

            // Check if name already exists → log them in
            const existing = this.state.familyMembers.find(
                m => m.name.toLowerCase() === memberName.trim().toLowerCase()
            );
            if (existing) {
                this.setCurrentUser(existing.id);
                return { success: true, member: existing, message: `Welcome back, ${existing.name}!` };
            }

            // Add new member to existing household
            const member = this.addMember({ name: memberName, role: memberRole });
            this.setCurrentUser(member.id);
            return { success: true, member, message: `${memberName} joined the household!` };
        }

        // ── Cross-device: no local household yet ──
        // Try to fetch the household data from the server
        storeLogger.info('Cross-device join — fetching household from server', { codeUpper });

        const remoteState = await sync.fetchHousehold(codeUpper);

        if (remoteState && remoteState.household) {
            // Server has the household — adopt its full state
            this.state = {
                household: remoteState.household,
                familyMembers: remoteState.familyMembers || [],
                chores: remoteState.chores || [],
                rewards: remoteState.rewards || [],
                choreTemplates: remoteState.choreTemplates || [],
                challenges: remoteState.challenges || [],
                wishLists: remoteState.wishLists || [],
                activityLog: remoteState.activityLog || []
            };
            this._updateNextIds();

            // Start sync FIRST so subsequent saves push to server
            this._startSync();

            // Check if user already exists (returning on new device)
            const existing = this.state.familyMembers.find(
                m => m.name.toLowerCase() === memberName.trim().toLowerCase()
            );
            if (existing) {
                this.setCurrentUser(existing.id);
                this.saveToStorage();
                this.notifyListeners();
                return { success: true, member: existing, message: `Welcome back, ${existing.name}!` };
            }

            // Add as new member (this calls saveToStorage → sync.push)
            const member = this.addMember({ name: memberName, role: memberRole });
            this.setCurrentUser(member.id);
            // Force-push the final state with new member
            this.saveToStorage();
            this.notifyListeners();
            return { success: true, member, message: `${memberName} joined the household!` };
        }

        // Server doesn't have it either — create a local placeholder with the shared code
        // (This supports fully offline join; data will sync once both devices are online)
        storeLogger.info('Household not on server — creating local with shared code', { codeUpper });

        this.state = {
            household: { name: 'My Family', code: codeUpper, createdAt: new Date().toISOString() },
            familyMembers: [],
            chores: [],
            rewards: [],
            choreTemplates: [],
            challenges: [],
            wishLists: [],
            activityLog: []
        };
        this.nextMemberId = 1;
        this.nextChoreId = 1;
        this.nextRewardId = 1;
        this.nextTemplateId = 1;
        this.nextChallengeId = 1;
        this.nextWishId = 1;

        // Start sync FIRST so saves push to server
        this._startSync();

        const member = this.addMember({ name: memberName, role: memberRole });
        this.setCurrentUser(member.id);
        this.saveToStorage();
        this.notifyListeners();
        return { success: true, member, message: `${memberName} joined the household!` };
    }

    /** Switch active profile to a different member (for shared device) */
    switchUser(memberId) {
        const member = this.getMemberById(memberId);
        if (member) {
            this.setCurrentUser(memberId);
            return member;
        }
        return null;
    }

    /** Update household name */
    updateHouseholdName(name) {
        if (this.state.household) {
            this.state.household.name = name;
            this.saveToStorage();
            this.notifyListeners();
        }
    }

    /** Regenerate invite code */
    regenerateCode() {
        if (this.state.household) {
            this.state.household.code = generateHouseholdCode();
            this.saveToStorage();
            this.notifyListeners();
            return this.state.household.code;
        }
        return null;
    }

    /** Leave household (clear profile, optionally remove member) */
    leaveHousehold() {
        sync.stop();
        this.profile = null;
        localStorage.removeItem(PROFILE_KEY);
        this.notifyListeners();
    }

    /**
     * Load a household from Firebase and start sync.
     * Used when a returning signed-in user already has a linked household.
     * @param {string} code - the 6-letter household code
     * @param {number} memberId - the member ID to set as current user
     * @returns {boolean} true if loaded successfully
     */
    async loadHouseholdFromFirebase(code, memberId) {
        storeLogger.info('Loading household from Firebase', { code, memberId });
        try {
            const remoteState = await sync.fetchHousehold(code);
            if (remoteState && remoteState.household) {
                this.state = {
                    household: remoteState.household,
                    familyMembers: remoteState.familyMembers || [],
                    chores: remoteState.chores || [],
                    rewards: remoteState.rewards || [],
                    choreTemplates: remoteState.choreTemplates || [],
                    challenges: remoteState.challenges || [],
                    wishLists: remoteState.wishLists || [],
                    activityLog: remoteState.activityLog || []
                };
                this._updateNextIds();
                this._startSync();
                if (memberId) this.setCurrentUser(memberId);
                this.saveToStorage();
                this.notifyListeners();
                storeLogger.success('Household loaded from Firebase', { code });
                return true;
            }
            storeLogger.warning('Household not found in Firebase', { code });
            return false;
        } catch (err) {
            storeLogger.error('Failed to load household from Firebase', err);
            return false;
        }
    }

    /** Reset everything */
    resetAll() {
        sync.stop();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(PROFILE_KEY);
        this.profile = null;
        this.state = {
            household: null,
            familyMembers: [],
            chores: [],
            rewards: [],
            choreTemplates: [],
            challenges: [],
            wishLists: [],
            activityLog: []
        };
        this.notifyListeners();
    }

    // State subscription
    subscribe(listener) {
        storeLogger.debug('New listener subscribed');
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
            storeLogger.debug('Listener unsubscribed');
        };
    }

    notifyListeners() {
        storeLogger.debug(`Notifying ${this.listeners.length} listeners of state change`);
        this.listeners.forEach(listener => listener(this.state));
    }

    // Activity log
    addActivity(activity) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            activity
        };
        this.state.activityLog.unshift(logEntry);
        // Keep only last 50 activities
        if (this.state.activityLog.length > 50) {
            this.state.activityLog = this.state.activityLog.slice(0, 50);
        }
        storeLogger.info('Activity logged', logEntry);
    }

    // Family Members
    getMembers() {
        storeLogger.debug('Getting all family members', { count: this.state.familyMembers.length });
        return this.state.familyMembers;
    }

    getMemberById(id) {
        const member = this.state.familyMembers.find(m => m.id === id);
        storeLogger.debug('Getting member by ID', { id, found: !!member });
        return member;
    }

    addMember(memberData) {
        storeLogger.info('Adding new family member', memberData);
        const newMember = {
            id: this.nextMemberId++,
            name: memberData.name,
            avatar: memberData.avatar || null,
            points: 0,
            role: memberData.role || 'child',
            skills: memberData.skills || [],
            streakData: { current: 0, best: 0, lastDate: null }
        };
        this.state.familyMembers.push(newMember);
        this.addActivity(`${newMember.name} joined the family!`);
        this.saveToStorage();
        this.notifyListeners();
        storeLogger.success('Family member added', newMember);
        return newMember;
    }

    updateMember(id, updates) {
        storeLogger.info('Updating family member', { id, updates });
        const index = this.state.familyMembers.findIndex(m => m.id === id);
        if (index !== -1) {
            this.state.familyMembers[index] = {
                ...this.state.familyMembers[index],
                ...updates
            };
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Family member updated', this.state.familyMembers[index]);
            return this.state.familyMembers[index];
        }
        storeLogger.warning('Family member not found for update', { id });
        return null;
    }

    deleteMember(id) {
        storeLogger.warning('Deleting family member', { id });
        const member = this.getMemberById(id);
        if (member) {
            // Unassign or delete chores for this member
            this.state.chores = this.state.chores.map(chore => {
                if (chore.assignedTo === id) {
                    storeLogger.info('Unassigning chore from deleted member', chore);
                    return { ...chore, assignedTo: null };
                }
                return chore;
            });
            
            this.state.familyMembers = this.state.familyMembers.filter(m => m.id !== id);
            this.addActivity(`${member.name} was removed from the family`);
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Family member deleted', { id });
            return true;
        }
        storeLogger.warning('Family member not found for deletion', { id });
        return false;
    }

    updateMemberPoints(id, pointsDelta) {
        storeLogger.info('Updating member points', { id, pointsDelta });
        const member = this.getMemberById(id);
        if (member) {
            member.points += pointsDelta;
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Member points updated', { id, newPoints: member.points });
            return member;
        }
        storeLogger.warning('Member not found for points update', { id });
        return null;
    }

    // Chores
    getChores() {
        storeLogger.debug('Getting all chores', { count: this.state.chores.length });
        return this.state.chores;
    }

    getChoreById(id) {
        const chore = this.state.chores.find(c => c.id === id);
        storeLogger.debug('Getting chore by ID', { id, found: !!chore });
        return chore;
    }

    getChoresByMember(memberId) {
        const chores = this.state.chores.filter(c => c.assignedTo === memberId);
        storeLogger.debug('Getting chores by member', { memberId, count: chores.length });
        return chores;
    }

    addChore(choreData) {
        storeLogger.info('Adding new chore', choreData);
        const newChore = {
            id: this.nextChoreId++,
            name: choreData.name,
            assignedTo: choreData.assignedTo || null,
            dueDate: choreData.dueDate,
            status: 'Pending',
            points: choreData.points || 1,
            recurring: choreData.recurring || null,
            collaborators: choreData.collaborators || [],
            rotateAmong: choreData.rotateAmong || [],
            requiresPhoto: choreData.requiresPhoto || false,
            requiresApproval: choreData.requiresApproval || false,
            photoUrl: null,
            skill: choreData.skill || null,
            approvedBy: null
        };
        this.state.chores.push(newChore);
        
        if (newChore.assignedTo) {
            const member = this.getMemberById(newChore.assignedTo);
            if (member) {
                this.addActivity(`${member.name} was assigned "${newChore.name}"`);
            }
        }
        
        this.saveToStorage();
        this.notifyListeners();
        storeLogger.success('Chore added', newChore);
        return newChore;
    }

    updateChore(id, updates) {
        storeLogger.info('Updating chore', { id, updates });
        const index = this.state.chores.findIndex(c => c.id === id);
        if (index !== -1) {
            const oldChore = { ...this.state.chores[index] };
            this.state.chores[index] = {
                ...oldChore,
                ...updates
            };
            
            // Log reassignment
            if (updates.assignedTo && updates.assignedTo !== oldChore.assignedTo) {
                const member = this.getMemberById(updates.assignedTo);
                if (member) {
                    this.addActivity(`${member.name} was assigned "${this.state.chores[index].name}"`);
                }
            }
            
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Chore updated', this.state.chores[index]);
            return this.state.chores[index];
        }
        storeLogger.warning('Chore not found for update', { id });
        return null;
    }

    deleteChore(id) {
        storeLogger.warning('Deleting chore', { id });
        const chore = this.getChoreById(id);
        if (chore) {
            this.state.chores = this.state.chores.filter(c => c.id !== id);
            this.addActivity(`Chore "${chore.name}" was deleted`);
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Chore deleted', { id });
            return true;
        }
        storeLogger.warning('Chore not found for deletion', { id });
        return false;
    }

    completeChore(id) {
        storeLogger.info('Completing chore', { id });
        const chore = this.getChoreById(id);
        if (chore && chore.status !== 'Completed') {
            chore.status = 'Completed';
            chore.completedAt = new Date().toISOString();
            
            if (chore.assignedTo) {
                const member = this.updateMemberPoints(chore.assignedTo, chore.points);
                if (member) {
                    // Update streak
                    member.streakData = updateStreak(member);
                    this.addActivity(`${member.name} completed "${chore.name}" (+${chore.points} stars)`);
                }
            }
            
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Chore completed', chore);
            return chore;
        }
        storeLogger.warning('Chore not found or already completed', { id });
        return null;
    }

    uncompleteChore(id) {
        storeLogger.info('Uncompleting chore', { id });
        const chore = this.getChoreById(id);
        if (chore && chore.status === 'Completed') {
            chore.status = 'Pending';
            
            if (chore.assignedTo) {
                const member = this.updateMemberPoints(chore.assignedTo, -chore.points);
                if (member) {
                    this.addActivity(`${member.name} unmarked "${chore.name}" (-${chore.points} stars)`);
                }
            }
            
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Chore uncompleted', chore);
            return chore;
        }
        storeLogger.warning('Chore not found or not completed', { id });
        return null;
    }

    // Rewards
    getRewards() {
        storeLogger.debug('Getting all rewards', { count: this.state.rewards.length });
        return this.state.rewards;
    }

    getRewardById(id) {
        const reward = this.state.rewards.find(r => r.id === id);
        storeLogger.debug('Getting reward by ID', { id, found: !!reward });
        return reward;
    }

    addReward(rewardData) {
        storeLogger.info('Adding new reward', rewardData);
        const newReward = {
            id: this.nextRewardId++,
            name: rewardData.name,
            requiredPoints: rewardData.requiredPoints,
            description: rewardData.description || ''
        };
        this.state.rewards.push(newReward);
        this.addActivity(`New reward available: "${newReward.name}" (${newReward.requiredPoints} stars)`);
        this.saveToStorage();
        this.notifyListeners();
        storeLogger.success('Reward added', newReward);
        return newReward;
    }

    updateReward(id, updates) {
        storeLogger.info('Updating reward', { id, updates });
        const index = this.state.rewards.findIndex(r => r.id === id);
        if (index !== -1) {
            this.state.rewards[index] = {
                ...this.state.rewards[index],
                ...updates
            };
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Reward updated', this.state.rewards[index]);
            return this.state.rewards[index];
        }
        storeLogger.warning('Reward not found for update', { id });
        return null;
    }

    deleteReward(id) {
        storeLogger.warning('Deleting reward', { id });
        const reward = this.getRewardById(id);
        if (reward) {
            this.state.rewards = this.state.rewards.filter(r => r.id !== id);
            this.addActivity(`Reward "${reward.name}" was removed`);
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Reward deleted', { id });
            return true;
        }
        storeLogger.warning('Reward not found for deletion', { id });
        return false;
    }

    redeemReward(rewardId, memberId) {
        storeLogger.info('Redeeming reward', { rewardId, memberId });
        const reward = this.getRewardById(rewardId);
        const member = this.getMemberById(memberId);
        
        if (!reward) {
            storeLogger.error('Reward not found', { rewardId });
            return { success: false, message: 'Reward not found' };
        }
        
        if (!member) {
            storeLogger.error('Member not found', { memberId });
            return { success: false, message: 'Member not found' };
        }
        
        if (member.points < reward.requiredPoints) {
            storeLogger.warning('Insufficient points for redemption', {
                memberPoints: member.points,
                requiredPoints: reward.requiredPoints
            });
            return {
                success: false,
                message: `Not enough points! Need ${reward.requiredPoints}, have ${member.points}`
            };
        }
        
        // Deduct points
        this.updateMemberPoints(memberId, -reward.requiredPoints);
        this.addActivity(`${member.name} redeemed "${reward.name}" (-${reward.requiredPoints} stars)`);
        
        storeLogger.success('Reward redeemed successfully', { reward, member });
        return {
            success: true,
            message: `${member.name} redeemed ${reward.name}!`,
            member,
            reward
        };
    }

    // Statistics
    getStats() {
        const stats = {
            totalMembers: this.state.familyMembers.length,
            totalChores: this.state.chores.length,
            pendingChores: this.state.chores.filter(c => c.status === 'Pending').length,
            completedChores: this.state.chores.filter(c => c.status === 'Completed').length,
            totalPoints: this.state.familyMembers.reduce((sum, m) => sum + m.points, 0),
            topScorer: this.state.familyMembers.length > 0
                ? this.state.familyMembers.reduce((top, m) => m.points > top.points ? m : top)
                : null
        };
        storeLogger.debug('Stats calculated', stats);
        return stats;
    }

    // Photo Verification
    uploadChorePhoto(choreId, photoDataUrl) {
        storeLogger.info('Uploading chore photo', { choreId });
        const chore = this.getChoreById(choreId);
        if (chore) {
            chore.photoUrl = photoDataUrl;
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Photo uploaded', { choreId });
            return chore;
        }
        return null;
    }

    // Parent Approval
    approveChore(choreId, parentId) {
        storeLogger.info('Approving chore', { choreId, parentId });
        const chore = this.getChoreById(choreId);
        const parent = this.getMemberById(parentId);
        
        if (chore && parent && parent.role === 'parent') {
            chore.approvedBy = parentId;
            chore.status = 'Completed';
            
            if (chore.assignedTo) {
                const member = this.updateMemberPoints(chore.assignedTo, chore.points);
                if (member) {
                    this.addActivity(`${parent.name} approved "${chore.name}" for ${member.name} (+${chore.points} stars)`);
                }
            }
            
            // Award skill points
            if (chore.skill && chore.assignedTo) {
                this.addSkillPoint(chore.assignedTo, chore.skill);
            }
            
            // Update challenge progress
            this.updateChallengeProgress(chore);
            
            this.saveToStorage();
            this.notifyListeners();
            storeLogger.success('Chore approved', chore);
            return chore;
        }
        return null;
    }

    getPendingApprovals() {
        return this.state.chores.filter(c => c.requiresApproval && c.status === 'Pending' && c.photoUrl);
    }

    // Chore Templates
    getTemplates() {
        return this.state.choreTemplates || [];
    }

    addTemplate(templateData) {
        storeLogger.info('Adding chore template', templateData);
        if (!this.state.choreTemplates) this.state.choreTemplates = [];
        
        const newTemplate = {
            id: this.nextTemplateId++,
            name: templateData.name,
            tasks: templateData.tasks || [],
            points: templateData.points || 1,
            skill: templateData.skill || null
        };
        
        this.state.choreTemplates.push(newTemplate);
        this.saveToStorage();
        this.notifyListeners();
        storeLogger.success('Template added', newTemplate);
        return newTemplate;
    }

    createChoreFromTemplate(templateId, assignedTo, dueDate) {
        const template = this.state.choreTemplates.find(t => t.id === templateId);
        if (template) {
            return this.addChore({
                name: template.name,
                assignedTo,
                dueDate,
                points: template.points,
                skill: template.skill
            });
        }
        return null;
    }

    // Collaborative Chores
    addCollaborator(choreId, memberId) {
        const chore = this.getChoreById(choreId);
        const member = this.getMemberById(memberId);
        
        if (chore && member && !chore.collaborators.includes(memberId)) {
            chore.collaborators.push(memberId);
            this.addActivity(`${member.name} joined collaborative chore "${chore.name}"`);
            this.saveToStorage();
            this.notifyListeners();
            return chore;
        }
        return null;
    }

    completeCollaborativeChore(choreId) {
        const chore = this.getChoreById(choreId);
        if (chore && chore.collaborators.length > 0) {
            chore.status = 'Completed';
            
            // Award points to all collaborators
            const totalPoints = chore.points;
            const pointsPerPerson = Math.floor(totalPoints / (chore.collaborators.length + 1));
            
            // Main assignee
            if (chore.assignedTo) {
                this.updateMemberPoints(chore.assignedTo, pointsPerPerson);
            }
            
            // Collaborators
            chore.collaborators.forEach(memberId => {
                const member = this.updateMemberPoints(memberId, pointsPerPerson);
                if (member) {
                    this.addActivity(`${member.name} earned ${pointsPerPerson} stars from collaborative chore "${chore.name}"`);
                }
            });
            
            this.saveToStorage();
            this.notifyListeners();
            return chore;
        }
        return null;
    }

    // Skills & Badges
    addSkillPoint(memberId, skill) {
        const member = this.getMemberById(memberId);
        if (member) {
            if (!member.skills) member.skills = [];
            if (!member.skills.includes(skill)) {
                member.skills.push(skill);
                this.addActivity(`${member.name} earned the "${skill}" badge! 🏆`);
            }
            this.saveToStorage();
            this.notifyListeners();
            return member;
        }
        return null;
    }

    // Family Challenges
    getChallenges() {
        return this.state.challenges || [];
    }

    addChallenge(challengeData) {
        storeLogger.info('Adding family challenge', challengeData);
        if (!this.state.challenges) this.state.challenges = [];
        
        const newChallenge = {
            id: this.nextChallengeId++,
            name: challengeData.name,
            description: challengeData.description,
            goal: challengeData.goal,
            current: 0,
            reward: challengeData.reward,
            endDate: challengeData.endDate,
            participants: challengeData.participants || []
        };
        
        this.state.challenges.push(newChallenge);
        this.addActivity(`New family challenge: "${newChallenge.name}"! Complete ${newChallenge.goal} tasks to win ${newChallenge.reward} stars!`);
        this.saveToStorage();
        this.notifyListeners();
        storeLogger.success('Challenge added', newChallenge);
        return newChallenge;
    }

    updateChallengeProgress(chore) {
        if (!this.state.challenges) return;
        
        this.state.challenges.forEach(challenge => {
            if (challenge.participants.includes(chore.assignedTo) && chore.status === 'Completed') {
                challenge.current = Math.min(challenge.current + 1, challenge.goal);
                
                // Check if challenge is completed
                if (challenge.current >= challenge.goal) {
                    challenge.participants.forEach(memberId => {
                        this.updateMemberPoints(memberId, challenge.reward);
                    });
                    this.addActivity(`🎉 Challenge "${challenge.name}" completed! All participants earned ${challenge.reward} bonus stars!`);
                }
            }
        });
    }

    // Wish Lists
    getWishLists(memberId = null) {
        if (!this.state.wishLists) this.state.wishLists = [];
        return memberId 
            ? this.state.wishLists.filter(w => w.memberId === memberId)
            : this.state.wishLists;
    }

    addWishListItem(memberId, itemName, requiredPoints) {
        storeLogger.info('Adding wish list item', { memberId, itemName });
        if (!this.state.wishLists) this.state.wishLists = [];
        
        const member = this.getMemberById(memberId);
        const newWish = {
            id: this.nextWishId++,
            memberId,
            itemName,
            requiredPoints,
            currentProgress: member ? member.points : 0
        };
        
        this.state.wishLists.push(newWish);
        this.addActivity(`${member.name} added "${itemName}" to wish list (${requiredPoints} stars needed)`);
        this.saveToStorage();
        this.notifyListeners();
        storeLogger.success('Wish list item added', newWish);
        return newWish;
    }

    updateWishListProgress() {
        if (!this.state.wishLists) return;
        
        this.state.wishLists.forEach(wish => {
            const member = this.getMemberById(wish.memberId);
            if (member) {
                wish.currentProgress = member.points;
            }
        });
        this.saveToStorage();
    }

    redeemWishListItem(wishId) {
        const wish = this.state.wishLists.find(w => w.id === wishId);
        const member = this.getMemberById(wish.memberId);
        
        if (wish && member && member.points >= wish.requiredPoints) {
            this.updateMemberPoints(member.id, -wish.requiredPoints);
            this.addActivity(`${member.name} redeemed wish list item: "${wish.itemName}" 🎁`);
            this.state.wishLists = this.state.wishLists.filter(w => w.id !== wishId);
            this.saveToStorage();
            this.notifyListeners();
            return { success: true, member, wish };
        }
        return { success: false, message: 'Not enough points' };
    }

    // Recurring Chores
    processRecurringChores() {
        const today = new Date().toISOString().split('T')[0];
        
        this.state.chores.forEach(chore => {
            if (chore.recurring && chore.status === 'Completed' && chore.dueDate < today) {
                // Smart rotation: cycle to next family member
                let nextAssignee = chore.assignedTo;
                if (chore.rotateAmong && chore.rotateAmong.length > 1) {
                    const currentIdx = chore.rotateAmong.indexOf(chore.assignedTo);
                    const nextIdx = (currentIdx + 1) % chore.rotateAmong.length;
                    nextAssignee = chore.rotateAmong[nextIdx];
                    const nextMember = this.getMemberById(nextAssignee);
                    if (nextMember) {
                        this.addActivity(`🔄 "${chore.name}" rotated to ${nextMember.name}`);
                    }
                }

                const nextDate = this.calculateNextDueDate(chore.dueDate, chore.recurring);
                this.addChore({
                    name: chore.name,
                    assignedTo: nextAssignee,
                    dueDate: nextDate,
                    points: chore.points,
                    recurring: chore.recurring,
                    rotateAmong: chore.rotateAmong || [],
                    collaborators: chore.collaborators,
                    requiresPhoto: chore.requiresPhoto,
                    requiresApproval: chore.requiresApproval,
                    skill: chore.skill
                });
            }
        });
    }

    calculateNextDueDate(currentDate, frequency) {
        const date = new Date(currentDate);
        switch (frequency) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                break;
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
        }
        return date.toISOString().split('T')[0];
    }

    // Chore Suggestions
    getSuggestedChores(memberId) {
        const member = this.getMemberById(memberId);
        if (!member) return [];
        
        const suggestions = [];
        const memberSkills = member.skills || [];
        
        // Suggest chores based on skills
        const skillSuggestions = {
            'cleaning': ['Dust shelves', 'Clean bathroom', 'Mop floors'],
            'cooking': ['Prepare breakfast', 'Help with dinner', 'Bake cookies'],
            'organization': ['Organize closet', 'Sort mail', 'Clean garage'],
            'petCare': ['Walk the dog', 'Clean litter box', 'Groom pet'],
            'gardening': ['Pull weeds', 'Plant flowers', 'Rake leaves'],
            'homework': ['Study for test', 'Complete assignments', 'Read for 30 min']
        };
        
        memberSkills.forEach(skill => {
            if (skillSuggestions[skill]) {
                skillSuggestions[skill].forEach(choreName => {
                    suggestions.push({
                        name: choreName,
                        skill: skill,
                        points: Math.floor(Math.random() * 3) + 2
                    });
                });
            }
        });
        
        return suggestions.slice(0, 5);
    }
}

// Create and export singleton instance
const store = new Store();

// Process recurring chores daily
setInterval(() => {
    store.processRecurringChores();
}, 24 * 60 * 60 * 1000); // Check daily

export default store;
