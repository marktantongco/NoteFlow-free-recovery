import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../lib/context';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { Play, Pause, CheckCircle2, Headphones, Clock, Bell } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const SESSIONS = [
  { id: 'm1', title: 'Urge Surfing', duration: '5 min', description: 'A brief meditation to ride out cravings without acting on them.', category: 'Craving Management' },
  { id: 'm2', title: 'Body Scan', duration: '10 min', description: 'Release physical tension and ground yourself in the present moment.', category: 'Stress Reduction' },
  { id: 'm3', title: 'Mindful Breathing', duration: '3 min', description: 'Quick reset for moments of high anxiety or stress.', category: 'Mindfulness' },
  { id: 'm4', title: 'Self-Compassion', duration: '8 min', description: 'Cultivate kindness towards yourself during difficult times.', category: 'Emotional Regulation' },
];

export const MeditationTab = () => {
  const { user } = useAppContext();
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderFreq, setReminderFreq] = useState('daily');
  const [showReminderSaved, setShowReminderSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('meditationReminder');
    if (saved) {
      const parsed = JSON.parse(saved);
      setReminderTime(parsed.time);
      setReminderFreq(parsed.freq);
    }
  }, []);

  const saveReminder = () => {
    localStorage.setItem('meditationReminder', JSON.stringify({ time: reminderTime, freq: reminderFreq }));
    setShowReminderSaved(true);
    setTimeout(() => setShowReminderSaved(false), 3000);
  };

  const completions = useLiveQuery(
    () => user ? db.meditations.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const togglePlay = (id: string) => {
    if (activeSession === id) {
      setIsPlaying(!isPlaying);
    } else {
      setActiveSession(id);
      setIsPlaying(true);
    }
  };

  const markCompleted = async (id: string) => {
    if (!user) return;
    await db.meditations.add({
      id: uuidv4(),
      userId: user.id,
      sessionId: id,
      completedAt: new Date().toISOString()
    });
    setIsPlaying(false);
    setActiveSession(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Guided Meditation</h2>
      </div>

      <div className="bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/20 text-[var(--color-primary-800)] dark:text-[var(--color-primary-400)] p-6 rounded-2xl border border-[var(--color-primary-200)] dark:border-[var(--color-primary-800)] flex flex-col md:flex-row items-start gap-4 justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-800)] rounded-full flex items-center justify-center shrink-0">
            <Headphones size={24} className="text-[var(--color-primary-600)] dark:text-[var(--color-primary-300)]" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Find Your Center</h3>
            <p className="text-sm opacity-90">Take a few minutes to ground yourself. These short sessions are designed to help you manage cravings, reduce stress, and stay present.</p>
          </div>
        </div>
        
        <div className="bg-white/50 dark:bg-neutral-900/50 p-4 rounded-xl border border-[var(--color-primary-200)] dark:border-[var(--color-primary-800)] w-full md:w-auto shrink-0 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Bell size={16} />
            Set Reminder
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="time" 
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="px-2 py-1 rounded border border-[var(--color-primary-200)] dark:border-[var(--color-primary-700)] bg-white dark:bg-neutral-800 text-sm outline-none"
            />
            <select 
              value={reminderFreq}
              onChange={(e) => setReminderFreq(e.target.value)}
              className="px-2 py-1 rounded border border-[var(--color-primary-200)] dark:border-[var(--color-primary-700)] bg-white dark:bg-neutral-800 text-sm outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <button 
              onClick={saveReminder}
              className="px-3 py-1 bg-[var(--color-primary-600)] text-white rounded text-sm font-medium hover:bg-[var(--color-primary-700)] transition-colors"
            >
              Save
            </button>
          </div>
          {showReminderSaved && <p className="text-xs text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">Reminder saved!</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SESSIONS.map((session) => {
          const isCompleted = completions?.some(c => c.sessionId === session.id);
          const isActive = activeSession === session.id;

          return (
            <motion.div
              key={session.id}
              className={`bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border p-6 transition-all ${isActive ? 'border-[var(--color-primary-500)] ring-1 ring-[var(--color-primary-500)]' : 'border-neutral-200 dark:border-neutral-700 hover:border-[var(--color-primary-300)]'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">{session.category}</span>
                  <h3 className="text-lg font-semibold mt-1">{session.title}</h3>
                </div>
                {isCompleted && (
                  <div title="Completed">
                    <CheckCircle2 size={20} className="text-[var(--color-primary-500)]" />
                  </div>
                )}
              </div>
              
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{session.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
                  <Clock size={16} />
                  {session.duration}
                </div>
                
                <div className="flex items-center gap-2">
                  {isActive && (
                    <button 
                      onClick={() => markCompleted(session.id)}
                      className="px-3 py-1.5 text-xs font-medium text-[var(--color-primary-700)] bg-[var(--color-primary-100)] hover:bg-[var(--color-primary-200)] dark:text-[var(--color-primary-300)] dark:bg-[var(--color-primary-900)]/50 rounded-lg transition-colors"
                    >
                      Mark Done
                    </button>
                  )}
                  <button 
                    onClick={() => togglePlay(session.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'}`}
                  >
                    {isActive && isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
                  </button>
                </div>
              </div>

              {isActive && (
                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      className="bg-[var(--color-primary-500)] h-full"
                      initial={{ width: '0%' }}
                      animate={{ width: isPlaying ? '100%' : '0%' }}
                      transition={{ duration: parseInt(session.duration) * 60, ease: 'linear' }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
