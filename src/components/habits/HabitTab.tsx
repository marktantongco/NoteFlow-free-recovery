import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../lib/context';
import { db, Habit } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, CheckCircle2, Circle, Trash2, Trophy, Calendar, Flame, Bell, Brain, Sparkles, X, CheckSquare, Square, Filter, ArrowUpDown, Edit3, Dumbbell, Heart, BookOpen, Briefcase, Coffee, Sun, Moon, Smile, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { checkHabitMilestones } from '../../services/BadgeService';

const CATEGORIES = [
  'Physical Health',
  'Mental Wellness',
  'Recovery Skills',
  'Productivity',
  'Self-Care',
  'Other'
];

const ICONS: Record<string, any> = {
  'dumbbell': Dumbbell,
  'heart': Heart,
  'book': BookOpen,
  'briefcase': Briefcase,
  'coffee': Coffee,
  'sun': Sun,
  'moon': Moon,
  'smile': Smile,
  'zap': Zap,
  'default': Circle
};

export const HabitTab = () => {
  const { user } = useAppContext();
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCostImpact, setNewHabitCostImpact] = useState<number>(0);
  const [newHabitTimeImpact, setNewHabitTimeImpact] = useState<number>(0);
  const [newHabitFreq, setNewHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderDays, setReminderDays] = useState<number[]>([]);
  const [newHabitCategory, setNewHabitCategory] = useState(CATEGORIES[0]);
  const [newHabitIcon, setNewHabitIcon] = useState('default');
  
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditFreq, setBulkEditFreq] = useState<'daily' | 'weekly' | ''>('');
  const [bulkEditTime, setBulkEditTime] = useState('');

  const [sortBy, setSortBy] = useState<'alphabetical' | 'streak' | 'lastCompleted'>('alphabetical');
  const [filterCategory, setFilterCategory] = useState('all');

  const [aiInsight, setAiInsight] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategyQuery, setStrategyQuery] = useState('');
  const [strategyResponse, setStrategyResponse] = useState('');
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

  const habits = useLiveQuery(
    () => user ? db.habits.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const sortedHabits = habits?.filter(h => filterCategory === 'all' || h.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
      if (sortBy === 'streak') return calculateStreak(b.id) - calculateStreak(a.id);
      // Last completed logic would need logs access, simplified here:
      return 0; 
    });

  const today = format(new Date(), 'yyyy-MM-dd');

  const logs = useLiveQuery(
    () => user ? db.habitLogs.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const todaysLogs = logs?.filter(l => l.date === today) || [];

  const calculateStreak = (habitId: string) => {
    if (!logs) return 0;
    const habitLogs = logs.filter(l => l.habitId === habitId).sort((a, b) => b.date.localeCompare(a.date));
    if (habitLogs.length === 0) return 0;

    let count = 0;
    let checkDate = new Date();
    
    // If not completed today, start checking from yesterday
    if (!habitLogs.find(l => l.date === format(checkDate, 'yyyy-MM-dd'))) {
        checkDate = subDays(checkDate, 1);
    }
    
    while (true) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        if (habitLogs.find(l => l.date === dateStr)) {
            count++;
            checkDate = subDays(checkDate, 1);
        } else {
            break;
        }
    }
    return count;
  };

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const saveHabit = async () => {
    if (!user || !newHabitTitle.trim()) return;
    
    const habitData = {
      title: newHabitTitle,
      frequency: newHabitFreq,
      reminderTime: reminderTime || undefined,
      reminderDays: reminderDays.length > 0 ? reminderDays : undefined,
      category: newHabitCategory,
      icon: newHabitIcon,
      costImpact: newHabitCostImpact,
      timeImpact: newHabitTimeImpact
    };

    if (editingHabit) {
      await db.habits.update(editingHabit.id, habitData);
      setEditingHabit(null);
    } else {
      const newHabit: Habit = {
        id: uuidv4(),
        userId: user.id,
        target: 1,
        createdAt: new Date().toISOString(),
        ...habitData
      };
      await db.habits.add(newHabit);
    }
    
    setNewHabitTitle('');
    setReminderTime('');
    setReminderDays([]);
    setNewHabitFreq('daily');
    setNewHabitCategory(CATEGORIES[0]);
    setNewHabitIcon('default');
    setShowAddHabit(false);
  };

  const startEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setNewHabitTitle(habit.title);
    setNewHabitCostImpact(habit.costImpact || 0);
    setNewHabitTimeImpact(habit.timeImpact || 0);
    setNewHabitFreq(habit.frequency);
    setReminderTime(habit.reminderTime || '');
    setReminderDays(habit.reminderDays || []);
    setNewHabitCategory(habit.category || CATEGORIES[0]);
    setNewHabitIcon(habit.icon || 'default');
    setShowAddHabit(true);
  };

  const cancelEdit = () => {
    setEditingHabit(null);
    setNewHabitTitle('');
    setNewHabitCostImpact(0);
    setNewHabitTimeImpact(0);
    setReminderTime('');
    setReminderDays([]);
    setNewHabitFreq('daily');
    setNewHabitCategory(CATEGORIES[0]);
    setNewHabitIcon('default');
    setShowAddHabit(false);
  };

  const handleBulkEdit = async () => {
    if (!user || selectedHabits.length === 0) return;
    
    const updates: any = {};
    if (bulkEditFreq) updates.frequency = bulkEditFreq;
    if (bulkEditTime) updates.reminderTime = bulkEditTime;
    
    if (Object.keys(updates).length > 0) {
      await Promise.all(selectedHabits.map(id => db.habits.update(id, updates)));
    }
    
    setShowBulkEdit(false);
    setIsSelectionMode(false);
    setSelectedHabits([]);
    setBulkEditFreq('');
    setBulkEditTime('');
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('Notifications enabled! (Note: In this demo environment, actual push notifications may be limited)');
    }
  };

  const toggleHabit = async (habitId: string) => {
    if (!user) return;
    const existingLog = todaysLogs.find(l => l.habitId === habitId);
    
    if (existingLog) {
      await db.habitLogs.delete(existingLog.id);
    } else {
      await db.habitLogs.add({
        id: uuidv4(),
        userId: user.id,
        habitId,
        date: today,
        completed: true
      });
      
      await checkHabitMilestones(user.id, habitId);
      
      // Gamification: Check streak and award points
      const currentStreak = calculateStreak(habitId);
      let points = 5;
      if (currentStreak === 7) points += 50;
      if (currentStreak === 30) points += 200;
      
      await db.users.update(user.id, { points: user.points + points });
    }
  };

  const toggleSelection = (id: string) => {
    if (selectedHabits.includes(id)) {
      setSelectedHabits(selectedHabits.filter(h => h !== id));
    } else {
      setSelectedHabits([...selectedHabits, id]);
    }
  };

  const deleteSelected = async () => {
    if (window.confirm(`Delete ${selectedHabits.length} habits?`)) {
      await db.habits.bulkDelete(selectedHabits);
      const logsToDelete = await db.habitLogs.where('habitId').anyOf(selectedHabits).toArray();
      await db.habitLogs.bulkDelete(logsToDelete.map(l => l.id));
      setSelectedHabits([]);
      setIsSelectionMode(false);
    }
  };

  const analyzeHabits = async () => {
    if (!user || !habits || !logs) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType: 'Habit Formation',
          entries: [], // Not needed for this specific analysis
          logs: logs.map(l => ({ ...l, type: 'habit_log' })), // Contextualize logs
          habits: habits // Pass habit definitions
        })
      });
      const data = await response.json();
      setAiInsight(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStrategyAdvice = async () => {
    if (!strategyQuery.trim()) return;
    setIsGeneratingStrategy(true);
    try {
        // Simulating a quick AI response for the demo "interactive" feel
        // In production, this would hit a dedicated endpoint
        const response = await fetch('/api/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              analysisType: 'Strategy Coach',
              entries: [{ notes: strategyQuery }], // Pass query as context
              logs: []
            })
          });
          const data = await response.json();
          // Assuming the generic insight endpoint returns "insights" array
          setStrategyResponse(data.insights?.[0] || "Try breaking the task into smaller steps and rewarding yourself for each milestone.");
    } catch (e) {
        setStrategyResponse("Could not generate advice. Please try again.");
    } finally {
        setIsGeneratingStrategy(false);
    }
  };

  const completedCount = todaysLogs.length || 0;
  const totalCount = habits?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Habit Tracker</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Build positive routines, one day at a time.</p>
        </div>
        <div className="flex gap-2">
            {isSelectionMode ? (
                <>
                    <button 
                        onClick={() => setShowBulkEdit(true)}
                        disabled={selectedHabits.length === 0}
                        className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl hover:bg-indigo-200 transition-colors disabled:opacity-50"
                        title="Bulk Edit"
                    >
                        <Edit3 size={24} />
                    </button>
                    <button 
                        onClick={deleteSelected}
                        disabled={selectedHabits.length === 0}
                        className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                        <Trash2 size={24} />
                    </button>
                    <button 
                        onClick={() => { setIsSelectionMode(false); setSelectedHabits([]); }}
                        className="p-2 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 rounded-xl hover:bg-neutral-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </>
            ) : (
                <>
                    <button 
                        onClick={requestNotificationPermission}
                        className="p-2 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 rounded-xl hover:bg-neutral-200 transition-colors"
                        title="Enable Notifications"
                    >
                        <Bell size={24} />
                    </button>
                    <button 
                        onClick={() => setIsSelectionMode(true)}
                        className="p-2 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 rounded-xl hover:bg-neutral-200 transition-colors"
                        title="Manage Habits"
                    >
                        <CheckSquare size={24} />
                    </button>
                    <button 
                        onClick={() => setShowAddHabit(true)}
                        className="p-2 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-400)] rounded-xl hover:bg-[var(--color-primary-200)] dark:hover:bg-[var(--color-primary-800)]/50 transition-colors"
                    >
                        <Plus size={24} />
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Sort & Filter Controls */}
      {!isSelectionMode && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm">
            <ArrowUpDown size={14} className="text-neutral-500" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent outline-none text-neutral-700 dark:text-neutral-300"
            >
              <option value="alphabetical">Alphabetical</option>
              <option value="streak">Streak</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm">
            <Filter size={14} className="text-neutral-500" />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent outline-none text-neutral-700 dark:text-neutral-300"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Progress Card */}
      <div className="bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] rounded-3xl p-8 text-white shadow-lg shadow-[var(--color-primary-500)]/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 opacity-90">
              <Calendar size={20} />
              <span className="font-medium">{format(new Date(), 'EEEE, MMMM do')}</span>
            </div>
            <button 
                onClick={analyzeHabits}
                disabled={isAnalyzing}
                className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm hover:bg-white/30 transition-colors"
            >
              <Brain size={14} />
              <span>{isAnalyzing ? 'Analyzing...' : 'AI Insights'}</span>
            </button>
          </div>
          
          <div className="mb-2 flex items-end gap-2">
            <span className="text-5xl font-bold">{Math.round(progress)}%</span>
            <span className="text-lg opacity-80 mb-1">completed today</span>
          </div>

          <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div 
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
        
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-12 -mb-12"></div>
      </div>

      {/* AI Insights Panel */}
      <AnimatePresence>
        {aiInsight && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 overflow-hidden"
            >
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Sparkles size={24} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Habit Analysis</h3>
                        <ul className="space-y-1 text-sm text-indigo-800 dark:text-indigo-200">
                            {aiInsight.insights?.map((insight: string, i: number) => (
                                <li key={i}>• {insight}</li>
                            ))}
                        </ul>
                        {aiInsight.recommendations && (
                             <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800/50">
                                <p className="font-medium text-xs uppercase tracking-wider text-indigo-500 mb-2">Recommended Actions</p>
                                <div className="flex flex-wrap gap-2">
                                    {aiInsight.recommendations.map((rec: string, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-white dark:bg-indigo-900/50 rounded-full text-xs border border-indigo-200 dark:border-indigo-700">
                                            {rec}
                                        </span>
                                    ))}
                                </div>
                             </div>
                        )}
                    </div>
                    <button onClick={() => setAiInsight(null)} className="text-indigo-400 hover:text-indigo-600">
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Habit Form */}
      {showAddHabit && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm"
        >
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg">{editingHabit ? 'Edit Habit' : 'New Habit'}</h3>
            <div className="flex flex-col md:flex-row gap-4">
                <input 
                type="text" 
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                placeholder="Enter habit name..."
                className="flex-1 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                autoFocus
                />
                <input 
                  type="number"
                  placeholder="Cost/Impact Value"
                  value={newHabitCostImpact}
                  onChange={(e) => setNewHabitCostImpact(Number(e.target.value))}
                  className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                />
                <input 
                  type="number"
                  placeholder="Time Impact (mins)"
                  value={newHabitTimeImpact}
                  onChange={(e) => setNewHabitTimeImpact(Number(e.target.value))}
                  className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                />
                <select
                value={newHabitCategory}
                onChange={(e) => setNewHabitCategory(e.target.value)}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                value={newHabitFreq}
                onChange={(e) => setNewHabitFreq(e.target.value as 'daily' | 'weekly')}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                </select>
            </div>
            
            {/* Icon Selection */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Object.keys(ICONS).map(iconKey => {
                const IconComp = ICONS[iconKey];
                return (
                  <button
                    key={iconKey}
                    onClick={() => setNewHabitIcon(iconKey)}
                    className={`p-2 rounded-lg transition-colors ${newHabitIcon === iconKey ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)] ring-2 ring-[var(--color-primary-500)]' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                  >
                    <IconComp size={20} />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-neutral-500">
                    <Bell size={18} />
                    <input 
                        type="time" 
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="px-3 py-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent text-sm"
                    />
                </div>
                <div className="flex items-center gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <button
                          key={i}
                          onClick={() => setReminderDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${reminderDays.includes(i) ? 'bg-[var(--color-primary-500)] text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
                        >
                          {day}
                        </button>
                    ))}
                </div>
                <div className="flex-1"></div>
                <button 
                onClick={saveHabit}
                className="px-6 py-2 bg-[var(--color-primary-600)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-700)] transition-colors"
                >
                {editingHabit ? 'Save Changes' : 'Add Habit'}
                </button>
                <button 
                onClick={cancelEdit}
                className="px-4 py-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors"
                >
                Cancel
                </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Habits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedHabits?.map(habit => {
          const isCompleted = todaysLogs.some(l => l.habitId === habit.id);
          const streak = calculateStreak(habit.id);
          const isSelected = selectedHabits.includes(habit.id);
          const IconComp = ICONS[habit.icon || 'default'] || Circle;
          
          return (
            <motion.div 
              key={habit.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-2xl border transition-all relative ${
                isSelected 
                    ? 'ring-2 ring-[var(--color-primary-500)] border-transparent bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/30'
                    : isCompleted 
                        ? 'bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/20 border-[var(--color-primary-200)] dark:border-[var(--color-primary-800)]' 
                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-[var(--color-primary-300)] dark:hover:border-[var(--color-primary-700)]'
              }`}
            >
              {isSelectionMode && (
                  <div className="absolute top-4 right-4 z-10">
                      <button onClick={() => toggleSelection(habit.id)}>
                        {isSelected ? <CheckSquare className="text-[var(--color-primary-600)]" /> : <Square className="text-neutral-400" />}
                      </button>
                  </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => !isSelectionMode && toggleHabit(habit.id)}
                    disabled={isSelectionMode}
                    className={`transition-transform active:scale-90 ${
                      isCompleted ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]' : 'text-neutral-300 dark:text-neutral-600 hover:text-[var(--color-primary-400)]'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={32} fill="currentColor" className="text-white dark:text-neutral-900" /> : <IconComp size={32} />}
                  </button>
                  <div className="cursor-pointer" onClick={() => !isSelectionMode && startEdit(habit)}>
                    <h3 className={`font-semibold text-lg ${isCompleted ? 'text-[var(--color-primary-900)] dark:text-[var(--color-primary-100)] line-through opacity-70' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {habit.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                        <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded-full">{habit.category || 'Other'}</span>
                        <span className="capitalize">{habit.frequency}</span>
                        {habit.reminderTime && (
                            <span className="flex items-center gap-1">
                                <Bell size={10} />
                                {habit.reminderTime}
                            </span>
                        )}
                        {habit.reminderDays && habit.reminderDays.length > 0 && (
                            <div className="flex gap-0.5">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => habit.reminderDays!.includes(i) && (
                                <span key={i} className="px-1 py-0.5 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded text-[10px]">{day}</span>
                              ))}
                            </div>
                        )}
                    </div>
                  </div>
                </div>
                
                {!isSelectionMode && (
                    <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1 font-bold ${streak > 0 ? 'text-orange-500' : 'text-neutral-300'}`}>
                            <Flame size={16} fill={streak > 0 ? "currentColor" : "none"} />
                            <span>{streak}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">streak</span>
                    </div>
                )}
              </div>
            </motion.div>
          );
        })}
        
        {sortedHabits?.length === 0 && !showAddHabit && (
          <div className="col-span-full text-center py-12 text-neutral-400">
            <p>No habits found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* AI Strategy Coach Demo */}
      <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-700">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="text-[var(--color-primary-500)]" />
            AI Habit Coach
        </h3>
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-500 mb-4">Struggling with a habit? Ask for a personalized strategy.</p>
            <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    value={strategyQuery}
                    onChange={(e) => setStrategyQuery(e.target.value)}
                    placeholder="e.g., I keep forgetting to drink water in the afternoon..."
                    className="flex-1 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && getStrategyAdvice()}
                />
                <button 
                    onClick={getStrategyAdvice}
                    disabled={isGeneratingStrategy || !strategyQuery.trim()}
                    className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium disabled:opacity-50"
                >
                    {isGeneratingStrategy ? 'Thinking...' : 'Ask AI'}
                </button>
            </div>
            {strategyResponse && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl text-sm leading-relaxed"
                >
                    <p className="font-semibold text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] mb-1">Coach Suggestion:</p>
                    {strategyResponse}
                </motion.div>
            )}
        </div>
      </div>
      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-semibold mb-4">Bulk Edit Habits</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Applying changes to <span className="font-medium text-neutral-900 dark:text-neutral-100">{selectedHabits.length}</span> selected habits.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                  Frequency
                </label>
                <select
                  value={bulkEditFreq}
                  onChange={(e) => setBulkEditFreq(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                >
                  <option value="">No Change</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                  Reminder Time
                </label>
                <input 
                  type="time" 
                  value={bulkEditTime}
                  onChange={(e) => setBulkEditTime(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                />
                <p className="text-xs text-neutral-400 mt-1">Leave empty to keep existing times.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBulkEdit}
                className="flex-1 px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-700)] transition-colors"
              >
                Apply Changes
              </button>
              <button
                onClick={() => setShowBulkEdit(false)}
                className="px-4 py-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
