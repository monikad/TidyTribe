/**
 * CELEBRATIONS — Visual delight effects
 * ──────────────────────────────────────
 * Lightweight confetti + level-up animations
 * triggered when completing chores or earning badges.
 */

const COLORS = ['#89B5E4', '#8FD98E', '#FFB366', '#C9A5D7', '#FFB3D9', '#FFD966', '#80D6D6', '#FF9999'];

/**
 * Burst confetti across the screen.
 * Pure DOM – no canvas, no library, CSS-animated.
 */
export function showConfetti() {
    const container = document.createElement('div');
    container.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(container);

    const count = 45;

    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        const size = 6 + Math.random() * 8;
        const isCircle = Math.random() > 0.5;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 1.4 + Math.random() * 1.2;
        const drift = -30 + Math.random() * 60;  // horizontal drift px

        piece.style.cssText = `
            position:absolute;
            top:-20px;
            left:${left}%;
            width:${size}px;
            height:${size}px;
            background:${color};
            border-radius:${isCircle ? '50%' : '2px'};
            opacity:0;
            --drift:${drift}px;
            animation:confetti-fall ${duration}s ease-in ${delay}s forwards;
        `;
        container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 3200);
}

/**
 * Show a small "+X ⭐" floating text near an element.
 * @param {HTMLElement} anchor - element to float near
 * @param {number} points
 */
export function showPointsFloat(anchor, points) {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.textContent = `+${points} ⭐`;
    el.style.cssText = `
        position:fixed;
        left:${rect.right - 40}px;
        top:${rect.top}px;
        font-size:16px;
        font-weight:700;
        color:var(--ios-orange);
        pointer-events:none;
        z-index:9999;
        animation:float-up .9s ease-out forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}
