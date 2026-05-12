import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppContext } from '../lib/context';
import { format } from 'date-fns';

export const useHabitReminders = () => {
  const { user } = useAppContext();
  
  const habits = useLiveQuery(
    () => user ? db.habits.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  useEffect(() => {
    if (!habits || habits.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const today = format(now, 'yyyy-MM-dd');
      const currentDayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday

      habits.forEach(habit => {
        // If reminderTime matches, check if reminderDays is populated and includes today
        if (habit.reminderTime === currentTime) {
          const isEnabledForToday = !habit.reminderDays || habit.reminderDays.length === 0 || habit.reminderDays.includes(currentDayOfWeek);
          
          if (isEnabledForToday) {
            const storageKey = `notif-${habit.id}-${today}`;
            const alreadyNotified = localStorage.getItem(storageKey);

            if (!alreadyNotified) {
              if (Notification.permission === 'granted') {
                new Notification(`Time for ${habit.title}!`, {
                  body: `Stay consistent with your ${habit.category || 'daily'} habit.`,
                });
                localStorage.setItem(storageKey, 'true');
              }
            }
          }
        }
      });
    };

    const intervalId = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [habits]);
};
