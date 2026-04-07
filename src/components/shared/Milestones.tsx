import React from 'react';
import { Award, CheckCircle, Flame, Target, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const MILESTONES: Milestone[] = [
  {
    id: '7-Day Streak',
    title: '7-Day Streak',
    description: 'A full week of consistent check-ins!',
    icon: <Flame size={24} />,
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
  },
  {
    id: '30-Day Streak',
    title: '30-Day Streak',
    description: 'One month of dedication to your recovery.',
    icon: <Award size={24} />,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
  },
  {
    id: '100 Coping Strategies',
    title: 'Coping Master',
    description: 'Logged 100 coping strategies to manage triggers.',
    icon: <Target size={24} />,
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'
  },
  {
    id: 'First Journal',
    title: 'First Step',
    description: 'Completed your very first journal entry.',
    icon: <CheckCircle size={24} />,
    color: 'text-green-500 bg-green-50 dark:bg-green-900/20'
  }
];

interface MilestonesProps {
  userBadges: string[];
}

export const Milestones = ({ userBadges }: MilestonesProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {MILESTONES.map((milestone) => {
        const isUnlocked = userBadges.includes(milestone.id);
        return (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-2xl border transition-all ${
              isUnlocked
                ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm'
                : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-100 dark:border-neutral-800 opacity-60 grayscale'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${milestone.color}`}>
                {milestone.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-semibold ${isUnlocked ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}>
                    {milestone.title}
                  </h4>
                  {isUnlocked && (
                    <Trophy size={14} className="text-yellow-500" />
                  )}
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {milestone.description}
                </p>
                {!isUnlocked && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    <span>Locked</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
