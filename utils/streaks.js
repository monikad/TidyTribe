/**
 * STREAKS ENGINE
 * ──────────────
 * Tracks per-member chore completion streaks and generates
 * weekly household performance reports.
 *
 * A "streak" = consecutive calendar days where a member
 * completed at least one chore. Missing a day resets it.
 */

/* ─── Streak Tracking ─── */

/**
 * Update a member's streak after completing a chore.
 * Call this every time a chore is marked complete.
 * @param {object} member - the family member object
 * @returns {object} updated streakData { current, best, lastDate }
 */
export function updateStreak(member) {
    const today = _todayStr();
    const streak = member.streakData
        ? { ...member.streakData }
        : { current: 0, best: 0, lastDate: null };

    // Already counted today — nothing to do
    if (streak.lastDate === today) return streak;

    const yesterday = _dayOffset(-1);

    if (streak.lastDate === yesterday) {
        // Consecutive day — extend streak
        streak.current += 1;
    } else {
        // Gap detected — start fresh
        streak.current = 1;
    }

    streak.best = Math.max(streak.best, streak.current);
    streak.lastDate = today;

    return streak;
}

/**
 * Check if a member's streak is still alive today
 * (either they completed something today, or yesterday — within grace).
 */
export function isStreakAlive(member) {
    const d = member.streakData?.lastDate;
    if (!d) return false;
    return d === _todayStr() || d === _dayOffset(-1);
}

/* ─── Display Helpers ─── */

/**
 * Get the visual representation for a streak count.
 * @param {number} count
 * @returns {{ emoji: string, label: string, color: string }}
 */
export function getStreakDisplay(count) {
    if (count >= 30) return { emoji: '🌟', label: 'Legendary',  color: '#FFD700' };
    if (count >= 14) return { emoji: '🔥', label: 'On Fire',    color: '#FF6B35' };
    if (count >= 7)  return { emoji: '💪', label: 'Strong',     color: '#89B5E4' };
    if (count >= 3)  return { emoji: '✨', label: 'Building',   color: '#C9A5D7' };
    if (count >= 1)  return { emoji: '⚡', label: 'Started',    color: '#8FD98E' };
    return              { emoji: '',   label: 'No streak', color: '#AEAEB2' };
}

/* ─── Weekly Report ─── */

/**
 * Generate a weekly household performance report.
 * @param {Array} members
 * @param {Array} chores
 * @param {Array} activityLog
 * @returns {object} report
 */
export function generateWeeklyReport(members, chores, activityLog) {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    // Filter this week's log entries
    const weekLog = (activityLog || []).filter(a => a.timestamp >= weekAgoISO);
    const completions = weekLog.filter(a => a.activity.includes('completed'));

    // Per-member stats
    const memberStats = members.map(m => {
        const mine = completions.filter(a => a.activity.startsWith(m.name));
        return {
            id: m.id,
            name: m.name,
            completedThisWeek: mine.length,
            streak: m.streakData?.current || 0,
            points: m.points
        };
    }).sort((a, b) => b.completedThisWeek - a.completedThisWeek);

    // Totals
    const totalChores = chores.length;
    const doneChores = chores.filter(c => c.status === 'Completed').length;
    const pendingCount = chores.filter(c => c.status === 'Pending').length;
    const completionRate = totalChores > 0
        ? Math.round((doneChores / totalChores) * 100)
        : 0;

    // Best streaker
    const bestStreaker = [...members].sort((a, b) =>
        (b.streakData?.current || 0) - (a.streakData?.current || 0)
    )[0];

    return {
        period: `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        totalDone: completions.length,
        pendingCount,
        completionRate,
        memberStats,
        bestStreaker: bestStreaker
            ? { name: bestStreaker.name, streak: bestStreaker.streakData?.current || 0 }
            : null,
        topContributor: memberStats[0] || null
    };
}

/* ─── Internal Helpers ─── */

function _todayStr() {
    return new Date().toISOString().split('T')[0];
}

function _dayOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}
