import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useAppContext } from '../../lib/context';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Brush, AreaChart, Area, ComposedChart } from 'recharts';
import { format, subDays, parseISO, eachDayOfInterval, startOfDay, isSameDay } from 'date-fns';
import { Brain, TrendingUp, AlertTriangle, Calendar, Settings, Eye, EyeOff, Clock, Filter } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700">
        <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-neutral-600 dark:text-neutral-400">{entry.name}:</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{entry.value}</span>
            {entry.payload.substance && <span className="text-xs text-neutral-500 ml-1">({entry.payload.substance})</span>}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const AnalyticsTab = () => {
  const { user } = useAppContext();
  const [insights, setInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [timeRange, setTimeRange] = useState(30);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState({
    mood: true,
    craving: true,
    habits: true,
    substance: true,
    habitTrend: true
  });
  const [showSettings, setShowSettings] = useState(false);

  const entries = useLiveQuery(
    () => user ? db.entries.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const allTriggers = React.useMemo(() => {
    const triggers = new Set<string>();
    entries?.forEach(e => e.triggers?.forEach(t => triggers.add(t)));
    return Array.from(triggers);
  }, [entries]);

  const logs = useLiveQuery(
    () => user ? db.logs.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const habitLogs = useLiveQuery(
    () => user ? db.habitLogs.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const habits = useLiveQuery(
    () => user ? db.habits.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const generateInsights = async () => {
    if (!entries || !logs || entries.length === 0) return;
    setIsLoadingInsights(true);
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: entries.slice(-timeRange),
          logs: logs.slice(-timeRange),
          habitLogs: habitLogs?.slice(-timeRange),
          habits: habits,
          analysisType: 'patterns'
        })
      });
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (error) {
      console.error("Failed to generate insights", error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const filteredEntries = entries?.filter(e => {
    const inDateRange = new Date(e.date) >= subDays(new Date(), timeRange);
    const matchesTrigger = selectedTrigger ? e.triggers?.includes(selectedTrigger) : true;
    return inDateRange && matchesTrigger;
  }) || [];
  
  const chartData = filteredEntries.map(entry => ({
    date: format(parseISO(entry.date), 'MMM dd'),
    mood: entry.mood,
    craving: entry.cravingLevel
  }));

  // Habit Heatmap Data
  const heatmapData = React.useMemo(() => {
    if (!habitLogs || !habits) return [];
    
    const today = new Date();
    const intervalDays = eachDayOfInterval({
        start: subDays(today, timeRange - 1),
        end: today
    });

    return intervalDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const completedCount = habitLogs.filter(l => l.date === dateStr).length;
        const totalHabits = habits.length;
        const percentage = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;
        
        return {
            date: dateStr,
            displayDate: format(day, 'MMM dd'),
            percentage,
            count: completedCount
        };
    });
  }, [habitLogs, habits, timeRange]);

  const toggleMetric = (metric: keyof typeof visibleMetrics) => {
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">Analytics Dashboard</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === days
                    ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)] dark:text-[var(--color-primary-300)]'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
          
          {allTriggers.length > 0 && (
            <div className="relative">
              <select
                value={selectedTrigger || ''}
                onChange={(e) => setSelectedTrigger(e.target.value || null)}
                className="pl-3 pr-8 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] appearance-none"
              >
                <option value="">All Triggers</option>
                {allTriggers.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition-colors border border-transparent ${showSettings ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}
          >
            <Settings size={20} className="text-neutral-600 dark:text-neutral-400" />
          </button>
          
          <button 
            onClick={generateInsights}
            disabled={isLoadingInsights || !entries?.length}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white rounded-xl font-medium transition-colors disabled:opacity-50 shadow-lg shadow-[var(--color-primary-600)]/20"
          >
            <Brain size={18} />
            {isLoadingInsights ? 'Analyzing...' : 'AI Insights'}
          </button>
        </div>
      </div>

      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm"
        >
          <h3 className="text-sm font-semibold mb-3">Customize Dashboard</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(visibleMetrics).map(([key, isVisible]) => (
              <button
                key={key}
                onClick={() => toggleMetric(key as keyof typeof visibleMetrics)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isVisible 
                    ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-300)]' 
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                }`}
              >
                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {insights && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/20 border border-[var(--color-primary-200)] dark:border-[var(--color-primary-800)] rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-3 text-[var(--color-primary-700)] dark:text-[var(--color-primary-400)] font-semibold text-lg">
            <Brain size={24} />
            AI Recovery Insights
          </div>
          <ul className="space-y-2 text-sm text-[var(--color-primary-900)] dark:text-[var(--color-primary-200)]">
            {insights.insights?.map((insight: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary-500)] shrink-0"></span>
                {insight}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 text-sm font-medium mt-4">
            <AlertTriangle size={16} className={insights.riskLevel > 5 ? 'text-orange-500' : 'text-[var(--color-primary-500)]'} />
            Risk Level: {insights.riskLevel}/10
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Habit Heatmap & Trend */}
        {(visibleMetrics.habits || visibleMetrics.habitTrend) && (
          <motion.div 
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
          >
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-8">
                  {visibleMetrics.habits && (
                    <div>
                      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                          <Calendar size={20} className="text-green-500" />
                          Habit Consistency
                      </h3>
                      <div className="flex flex-wrap gap-2">
                          {heatmapData.map((day) => (
                              <div key={day.date} className="group relative">
                                  <div 
                                      className={`w-8 h-8 rounded-lg transition-all ${
                                          day.percentage === 0 ? 'bg-neutral-100 dark:bg-neutral-700' :
                                          day.percentage < 40 ? 'bg-green-200 dark:bg-green-900/40' :
                                          day.percentage < 70 ? 'bg-green-400 dark:bg-green-700' :
                                          'bg-green-600 dark:bg-green-500'
                                      }`}
                                  />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                      {day.displayDate}: {day.percentage}%
                                  </div>
                              </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {visibleMetrics.habitTrend && (
                    <div className="h-64">
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-neutral-500">
                          <TrendingUp size={16} />
                          Completion Trend
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={heatmapData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                          <XAxis dataKey="displayDate" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2} dot={false} name="Completion Rate" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                
                {insights?.habitInsights && insights.habitInsights.length > 0 && (
                  <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-700 pt-6 md:pt-0 md:pl-6">
                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
                      <Brain size={16} className="text-[var(--color-primary-500)]" />
                      AI Habit Analysis
                    </h4>
                    <ul className="space-y-3">
                      {insights.habitInsights.map((insight: string, i: number) => (
                        <li key={i} className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
          </motion.div>
        )}

        {visibleMetrics.mood && (
          <motion.div 
            className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-[var(--color-primary-500)]" />
              Mood History
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                  <defs>
                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="mood" stroke="var(--color-primary-500)" fillOpacity={1} fill="url(#colorMood)" strokeWidth={3} name="Mood" />
                  <Brush dataKey="date" height={30} stroke="var(--color-primary-300)" fill="var(--color-primary-50)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleMetrics.craving && (
            <motion.div 
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-orange-500" />
                Craving Trends
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    <Line type="monotone" dataKey="craving" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Craving" />
                    <Brush dataKey="date" height={30} stroke="#fdba74" fill="#fff7ed" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {visibleMetrics.substance && (
            <motion.div 
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <AlertTriangle size={20} className="text-orange-500" />
                Substance Logs
              </h3>
              <div className="h-72 flex items-center justify-center text-neutral-400">
                {logs && logs.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={logs.filter(l => new Date(l.timestamp) >= subDays(new Date(), timeRange)).map(l => ({ date: format(parseISO(l.timestamp), 'MMM dd'), quantity: l.quantity, substance: l.substance }))} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                       <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                       <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                       <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                       <Legend verticalAlign="top" height={36} />
                       <Bar dataKey="quantity" fill="#f97316" radius={[4, 4, 0, 0]} name="Quantity" />
                       <Brush dataKey="date" height={30} stroke="#fdba74" fill="#fff7ed" />
                     </BarChart>
                   </ResponsiveContainer>
                ) : (
                  <p>No substance logs recorded yet.</p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
