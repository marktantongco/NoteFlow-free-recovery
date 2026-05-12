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
  dailySpend?: number;
  currency?: string;
  recoveryStartDate?: string;
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
  tags: string[];
  permissions?: 'read-only' | 'collaborative'; 
}

export interface Folder {
  id: string;
  userId: string;
  parentId: string | null; 
  name: string;
  createdAt: string;
  order: number; 
  permissions?: 'read-only' | 'collaborative';
}

export interface NoteVersion {
  id: string;
  noteId: string;
  content: string;
  title: string;
  timestamp: string;
  userId: string;
}

export interface FolderPermission {
  id: string;
  folderId: string;
  userId: string;
  accessType: 'edit' | 'comment-only' | 'owner';
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
  costImpact?: number; // Cost of habit (if substance) or savings (if health)
  timeImpact?: number; // Time in minutes saved/spent
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
  auditLogs: EntityTable<AuditLog, 'id'>;
  noteVersions: EntityTable<NoteVersion, 'id'>;
  folderPermissions: EntityTable<FolderPermission, 'id'>;
};

export interface AuditLog {
  id: string;
  userId: string;
  targetId: string; // e.g., folderId or noteId
  targetType: 'note' | 'folder';
  action: 'create' | 'update' | 'delete';
  timestamp: string;
}

// ...

db.version(10).stores({
  users: 'id, email',
  entries: 'id, userId, date',
  logs: 'id, userId, timestamp',
  notes: 'id, userId, folderId, *tags',
  folders: 'id, userId, parentId',
  meditations: 'id, userId, sessionId',
  habits: 'id, userId, category',
  habitLogs: 'id, userId, habitId, date',
  posts: 'id, userId, createdAt, *tags',
  comments: 'id, postId, userId, createdAt',
  customPrompts: 'id, userId, createdAt',
  auditLogs: 'id, targetId, targetType, userId',
  noteVersions: 'id, noteId, timestamp',
  folderPermissions: 'id, folderId, userId'
});

export { db };
