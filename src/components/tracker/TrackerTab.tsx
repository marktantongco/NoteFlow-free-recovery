import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '../../lib/db';
import { useAppContext } from '../../lib/context';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'motion/react';
import { Plus, Camera, MapPin, Clock, AlertTriangle } from 'lucide-react';

const trackerSchema = z.object({
  substance: z.string().min(1, 'Substance is required'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  location: z.string(),
  context: z.string(),
  emotions: z.string()
});

type TrackerFormValues = z.infer<typeof trackerSchema>;

export const TrackerTab = () => {
  const { user } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TrackerFormValues>({
    resolver: zodResolver(trackerSchema),
    defaultValues: {
      substance: '',
      quantity: 1,
      unit: 'units',
      location: '',
      context: 'solo',
      emotions: ''
    }
  });

  const onSubmit = async (data: TrackerFormValues) => {
    if (!user) return;
    setIsSaving(true);
    setSuccessMsg('');
    
    try {
      const log = {
        id: uuidv4(),
        userId: user.id,
        substance: data.substance.toLowerCase(),
        quantity: data.quantity,
        unit: data.unit,
        timestamp: new Date().toISOString(),
        location: data.location,
        context: data.context,
        emotions: data.emotions.split(',').map(e => e.trim()).filter(Boolean)
      };

      await db.logs.add(log);
      reset();
      setSuccessMsg('Log saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Failed to save log', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Substance Tracker</h2>
      </div>

      <motion.div 
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 space-y-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-4 rounded-xl text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <p>This tracker is for personal accountability. Honesty is the foundation of recovery.</p>
        </div>

        {successMsg && (
          <div className="bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/30 text-[var(--color-primary-700)] dark:text-[var(--color-primary-400)] p-4 rounded-xl text-sm font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Substance</label>
              <input 
                type="text" 
                placeholder="e.g., alcohol, nicotine"
                {...register('substance')}
                className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
              />
              {errors.substance && <p className="text-red-500 text-xs">{errors.substance.message}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Quantity</label>
              <input 
                type="number" 
                step="0.1"
                {...register('quantity', { valueAsNumber: true })}
                className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
              />
              {errors.quantity && <p className="text-red-500 text-xs">{errors.quantity.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Unit</label>
              <input 
                type="text" 
                placeholder="e.g., drinks, mg, oz"
                {...register('unit')}
                className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
              />
              {errors.unit && <p className="text-red-500 text-xs">{errors.unit.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <MapPin size={16} /> Location
              </label>
              <input 
                type="text" 
                placeholder="Where were you?"
                {...register('location')}
                className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Context
              </label>
              <select 
                {...register('context')}
                className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all appearance-none"
              >
                <option value="solo">Solo</option>
                <option value="social">Social</option>
                <option value="work">Work</option>
                <option value="home">Home</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Emotions (comma separated)</label>
            <input 
              type="text" 
              placeholder="e.g., stressed, anxious, bored"
              {...register('emotions')}
              className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all"
            />
          </div>

          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Plus size={18} />
              {isSaving ? 'Logging...' : 'Log Usage'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
