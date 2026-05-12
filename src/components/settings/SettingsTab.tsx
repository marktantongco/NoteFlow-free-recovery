import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../lib/context';
import { db } from '../../lib/db';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Download, Upload, Trash2, Moon, Sun, Bell, Palette, X, AlertCircle, RefreshCw, Cloud, Trophy, Star } from 'lucide-react';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { syncService } from '../../services/SyncService';
import { Milestones } from '../shared/Milestones';

const THEMES = [
  { id: 'emerald', name: 'Emerald', color: '#10b981' },
  { id: 'indigo', name: 'Indigo', color: '#6366f1' },
  { id: 'rose', name: 'Rose', color: '#f43f5e' },
  { id: 'blue', name: 'Blue', color: '#3b82f6' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PHP'];

export const SettingsTab = () => {
  const { user, logout } = useAppContext();
  const [themeMode, setThemeMode] = useState(() => {
    if (document.documentElement.classList.contains('high-contrast')) return 'high-contrast';
    if (document.documentElement.classList.contains('dark')) return 'dark';
    return 'light';
  });
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('themeColor') || 'emerald');
  const [currency, setCurrency] = useState(user?.currency || 'USD');

  const updateCurrency = async (newCurrency: string) => {
    if (!user) return;
    setCurrency(newCurrency);
    await db.users.update(user.id, { currency: newCurrency });
  };
  const [showExportReminder, setShowExportReminder] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('lastSyncTime');
    if (stored) setLastSyncTime(stored);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const time = await syncService.syncData();
      if (time) setLastSyncTime(time);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const lastDismissed = localStorage.getItem('lastExportReminderDismissed');
    if (!lastDismissed) {
      setShowExportReminder(true);
    } else {
      const daysSince = differenceInDays(new Date(), new Date(lastDismissed));
      if (daysSince >= 7) {
        setShowExportReminder(true);
      }
    }
  }, []);

  const dismissReminder = () => {
    localStorage.setItem('lastExportReminderDismissed', new Date().toISOString());
    setShowExportReminder(false);
  };

  const changeThemeMode = (mode: string) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    if (mode === 'dark') root.classList.add('dark');
    if (mode === 'high-contrast') root.classList.add('high-contrast');
    setThemeMode(mode);
    localStorage.setItem('themeMode', mode);
  };

  const changeAccentColor = (themeId: string) => {
    setActiveTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('themeColor', themeId);
  };

  const exportData = async () => {
    if (!user) return;
    const entries = await db.entries.where('userId').equals(user.id).toArray();
    const logs = await db.logs.where('userId').equals(user.id).toArray();
    const notes = await db.notes.where('userId').equals(user.id).toArray();
    
    const data = { entries, logs, notes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noteflow-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = async (type: 'journal' | 'logs') => {
    if (!user) return;
    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    if (type === 'journal') {
      data = await db.entries.where('userId').equals(user.id).toArray();
      filename = `noteflow-journal-${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['date', 'mood', 'moodLabel', 'cravingLevel', 'triggers', 'copingStrategies', 'notes'];
    } else {
      data = await db.logs.where('userId').equals(user.id).toArray();
      filename = `noteflow-logs-${new Date().toISOString().split('T')[0]}.csv`;
      headers = ['timestamp', 'substance', 'quantity', 'unit', 'location', 'context', 'emotions'];
    }

    if (data.length === 0) {
      alert(`No ${type} data to export.`);
      return;
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => {
        let val = row[fieldName];
        if (Array.isArray(val)) val = val.join(';');
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearData = async () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      await db.entries.where('userId').equals(user.id).delete();
      await db.logs.where('userId').equals(user.id).delete();
      await db.notes.where('userId').equals(user.id).delete();
      alert('Data cleared successfully.');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
      </div>

      <AnimatePresence>
        {showExportReminder && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-start gap-4"
          >
            <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg text-orange-600 dark:text-orange-400 shrink-0">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Backup Reminder</h3>
              <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">It's been a while since you exported your data. We recommend backing up your journal entries and analytics regularly.</p>
            </div>
            <button 
              onClick={dismissReminder}
              className="text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 p-1"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-yellow-600 dark:text-yellow-400">
                <Trophy size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Achievements</h3>
                <p className="text-sm text-neutral-500">Your recovery milestones and badges</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] font-bold">
                <Star size={16} fill="currentColor" />
                <span>{user?.points} pts</span>
              </div>
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Total Progress</p>
            </div>
          </div>

          <Milestones userBadges={user?.badges || []} />
        </div>

        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings size={20} className="text-[var(--color-primary-500)]" />
            Preferences
          </h3>
          
          <div className="space-y-6">
            <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6 mb-6">
              <h4 className="font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Recovery Baseline</h4>
              
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <label className="text-sm font-medium">Recovery Start Date</label>
                    <p className="text-xs text-neutral-500">Used for biochemical timeline & milestones</p>
                  </div>
                  <input 
                    type="date" 
                    value={user?.recoveryStartDate || ''}
                    onChange={(e) => {
                      if (user) db.users.update(user.id, { recoveryStartDate: e.target.value });
                    }}
                    className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none text-sm"
                  />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <label className="text-sm font-medium">Daily Spend on Substances</label>
                    <p className="text-xs text-neutral-500">Used to calculate total money saved</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={currency}
                      onChange={(e) => updateCurrency(e.target.value)}
                      className="px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none text-sm"
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={user?.dailySpend || ''}
                      onChange={(e) => {
                        if (user) db.users.update(user.id, { dailySpend: parseFloat(e.target.value) || 0 });
                      }}
                      className="w-24 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none text-sm text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme Mode</p>
                <p className="text-sm text-neutral-500">Select your preferred visual style</p>
              </div>
              <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <button 
                  onClick={() => changeThemeMode('light')}
                  className={`p-2 rounded-lg transition-colors ${themeMode === 'light' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                  title="Light Mode"
                >
                  <Sun size={18} />
                </button>
                <button 
                  onClick={() => changeThemeMode('dark')}
                  className={`p-2 rounded-lg transition-colors ${themeMode === 'dark' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                  title="Dark Mode"
                >
                  <Moon size={18} />
                </button>
                <button 
                  onClick={() => changeThemeMode('high-contrast')}
                  className={`p-2 rounded-lg transition-colors ${themeMode === 'high-contrast' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                  title="High Contrast"
                >
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-current flex overflow-hidden">
                    <div className="w-1/2 h-full bg-current"></div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Accent Color</p>
                <p className="text-sm text-neutral-500">Choose your app's primary color</p>
              </div>
              <div className="flex items-center gap-2">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => changeAccentColor(theme.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${activeTheme === theme.id ? 'scale-110 ring-2 ring-offset-2 ring-neutral-400 dark:ring-neutral-500 dark:ring-offset-neutral-800' : 'hover:scale-105'}`}
                    style={{ backgroundColor: theme.color }}
                    title={theme.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Daily Reminders</p>
                <p className="text-sm text-neutral-500">Push notifications for check-ins</p>
              </div>
              <button className="p-2 rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-400)] transition-colors">
                <Bell size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cloud size={20} className="text-[var(--color-primary-500)]" />
            Cloud Sync
          </h3>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sync Data</p>
              <p className="text-sm text-neutral-500">
                {lastSyncTime 
                  ? `Last synced ${formatDistanceToNow(new Date(lastSyncTime))} ago` 
                  : 'Not synced yet'}
              </p>
            </div>
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download size={20} className="text-[var(--color-primary-500)]" />
            Data Management
          </h3>
          
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">Your data is stored locally on your device. Export it to back it up or move it to another device.</p>
            
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-400)] hover:bg-[var(--color-primary-100)] dark:hover:bg-[var(--color-primary-900)]/50 rounded-xl font-medium transition-colors"
              >
                <Download size={18} />
                Export JSON
              </button>
              
              <button 
                onClick={() => exportCSV('journal')}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-xl font-medium transition-colors"
              >
                <Download size={18} />
                Journal CSV
              </button>

              <button 
                onClick={() => exportCSV('logs')}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-xl font-medium transition-colors"
              >
                <Download size={18} />
                Logs CSV
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-red-50/50 dark:bg-red-900/10">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <Trash2 size={20} />
            Danger Zone
          </h3>
          
          <div className="space-y-4">
            <p className="text-sm text-red-600/80 dark:text-red-400/80">Permanently delete all your recovery data from this device. This cannot be undone.</p>
            
            <button 
              onClick={clearData}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-xl font-medium transition-colors"
            >
              <Trash2 size={18} />
              Clear All Data
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
