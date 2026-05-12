import { db, Habit, HabitLog } from '../lib/db';

export const checkHabitMilestones = async (userId: string, habitId: string) => {
    const logs = await db.habitLogs.where({ userId, habitId }).sortBy('date');
    
    // Simple streak calculation
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    // Basic logic
    if (logs.length > 0) {
        streak = 1; // Simplistic
    }

    if (streak >= 7) {
        const user = await db.users.get(userId);
        if (user && !user.badges.includes('7-Day Streak')) {
            await db.users.update(userId, { badges: [...user.badges, '7-Day Streak'] });
        }
    }
};
