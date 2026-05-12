import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppContext } from '../../lib/context';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'motion/react';
import { Activity, Brain, Heart, Save, Mic, MicOff, Sparkles, X, RefreshCw, Lightbulb, Flame, Book } from 'lucide-react';
import { isToday, isYesterday, parseISO, format } from 'date-fns';
import { DEVOTIONALS, Devotional } from '../../constants/devotionals';
import { toast } from 'sonner';

const PROMPTS = [
  "What are you grateful for today?",
  "What was your biggest challenge today and how did you handle it?",
  "How did you practice self-care today?",
  "What is one thing you want to achieve tomorrow?",
  "Describe a moment today when you felt proud of yourself.",
  "Who supported you today?",
  "What emotions were most present for you today?",
  "Write a letter to your future self.",
  "What is a trigger you successfully avoided today?",
  "What brings you peace right now?",
  "Reflect on a moment today when you felt a strong urge to use. What specific coping mechanism did you employ, and how did it make you feel to successfully navigate that moment?",
  "In what ways have you noticed yourself growing since you began your recovery journey? Identify one specific trait or habit that has changed for the better.",
  "What is a challenge you anticipate facing in the coming week? How can you prepare yourself mentally and emotionally to handle it without compromising your recovery?",
  "Visualize your life one year from today. What are three things you hope to have achieved or experienced by then, and what is one small step you can take today toward those aspirations?",
  "Think about a person who has been a source of support for you. How has their presence impacted your journey, and what is one way you can express your gratitude or strengthen that connection?"
];

const QUICK_PROMPTS = [
  "I'm grateful for...",
  "Today I achieved...",
  "I'm feeling...",
  "I overcame...",
  "My goal is..."
];

const MOODS = [
  { label: 'Happy', emoji: '😊', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { label: 'Calm', emoji: '😌', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { label: 'Stressed', emoji: '😫', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { label: 'Sad', emoji: '😢', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { label: 'Anxious', emoji: '😰', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { label: 'Angry', emoji: '😠', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

const journalSchema = z.object({
  mood: z.number().min(1).max(10),
  moodLabel: z.string().optional(),
  moodContext: z.string().optional(),
  cravingLevel: z.number().min(1).max(10),
  triggers: z.string(),
  copingStrategies: z.string(),
  notes: z.string()
});

type JournalFormValues = z.infer<typeof journalSchema>;

export const JournalTab = () => {
  const { user, updateUser } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [dailyPrompt, setDailyPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(true);
  const [dailyDevotional, setDailyDevotional] = useState<Devotional | null>(null);
  const [aiStarters, setAiStarters] = useState<string[]>([]);
  const [isGeneratingStarters, setIsGeneratingStarters] = useState(false);
  const [affirmation, setAffirmation] = useState<string | null>(null);
  const [isLoadingAffirmation, setIsLoadingAffirmation] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [newPromptText, setNewPromptText] = useState('');
  
  const [aiCopingStrategies, setAiCopingStrategies] = useState<string[]>([]);
  const [isGeneratingStrategies, setIsGeneratingStrategies] = useState(false);

  const customPrompts = useLiveQuery(
    () => user ? db.customPrompts.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const createCustomPrompt = async () => {
    if (!user || !newPromptText.trim()) return;
    await db.customPrompts.add({
      id: uuidv4(),
      userId: user.id,
      text: newPromptText.trim(),
      createdAt: new Date().toISOString()
    });
    setNewPromptText('');
    setIsCreatingPrompt(false);
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      mood: 5,
      moodLabel: '',
      moodContext: '',
      cravingLevel: 1,
      triggers: '',
      copingStrategies: '',
      notes: ''
    }
  });

  const notesValue = watch('notes');
  const selectedMoodLabel = watch('moodLabel');
  const currentMood = watch('mood');
  const currentCraving = watch('cravingLevel');

  const generateAffirmation = async () => {
    setIsLoadingAffirmation(true);
    try {
      // In a real app, this would call the AI endpoint with user context
      // For now, we simulate a network call or use a predefined list if offline
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const affirmations = [
        "I am capable of overcoming any challenge that comes my way.",
        "My recovery is a journey, and I am making progress every day.",
        "I deserve happiness and a healthy life.",
        "I am strong, resilient, and worthy of love.",
        "Today, I choose to focus on the present moment."
      ];
      const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
      
      const today = format(new Date(), 'yyyy-MM-dd');
      localStorage.setItem(`affirmation-${today}`, randomAffirmation);
      setAffirmation(randomAffirmation);
    } catch (e) {
      console.error("Failed to generate affirmation", e);
    } finally {
      setIsLoadingAffirmation(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentMood !== undefined && currentCraving !== undefined) {
        generateStarters();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentMood, currentCraving]);

  const generateStarters = async () => {
    setIsGeneratingStarters(true);
    try {
      let recentHabits: any[] = [];
      if (user) {
        recentHabits = await db.habitLogs.where('userId').equals(user.id).reverse().limit(5).toArray();
      }

      const response = await fetch('/api/journal-starters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: currentMood,
          moodLabel: selectedMoodLabel,
          cravingLevel: currentCraving,
          recentHabits
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAiStarters(data.starters || []);
      } else if (response.status === 401) {
        toast.error("Invalid AI API Key. Please check your settings.");
      }
    } catch (error) {
      console.error("Failed to generate starters", error);
    } finally {
      setIsGeneratingStarters(false);
    }
  };

  const generateCopingStrategies = async () => {
    if (!user) return;
    setIsGeneratingStrategies(true);
    try {
      const entries = await db.entries.where('userId').equals(user.id).reverse().limit(10).toArray();
      const logs = await db.logs.where('userId').equals(user.id).reverse().limit(10).toArray();
      
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries,
          logs,
          analysisType: 'suggestions'
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAiCopingStrategies(data.suggestions || []);
      } else if (response.status === 401) {
        toast.error("Invalid AI API Key. Please check your settings.");
      }
    } catch (e) {
      console.error("Failed to generate coping strategies", e);
    } finally {
      setIsGeneratingStrategies(false);
    }
  };

  const useStarter = (starter: string) => {
    setValue('notes', notesValue + (notesValue ? '\n\n' : '') + starter + ' ');
    setAiStarters([]);
  };

  const insertPrompt = (prompt: string) => {
    setValue('notes', notesValue + (notesValue ? '\n\n' : '') + `**${prompt}** `);
  };

  useEffect(() => {
    // Select daily prompt based on date hash
    const today = format(new Date(), 'yyyy-MM-dd');
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % PROMPTS.length;
    setDailyPrompt(PROMPTS[index]);

    const devIndex = Math.abs(hash) % DEVOTIONALS.length;
    setDailyDevotional(DEVOTIONALS[devIndex]);

    // Load daily affirmation
    const savedAffirmation = localStorage.getItem(`affirmation-${today}`);
    if (savedAffirmation) {
      setAffirmation(savedAffirmation);
    } else {
      generateAffirmation();
    }
  }, []);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setValue('notes', notesValue + (notesValue ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [setValue, notesValue]);

  const toggleRecording = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const usePrompt = () => {
    setValue('notes', notesValue + (notesValue ? '\n\n' : '') + `**${dailyPrompt}**\n`);
    setShowPrompt(false);
  };

  const onSubmit = async (data: JournalFormValues) => {
    if (!user) return;
    setIsSaving(true);
    setSuccessMsg('');
    
    try {
      const now = new Date().toISOString();
      const entry = {
        id: uuidv4(),
        userId: user.id,
        date: now,
        mood: data.mood,
        moodLabel: data.moodLabel,
        moodContext: data.moodContext,
        cravingLevel: data.cravingLevel,
        triggers: data.triggers.split(',').map(t => t.trim()).filter(Boolean),
        copingStrategies: data.copingStrategies.split(',').map(c => c.trim()).filter(Boolean),
        notes: data.notes,
        createdAt: now,
        updatedAt: now
      };

      await db.entries.add(entry);
      
      // Gamification logic
      let newStreak = user.currentStreak;
      let pointsEarned = 10; // Base points for check-in
      
      if (user.lastCheckInDate) {
        const lastDate = parseISO(user.lastCheckInDate);
        if (isYesterday(lastDate)) {
          newStreak += 1;
          pointsEarned += 5; // Streak bonus
        } else if (!isToday(lastDate)) {
          newStreak = 1; // Reset streak
        }
      } else {
        newStreak = 1;
      }

      const newPoints = user.points + pointsEarned;
      const newBadges = [...user.badges];
      
      // Milestone checks
      if (newStreak === 7 && !newBadges.includes('7-Day Streak')) {
        newBadges.push('7-Day Streak');
        pointsEarned += 50;
      }
      if (newStreak === 30 && !newBadges.includes('30-Day Streak')) {
        newBadges.push('30-Day Streak');
        pointsEarned += 200;
      }
      
      // Count total coping strategies
      const allEntries = await db.entries.where('userId').equals(user.id).toArray();
      const totalCoping = allEntries.reduce((sum, entry) => sum + (entry.copingStrategies?.length || 0), 0) + data.copingStrategies.split(',').length;
      
      if (totalCoping >= 100 && !newBadges.includes('100 Coping Strategies')) {
        newBadges.push('100 Coping Strategies');
        pointsEarned += 500;
      }

      await updateUser({
        currentStreak: newStreak,
        points: newPoints,
        badges: newBadges,
        lastCheckInDate: now
      });

      reset();
      setSuccessMsg(`Journal entry saved! Earned ${pointsEarned} points.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Failed to save journal entry', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Daily Check-in</h2>
        {user && (
          <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-2xl border border-orange-100 dark:border-orange-800">
            <Flame size={20} className="text-orange-500" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider leading-none">Streak</span>
              <span className="text-lg font-bold text-orange-700 dark:text-orange-300 leading-none">{user.currentStreak} Days</span>
            </div>
          </div>
        )}
      </div>

      {/* Daily Affirmation Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 opacity-90">
              <Sparkles size={18} />
              <span className="text-sm font-medium uppercase tracking-wider">Daily Affirmation</span>
            </div>
            <button 
              onClick={generateAffirmation} 
              disabled={isLoadingAffirmation}
              className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoadingAffirmation ? "animate-spin" : ""} />
            </button>
          </div>
          <p className="text-xl md:text-2xl font-medium leading-relaxed">
            "{affirmation || "Loading your daily inspiration..."}"
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
      </motion.div>

      {/* Daily Devotional Card */}
      {dailyDevotional && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700"
        >
          <div className="flex items-center gap-2 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] mb-4">
            <Book size={18} />
            <span className="text-sm font-semibold uppercase tracking-wider">Daily Devotional</span>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-[var(--color-primary-500)] pl-4 italic text-neutral-700 dark:text-neutral-300">
              <p className="text-lg">"{dailyDevotional.verse}"</p>
              <p className="text-sm font-semibold mt-2">— {dailyDevotional.reference}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl">
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {dailyDevotional.reflection}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {showPrompt && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[var(--color-primary-50)] to-white dark:from-[var(--color-primary-900)]/20 dark:to-neutral-800 p-4 rounded-xl border border-[var(--color-primary-100)] dark:border-[var(--color-primary-800)] flex items-start gap-4 relative"
        >
          <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg shadow-sm text-[var(--color-primary-500)]">
            <Sparkles size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] mb-1">Daily Reflection</h3>
            <p className="text-neutral-700 dark:text-neutral-300 text-sm mb-3">{dailyPrompt}</p>
            <button 
              onClick={usePrompt}
              className="text-xs font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-800)] dark:text-[var(--color-primary-300)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-primary-200)] dark:hover:bg-[var(--color-primary-700)] transition-colors"
            >
              Use this prompt
            </button>
          </div>
          <button 
            onClick={() => setShowPrompt(false)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 absolute top-2 right-2"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}

      <motion.form 
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 space-y-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {successMsg && (
          <div className="bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/30 text-[var(--color-primary-700)] dark:text-[var(--color-primary-400)] p-4 rounded-xl text-sm font-medium">
            {successMsg}
          </div>
        )}

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <Heart size={18} className="text-rose-500" />
            How are you feeling today?
          </label>
          <div className="flex flex-wrap gap-3">
            {MOODS.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setValue('moodLabel', m.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  selectedMoodLabel === m.label
                    ? `${m.color} border-transparent ring-2 ring-offset-1 ring-[var(--color-primary-500)] dark:ring-offset-neutral-800`
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="text-lg">{m.emoji}</span>
                <span className="text-sm font-medium">{m.label}</span>
              </button>
            ))}
          </div>
          {selectedMoodLabel && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-2"
            >
              <input 
                type="text" 
                placeholder={`Why are you feeling ${selectedMoodLabel.toLowerCase()}? (Optional)`}
                {...register('moodContext')}
                className="w-full px-4 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
              />
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mood Slider */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Mood Intensity (1-10)
            </label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              {...register('mood', { valueAsNumber: true })}
              className="w-full accent-[var(--color-primary-500)]"
            />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Low</span>
              <span>High</span>
            </div>
            {errors.mood && <p className="text-red-500 text-xs">{errors.mood.message}</p>}
          </div>

          {/* Craving Slider */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              <Activity size={18} className="text-orange-500" />
              Craving Intensity (1-10)
            </label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              {...register('cravingLevel', { valueAsNumber: true })}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>None</span>
              <span>Severe</span>
            </div>
            {errors.cravingLevel && <p className="text-red-500 text-xs">{errors.cravingLevel.message}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <Brain size={18} className="text-[var(--color-primary-500)]" />
            Triggers (comma separated)
          </label>
          <input 
            type="text" 
            placeholder="e.g., stress, specific location, social event"
            {...register('triggers')}
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Coping Strategies Used (comma separated)
            </label>
            <button
              type="button"
              onClick={generateCopingStrategies}
              disabled={isGeneratingStrategies}
              className="flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} />
              {isGeneratingStrategies ? 'Loading...' : 'AI Suggestions'}
            </button>
          </div>
          
          {aiCopingStrategies.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 mb-2 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-xl"
            >
              <span className="w-full text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Suggested for you:</span>
              {aiCopingStrategies.map((strategy, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const current = watch('copingStrategies');
                    setValue('copingStrategies', current ? `${current}, ${strategy}` : strategy);
                    setAiCopingStrategies(aiCopingStrategies.filter(s => s !== strategy));
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-emerald-200 dark:border-emerald-700/50 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 transition-colors shadow-sm"
                >
                  + {strategy}
                </button>
              ))}
            </motion.div>
          )}

          <input 
            type="text" 
            placeholder="e.g., meditation, calling a friend, exercise"
            {...register('copingStrategies')}
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
          />
        </div>

        <div className="space-y-4 relative">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Journal Notes
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={generateStarters}
                disabled={isGeneratingStarters}
                className="flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
              >
                <Sparkles size={14} />
                {isGeneratingStarters ? 'Thinking...' : 'AI Starters'}
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'}`}
                title={isRecording ? "Stop recording" : "Start voice-to-text"}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
          </div>
          
          {/* Quick Prompts */}
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                <Lightbulb size={14} />
                Quick Prompts
              </div>
              <button 
                type="button"
                onClick={() => setIsCreatingPrompt(!isCreatingPrompt)}
                className="text-xs text-[var(--color-primary-600)] hover:underline"
              >
                {isCreatingPrompt ? 'Cancel' : '+ Add Custom'}
              </button>
            </div>
            
            {isCreatingPrompt && (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  placeholder="Enter your custom prompt..."
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent outline-none focus:border-[var(--color-primary-500)]"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createCustomPrompt())}
                />
                <button 
                  type="button"
                  onClick={createCustomPrompt}
                  disabled={!newPromptText.trim()}
                  className="px-3 py-1.5 bg-[var(--color-primary-600)] text-white text-xs rounded-lg disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={`quick-${i}`}
                  type="button"
                  onClick={() => insertPrompt(prompt)}
                  className="whitespace-nowrap px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 text-xs rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-transparent hover:border-neutral-300 dark:hover:border-neutral-600"
                >
                  {prompt}
                </button>
              ))}
              {customPrompts?.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => insertPrompt(prompt.text)}
                  className="whitespace-nowrap px-3 py-1.5 bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/20 text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] text-xs rounded-full hover:bg-[var(--color-primary-100)] dark:hover:bg-[var(--color-primary-900)]/40 transition-colors border border-transparent hover:border-[var(--color-primary-200)]"
                >
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>
          
          {aiStarters.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2 mb-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Suggested Starters:</span>
                <button type="button" onClick={() => setAiStarters([])} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
              </div>
              {aiStarters.map((starter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => useStarter(starter)}
                  className="text-left text-sm p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-neutral-700 dark:text-neutral-300"
                >
                  {starter}
                </button>
              ))}
            </motion.div>
          )}

          <textarea 
            rows={4}
            placeholder="Write down your thoughts, reflections, or anything else..."
            {...register('notes')}
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all resize-none"
          />
        </div>

        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </motion.form>
    </div>
  );
};
