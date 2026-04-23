/**
 * AI SUGGESTIONS ENGINE
 * Provides smart, context-aware suggestions for chores and rewards.
 * Considers family composition (ages/roles), existing chores,
 * time of day, day of week, and skill categories.
 */

import store from '../store.js?v=7.0.0';

// ─── Chore Suggestion Database ───────────────────────────────────

const CHORE_DATABASE = {
    kitchen: {
        icon: '🍽️',
        label: 'Kitchen',
        items: [
            { name: 'Wash the dishes', points: 3, skill: 'cleaning', recurring: 'daily' },
            { name: 'Wipe kitchen counters', points: 2, skill: 'cleaning', recurring: 'daily' },
            { name: 'Sweep kitchen floor', points: 2, skill: 'cleaning', recurring: 'daily' },
            { name: 'Mop kitchen floor', points: 3, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Empty dishwasher', points: 2, skill: 'cleaning', recurring: 'daily' },
            { name: 'Load dishwasher', points: 2, skill: 'cleaning', recurring: 'daily' },
            { name: 'Clean the microwave', points: 2, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Organize pantry', points: 4, skill: 'organization', recurring: null },
            { name: 'Take out trash', points: 2, skill: 'cleaning', recurring: 'daily' },
            { name: 'Clean the fridge', points: 4, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Help prepare dinner', points: 4, skill: 'cooking', recurring: 'daily' },
            { name: 'Set the table', points: 1, skill: 'organization', recurring: 'daily' },
            { name: 'Clear the table', points: 1, skill: 'cleaning', recurring: 'daily' },
        ]
    },
    bedroom: {
        icon: '🛏️',
        label: 'Bedroom',
        items: [
            { name: 'Make the bed', points: 1, skill: 'organization', recurring: 'daily' },
            { name: 'Put away clothes', points: 2, skill: 'organization', recurring: 'daily' },
            { name: 'Organize closet', points: 4, skill: 'organization', recurring: 'monthly' },
            { name: 'Dust bedroom furniture', points: 2, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Vacuum bedroom', points: 3, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Change bed sheets', points: 3, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Organize toys', points: 2, skill: 'organization', recurring: 'daily' },
            { name: 'Clean under the bed', points: 3, skill: 'cleaning', recurring: 'monthly' },
        ]
    },
    bathroom: {
        icon: '🚿',
        label: 'Bathroom',
        items: [
            { name: 'Clean the toilet', points: 4, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Wipe bathroom sink', points: 2, skill: 'cleaning', recurring: 'daily' },
            { name: 'Clean bathroom mirror', points: 2, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Scrub the bathtub', points: 4, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Hang up towels', points: 1, skill: 'organization', recurring: 'daily' },
            { name: 'Replace toilet paper', points: 1, skill: 'organization', recurring: null },
            { name: 'Mop bathroom floor', points: 3, skill: 'cleaning', recurring: 'weekly' },
        ]
    },
    livingRoom: {
        icon: '🛋️',
        label: 'Living Room',
        items: [
            { name: 'Vacuum living room', points: 3, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Dust shelves & surfaces', points: 2, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Fluff couch cushions', points: 1, skill: 'organization', recurring: 'daily' },
            { name: 'Tidy up living room', points: 2, skill: 'organization', recurring: 'daily' },
            { name: 'Water indoor plants', points: 2, skill: 'gardening', recurring: 'weekly' },
            { name: 'Wipe down TV & electronics', points: 2, skill: 'cleaning', recurring: 'weekly' },
        ]
    },
    outdoor: {
        icon: '🌿',
        label: 'Outdoor',
        items: [
            { name: 'Water the garden', points: 2, skill: 'gardening', recurring: 'daily' },
            { name: 'Mow the lawn', points: 5, skill: 'gardening', recurring: 'weekly' },
            { name: 'Rake leaves', points: 4, skill: 'gardening', recurring: 'weekly' },
            { name: 'Pull weeds', points: 3, skill: 'gardening', recurring: 'weekly' },
            { name: 'Sweep the porch', points: 2, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Take out recycling', points: 2, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Bring in the mail', points: 1, skill: 'organization', recurring: 'daily' },
            { name: 'Walk the dog', points: 3, skill: 'petCare', recurring: 'daily' },
        ]
    },
    pets: {
        icon: '🐾',
        label: 'Pet Care',
        items: [
            { name: 'Feed the pets', points: 2, skill: 'petCare', recurring: 'daily' },
            { name: 'Refill water bowl', points: 1, skill: 'petCare', recurring: 'daily' },
            { name: 'Walk the dog', points: 3, skill: 'petCare', recurring: 'daily' },
            { name: 'Clean litter box', points: 3, skill: 'petCare', recurring: 'daily' },
            { name: 'Brush the pet', points: 2, skill: 'petCare', recurring: 'weekly' },
            { name: 'Clean pet toys', points: 2, skill: 'petCare', recurring: 'monthly' },
            { name: 'Give pet a bath', points: 5, skill: 'petCare', recurring: 'monthly' },
        ]
    },
    laundry: {
        icon: '👕',
        label: 'Laundry',
        items: [
            { name: 'Sort dirty laundry', points: 2, skill: 'organization', recurring: 'weekly' },
            { name: 'Start a load of laundry', points: 2, skill: 'cleaning', recurring: 'weekly' },
            { name: 'Fold clean laundry', points: 3, skill: 'organization', recurring: 'weekly' },
            { name: 'Put away laundry', points: 2, skill: 'organization', recurring: 'weekly' },
            { name: 'Iron clothes', points: 3, skill: 'cleaning', recurring: 'weekly' },
        ]
    },
    homework: {
        icon: '📚',
        label: 'Homework & Learning',
        items: [
            { name: 'Complete homework', points: 3, skill: 'homework', recurring: 'daily' },
            { name: 'Read for 30 minutes', points: 3, skill: 'homework', recurring: 'daily' },
            { name: 'Practice an instrument', points: 3, skill: 'homework', recurring: 'daily' },
            { name: 'Study for a test', points: 4, skill: 'homework', recurring: null },
            { name: 'Organize school bag', points: 2, skill: 'organization', recurring: 'daily' },
            { name: 'Clean study desk', points: 2, skill: 'organization', recurring: 'weekly' },
        ]
    }
};


// ─── Reward Suggestion Database ──────────────────────────────────

const REWARD_DATABASE = {
    screenTime: {
        icon: '📱',
        label: 'Screen Time',
        items: [
            { name: '30 min extra screen time', points: 5, description: '30 extra minutes of tablet, phone, or TV' },
            { name: '1 hour extra screen time', points: 10, description: 'A full extra hour of screen time' },
            { name: 'Movie night pick', points: 8, description: 'Choose the family movie this week' },
            { name: 'New game download', points: 20, description: 'Download a new game or app' },
            { name: 'YouTube time', points: 5, description: '30 minutes of YouTube' },
        ]
    },
    treats: {
        icon: '🍦',
        label: 'Treats & Food',
        items: [
            { name: 'Ice cream trip', points: 10, description: 'Visit the ice cream shop' },
            { name: 'Choose dinner tonight', points: 8, description: 'Pick what the family eats for dinner' },
            { name: 'Bake cookies together', points: 10, description: 'Baking session with a parent' },
            { name: 'Fast food meal', points: 12, description: 'A meal from your favorite restaurant' },
            { name: 'Candy or snack of choice', points: 5, description: 'Pick any candy or snack at the store' },
            { name: 'Special breakfast', points: 8, description: 'Pancakes, waffles, or your favorite breakfast' },
        ]
    },
    activities: {
        icon: '🎯',
        label: 'Activities',
        items: [
            { name: 'Trip to the park', points: 8, description: 'Family outing to the park' },
            { name: 'Playdate with a friend', points: 10, description: 'Invite a friend over or go to their house' },
            { name: 'Board game night', points: 5, description: 'Family board game of your choice' },
            { name: 'Bike ride adventure', points: 8, description: 'Go on a bike ride together' },
            { name: 'Swimming trip', points: 12, description: 'Visit the pool or beach' },
            { name: 'Craft project', points: 8, description: 'Art or craft supplies and time to create' },
            { name: 'Library visit', points: 5, description: 'Browse and pick new books' },
        ]
    },
    money: {
        icon: '💰',
        label: 'Allowance & Money',
        items: [
            { name: '$1 allowance', points: 5, description: 'One dollar cash reward' },
            { name: '$5 allowance', points: 20, description: 'Five dollar cash reward' },
            { name: '$10 allowance', points: 40, description: 'Ten dollar cash reward' },
            { name: 'Savings deposit', points: 15, description: 'Money added to savings account' },
            { name: 'Gift card', points: 30, description: 'Gift card to your favorite store' },
        ]
    },
    privileges: {
        icon: '⭐',
        label: 'Special Privileges',
        items: [
            { name: 'Stay up 30 min late', points: 8, description: 'Extended bedtime by 30 minutes' },
            { name: 'Stay up 1 hour late', points: 15, description: 'Extended bedtime by one hour' },
            { name: 'Skip one chore', points: 10, description: 'Free pass to skip any one chore' },
            { name: 'No chores day', points: 25, description: 'An entire day with no chores!' },
            { name: 'Pick weekend activity', points: 12, description: 'Choose what the family does this weekend' },
            { name: 'Sleepover', points: 20, description: 'Host or go to a sleepover' },
            { name: 'Redecorate room', points: 15, description: 'New poster, fairy lights, or decor item' },
        ]
    },
    family: {
        icon: '👨‍👩‍👧‍👦',
        label: 'Family Time',
        items: [
            { name: '1-on-1 time with parent', points: 10, description: 'Special one-on-one activity with mom or dad' },
            { name: 'Family game night', points: 8, description: 'Everyone plays together' },
            { name: 'Cook together', points: 10, description: 'Make a recipe together as a family' },
            { name: 'Storytime extra', points: 3, description: 'Extra story at bedtime' },
            { name: 'Dance party', points: 3, description: 'Turn up the music and dance!' },
        ]
    }
};


// ─── Smart Suggestion Logic ─────────────────────────────────────

/**
 * Get AI-suggested chores, filtered to avoid duplicates and sorted by relevance.
 * @returns {Object} Categories with filtered suggestions
 */
export function getSmartChoreSuggestions() {
    const existingChores = store.getChores().map(c => c.name.toLowerCase());
    const members = store.getMembers();
    const hasChildren = members.some(m => m.role === 'child');
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay(); // 0=Sun

    const result = {};

    for (const [catKey, category] of Object.entries(CHORE_DATABASE)) {
        // Filter out chores that already exist
        const available = category.items.filter(
            item => !existingChores.includes(item.name.toLowerCase())
        );

        if (available.length === 0) continue;

        // Score each suggestion for relevance
        const scored = available.map(item => {
            let score = 5; // base

            // Time-of-day relevance
            if (hour < 12 && (item.name.includes('bed') || item.name.includes('breakfast') || item.name.includes('school'))) score += 3;
            if (hour >= 17 && (item.name.includes('dinner') || item.name.includes('table'))) score += 3;

            // Weekend boost for bigger chores
            if ((dayOfWeek === 0 || dayOfWeek === 6) && item.points >= 4) score += 2;

            // Homework items only if there are children
            if (catKey === 'homework' && !hasChildren) score -= 10;

            // Daily chores are higher priority
            if (item.recurring === 'daily') score += 1;

            return { ...item, _score: score };
        });

        // Sort by score descending, take top items per category
        scored.sort((a, b) => b._score - a._score);
        const top = scored.filter(s => s._score > 0).slice(0, 6);

        if (top.length > 0) {
            result[catKey] = {
                icon: category.icon,
                label: category.label,
                items: top
            };
        }
    }

    return result;
}

/**
 * Get AI-suggested rewards, filtered to avoid duplicates.
 * @returns {Object} Categories with filtered suggestions
 */
export function getSmartRewardSuggestions() {
    const existingRewards = store.getRewards().map(r => r.name.toLowerCase());

    const result = {};

    for (const [catKey, category] of Object.entries(REWARD_DATABASE)) {
        const available = category.items.filter(
            item => !existingRewards.includes(item.name.toLowerCase())
        );

        if (available.length === 0) continue;

        result[catKey] = {
            icon: category.icon,
            label: category.label,
            items: available
        };
    }

    return result;
}

/**
 * Render suggestion chips HTML for chores.
 * @returns {string} HTML string
 */
export function renderChoreSuggestionsHTML() {
    const suggestions = getSmartChoreSuggestions();
    const categories = Object.entries(suggestions);

    if (categories.length === 0) {
        return `<div class="ai-suggestions-empty">
            <span>✨</span> <span style="color:var(--text-secondary);font-size:13px">All common chores already added!</span>
        </div>`;
    }

    let html = `<div class="ai-suggestions">
        <div class="ai-suggestions-header">
            <span class="ai-sparkle">✨</span>
            <span class="ai-suggestions-title">Quick Add Suggestions</span>
        </div>
        <div class="ai-categories">`;

    for (const [catKey, cat] of categories) {
        html += `
            <div class="ai-category">
                <div class="ai-category-label">${cat.icon} ${cat.label}</div>
                <div class="ai-chips">`;

        for (const item of cat.items) {
            const data = encodeURIComponent(JSON.stringify(item));
            html += `<button type="button" class="ai-chip ai-chore-chip" data-suggestion="${data}">
                        <span class="ai-chip-name">${item.name}</span>
                        <span class="ai-chip-pts">${item.points}⭐</span>
                     </button>`;
        }

        html += `</div></div>`;
    }

    html += `</div></div>`;
    return html;
}

/**
 * Render suggestion chips HTML for rewards.
 * @returns {string} HTML string
 */
export function renderRewardSuggestionsHTML() {
    const suggestions = getSmartRewardSuggestions();
    const categories = Object.entries(suggestions);

    if (categories.length === 0) {
        return `<div class="ai-suggestions-empty">
            <span>✨</span> <span style="color:var(--text-secondary);font-size:13px">All common rewards already added!</span>
        </div>`;
    }

    let html = `<div class="ai-suggestions">
        <div class="ai-suggestions-header">
            <span class="ai-sparkle">✨</span>
            <span class="ai-suggestions-title">Quick Add Suggestions</span>
        </div>
        <div class="ai-categories">`;

    for (const [catKey, cat] of categories) {
        html += `
            <div class="ai-category">
                <div class="ai-category-label">${cat.icon} ${cat.label}</div>
                <div class="ai-chips">`;

        for (const item of cat.items) {
            const data = encodeURIComponent(JSON.stringify(item));
            html += `<button type="button" class="ai-chip ai-reward-chip" data-suggestion="${data}">
                        <span class="ai-chip-name">${item.name}</span>
                        <span class="ai-chip-pts">${item.points}⭐</span>
                     </button>`;
        }

        html += `</div></div>`;
    }

    html += `</div></div>`;
    return html;
}
