import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './lib/context';
import { Layout } from './components/shared/Layout';
import { JournalTab } from './components/journal/JournalTab';
import { HabitTab } from './components/habits/HabitTab';
import { TrackerTab } from './components/tracker/TrackerTab';
import { NotesTab } from './components/notes/NotesTab';
import { MeditationTab } from './components/meditation/MeditationTab';
import { AnalyticsTab } from './components/analytics/AnalyticsTab';
import { SocialTab } from './components/social/SocialTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';
import { syncService } from './services/SyncService';
import { Toaster } from 'sonner';

const AuthScreen = () => {
  const { login } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      login(name, email);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-primary-400)]/20 dark:bg-[var(--color-primary-600)]/20 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 dark:bg-blue-600/20 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>

      <motion.div 
        className="w-full max-w-md bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-neutral-700/50 p-8 space-y-8 relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-900)]/30 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">NoteFlow</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Your secure recovery companion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white/50 dark:bg-neutral-900/50 focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
              placeholder="How should we call you?"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white/50 dark:bg-neutral-900/50 focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
              placeholder="For local account creation"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white rounded-xl font-medium transition-colors shadow-lg shadow-[var(--color-primary-500)]/20"
          >
            Start Journey
          </button>
        </form>
        
        <p className="text-xs text-center text-neutral-400">
          All data is stored locally on your device.
        </p>
      </motion.div>
    </div>
  );
};

const MainApp = () => {
  const { user, isLoading } = useAppContext();
  const [activeTab, setActiveTab] = useState('journal');

  useEffect(() => {
    const savedTheme = localStorage.getItem('themeColor');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) {
      const root = document.documentElement;
      root.classList.remove('dark', 'high-contrast');
      if (savedMode === 'dark') root.classList.add('dark');
      if (savedMode === 'high-contrast') root.classList.add('high-contrast');
    }
    
    // Cleanup sync service on unmount
    return () => {
      syncService.cleanup();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-primary-500)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'journal' && <JournalTab />}
      {activeTab === 'habits' && <HabitTab />}
      {activeTab === 'tracker' && <TrackerTab />}
      {activeTab === 'notes' && <NotesTab />}
      {activeTab === 'meditation' && <MeditationTab />}
      {activeTab === 'analytics' && <AnalyticsTab />}
      {activeTab === 'social' && <SocialTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
      <Toaster position="top-center" />
    </AppProvider>
  );
}
