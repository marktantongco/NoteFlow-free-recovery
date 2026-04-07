import Dexie, { type EntityTable } from 'dexie';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  notificationPrefs: {
    dailyReminder: boolean;
    reminderTime: string;
  };
  points: number;
  badges: string[];
  currentStreak: number;
  lastCheckInDate?: string;
  following?: string[]; // Array of userIds this user follows
}

export interface CustomJournalPrompt {
  id: string;
  userId: string;
  text: string;
  category?: string;
  createdAt: string;
}

export interface RecoveryEntry {
  id: string;
  userId: string;
  date: string;
  mood: number;
  moodLabel?: string;
  moodContext?: string;
  cravingLevel: number;
  triggers: string[];
  copingStrategies: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubstanceLog {
  id: string;
  userId: string;
  substance: string;
  quantity: number;
  unit: string;
  timestamp: string;
  location: string;
  context: string;
  emotions: string[];
  photo?: string;
}

export interface NoteDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  order: number;
  tags?: string[];
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface MeditationCompletion {
  id: string;
  userId: string;
  sessionId: string;
  completedAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  frequency: 'daily' | 'weekly';
  target: number;
  reminderTime?: string; // e.g., "08:00"
  reminderDays?: number[]; // 0-6, where 0 is Sunday
  category?: string;
  icon?: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  userId: string;
  habitId: string;
  date: string;
  completed: boolean;
}

export interface SocialPost {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  likes: string[]; // Array of userIds who liked
  commentsCount: number;
  createdAt: string;
  isPublic: boolean;
  tags?: string[];
}

export interface SocialComment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

const db = new Dexie('NoteFlowRecoveryDB') as Dexie & {
  users: EntityTable<User, 'id'>;
  entries: EntityTable<RecoveryEntry, 'id'>;
  logs: EntityTable<SubstanceLog, 'id'>;
  notes: EntityTable<NoteDocument, 'id'>;
  folders: EntityTable<Folder, 'id'>;
  meditations: EntityTable<MeditationCompletion, 'id'>;
  habits: EntityTable<Habit, 'id'>;
  habitLogs: EntityTable<HabitLog, 'id'>;
  posts: EntityTable<SocialPost, 'id'>;
  comments: EntityTable<SocialComment, 'id'>;
  customPrompts: EntityTable<CustomJournalPrompt, 'id'>;
};

db.version(7).stores({
  users: 'id, email',
  entries: 'id, userId, date',
  logs: 'id, userId, timestamp',
  notes: 'id, userId, folderId, *tags',
  folders: 'id, userId',
  meditations: 'id, userId, sessionId',
  habits: 'id, userId, category',
  habitLogs: 'id, userId, habitId, date',
  posts: 'id, userId, createdAt, *tags',
  comments: 'id, postId, userId, createdAt',
  customPrompts: 'id, userId, createdAt'
});

export { db };
