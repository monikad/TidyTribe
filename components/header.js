/**
 * HEADER COMPONENT
 * Displays the app title and tagline
 */

import { uiLogger } from '../utils/logger.js';

export function renderHeader() {
    uiLogger.lifecycle('Rendering header');
    
    const header = document.getElementById('header');
    if (!header) {
        uiLogger.error('Header element not found');
        return;
    }

    header.innerHTML = `
        <h1>TidyTribe</h1>
        <p>Organize, Track, and Reward Household Chores</p>
    `;
    
    uiLogger.success('Header rendered successfully');
}
