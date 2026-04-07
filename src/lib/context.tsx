import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, User } from './db';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  user: User | null;
  login: (name: string, email: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
          const foundUser = await db.users.get(storedUserId);
          if (foundUser) {
            setUser(foundUser);
          }
        }
      } catch (error) {
        console.error("Failed to load user", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (name: string, email: string) => {
    let foundUser = await db.users.where('email').equals(email).first();
    if (!foundUser) {
      const newUser: User = {
        id: uuidv4(),
        email,
        name,
        createdAt: new Date().toISOString(),
        notificationPrefs: {
          dailyReminder: true,
          reminderTime: '20:00'
        },
        points: 0,
        badges: [],
        currentStreak: 0
      };
      await db.users.add(newUser);
      foundUser = newUser;
    }
    localStorage.setItem('userId', foundUser.id);
    setUser(foundUser);
  };

  const logout = () => {
    localStorage.removeItem('userId');
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      await db.users.update(user.id, updates);
      setUser(updatedUser);
    }
  };

  return (
    <AppContext.Provider value={{ user, login, logout, isLoading, updateUser }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
