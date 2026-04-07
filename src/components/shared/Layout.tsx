import React, { ReactNode, useState, useEffect } from 'react';
import { useAppContext } from '../../lib/context';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User as UserIcon, Activity, Book, FileText, BarChart2, Settings, Users, Cloud, CloudOff, Award, Flame, Headphones, CheckCircle, MoreHorizontal, X, ArrowUp, ArrowDown, Save, ChevronRight, Check } from 'lucide-react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useHabitReminders } from '../../hooks/useHabitReminders';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const OnboardingModal = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Welcome to NoteFlow",
      description: "Your personal companion for recovery and growth. Let's take a quick tour.",
      icon: <Activity size={48} className="text-[var(--color-primary-500)]" />
    },
    {
      title: "Daily Journaling",
      description: "Track your mood, cravings, and thoughts daily. Use AI-powered prompts to get started.",
      icon: <Book size={48} className="text-blue-500" />
    },
    {
      title: "Habit Tracking",
      description: "Build positive habits and track your streaks. Set reminders to stay on track.",
      icon: <CheckCircle size={48} className="text-green-500" />
    },
    {
      title: "Community & Support",
      description: "Connect with others in recovery securely. Share your journey and get support.",
      icon: <Users size={48} className="text-purple-500" />
    },
    {
      title: "Privacy First",
      description: "Your data is stored locally on your device. We prioritize your privacy and security.",
      icon: <CloudOff size={48} className="text-neutral-500" />
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-neutral-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-neutral-200 dark:border-neutral-700 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-900 rounded-full flex items-center justify-center">
            {steps[step].icon}
          </div>
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">{steps[step].title}</h3>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
          {steps[step].description}
        </p>
        
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[var(--color-primary-600)]' : 'w-2 bg-neutral-200 dark:bg-neutral-700'}`} 
            />
          ))}
        </div>

        <button 
          onClick={handleNext}
          className="w-full py-3.5 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary-600)]/20"
        >
          {step === steps.length - 1 ? (
            <>Get Started <Check size={20} /></>
          ) : (
            <>Next <ChevronRight size={20} /></>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export const Layout = ({ children, activeTab, setActiveTab }: LayoutProps) => {
  const { user, logout } = useAppContext();
  const isOnline = useOnlineStatus();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCustomizeNav, setShowCustomizeNav] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Initialize habit reminders
  useHabitReminders();

  useEffect(() => {
    const hasOnboarded = localStorage.getItem('hasOnboarded');
    if (!hasOnboarded && user) {
      setShowOnboarding(true);
    }
  }, [user]);

  const completeOnboarding = () => {
    localStorage.setItem('hasOnboarded', 'true');
    setShowOnboarding(false);
  };

  const allTabs = [
    { id: 'journal', label: 'Journal', icon: Activity },
    { id: 'habits', label: 'Habits', icon: CheckCircle },
    { id: 'tracker', label: 'Tracker', icon: FileText },
    { id: 'notes', label: 'Notes', icon: Book },
    { id: 'meditation', label: 'Meditation', icon: Headphones },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Load saved order or use default
  const [tabOrder, setTabOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('navTabOrder');
    return saved ? JSON.parse(saved) : allTabs.map(t => t.id);
  });

  const saveTabOrder = () => {
    localStorage.setItem('navTabOrder', JSON.stringify(tabOrder));
    setShowCustomizeNav(false);
    setShowMoreMenu(false);
  };

  const moveTab = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...tabOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setTabOrder(newOrder);
  };

  const orderedTabs = tabOrder.map(id => allTabs.find(t => t.id === id)!).filter(Boolean);
  const MOBILE_TAB_LIMIT = 4;
  const primaryTabs = orderedTabs.slice(0, MOBILE_TAB_LIMIT);
  const secondaryTabs = orderedTabs.slice(MOBILE_TAB_LIMIT);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setShowMoreMenu(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 flex flex-col md:flex-row">
      {showOnboarding && <OnboardingModal onClose={completeOnboarding} />}
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border-r border-neutral-200 dark:border-neutral-700 flex-col fixed inset-y-0 left-0 z-20">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">NoteFlow</h1>
            {!isOnline ? (
              <div title="Offline - Changes saved locally" className="flex items-center gap-1 text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded-full text-[10px] font-medium">
                <CloudOff size={14} />
                Offline
              </div>
            ) : (
              <div title="Online - Synced" className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full text-[10px] font-medium">
                <Cloud size={14} />
                Synced
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">Recovery Companion</p>
          
          {user && (
            <div className="mt-4 flex items-center gap-3 bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/30 p-3 rounded-xl border border-[var(--color-primary-100)] dark:border-[var(--color-primary-800)]">
              <div className="flex flex-col items-center justify-center">
                <Flame size={18} className="text-orange-500" />
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{user.currentStreak}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs font-medium text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]">
                  <span>Level {Math.floor(user.points / 100) + 1}</span>
                  <span>{user.points} pts</span>
                </div>
                <div className="w-full bg-[var(--color-primary-200)] dark:bg-[var(--color-primary-800)] rounded-full h-1.5 mt-1">
                  <div className="bg-[var(--color-primary-500)] h-1.5 rounded-full" style={{ width: `${(user.points % 100)}%` }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {orderedTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-400)]' 
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-900)] flex items-center justify-center text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800 z-50 pb-safe">
        <div className="flex items-center justify-around p-2">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                  isActive 
                    ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
              showMoreMenu || secondaryTabs.some(t => t.id === activeTab)
                ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]' 
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <MoreHorizontal size={20} strokeWidth={showMoreMenu ? 2.5 : 2} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Mobile More Menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className="md:hidden fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="md:hidden fixed bottom-20 right-4 w-48 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                {secondaryTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-400)]' 
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <Icon size={18} />
                      {tab.label}
                    </button>
                  );
                })}
                <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                <button 
                  onClick={() => setShowCustomizeNav(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] dark:text-[var(--color-primary-400)] dark:hover:bg-[var(--color-primary-900)]/20 transition-colors"
                >
                  <Settings size={18} />
                  Customize Nav
                </button>
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customize Navigation Modal */}
      {showCustomizeNav && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-neutral-200 dark:border-neutral-700 flex flex-col max-h-[80vh]">
            <h3 className="text-lg font-semibold mb-2">Customize Navigation</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Reorder tabs to change what appears in the bottom bar. The top 4 items will be visible.
            </p>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-6">
              {orderedTabs.map((tab, index) => {
                const Icon = tab.icon;
                const isVisible = index < MOBILE_TAB_LIMIT;
                return (
                  <div key={tab.id} className={`flex items-center justify-between p-3 rounded-xl border ${isVisible ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-200)] dark:bg-[var(--color-primary-900)]/20 dark:border-[var(--color-primary-800)]' : 'bg-neutral-50 border-neutral-200 dark:bg-neutral-900/50 dark:border-neutral-700'}`}>
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={isVisible ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]' : 'text-neutral-500'} />
                      <span className={`font-medium ${isVisible ? 'text-[var(--color-primary-900)] dark:text-[var(--color-primary-100)]' : 'text-neutral-600 dark:text-neutral-400'}`}>
                        {tab.label}
                      </span>
                      {isVisible && <span className="text-[10px] px-2 py-0.5 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded-full uppercase font-bold tracking-wide">Visible</span>}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => moveTab(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-black/5 rounded disabled:opacity-30"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button 
                        onClick={() => moveTab(index, 'down')}
                        disabled={index === orderedTabs.length - 1}
                        className="p-1 hover:bg-black/5 rounded disabled:opacity-30"
                      >
                        <ArrowDown size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveTabOrder}
                className="flex-1 px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-700)] transition-colors flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Order
              </button>
              <button
                onClick={() => setShowCustomizeNav(false)}
                className="px-4 py-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 md:ml-64 pb-24 md:pb-8 relative">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="max-w-5xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};
