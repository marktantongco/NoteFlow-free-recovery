import React, { useState, useEffect } from 'react';
import { Search, X, Book, FileText, CheckCircle } from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface GlobalSearchProps {
  onNavigate: (tabId: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const searchResults = useLiveQuery(async () => {
    if (!query || query.length < 2) return { notes: [], journals: [], habits: [] };
    
    const lowerQuery = query.toLowerCase();
    
    const notes = await db.notes.filter(n => 
        n.title.toLowerCase().includes(lowerQuery) || 
        n.content.toLowerCase().includes(lowerQuery)
    ).limit(5).toArray();
    
    const journals = await db.entries.filter(e => 
        e.notes.toLowerCase().includes(lowerQuery) || 
        (e.moodLabel?.toLowerCase() || '').includes(lowerQuery) ||
        (e.moodContext?.toLowerCase() || '').includes(lowerQuery)
    ).limit(5).toArray();
    
    const habits = await db.habits.filter(h => 
        h.title.toLowerCase().includes(lowerQuery) ||
        (h.category?.toLowerCase() || '').includes(lowerQuery)
    ).limit(5).toArray();

    return { notes, journals, habits };
  }, [query], { notes: [], journals: [], habits: [] });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors w-full max-w-sm md:w-64"
      >
        <Search size={16} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-block text-[10px] bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-mono border border-neutral-200 dark:border-neutral-600">⌘K</kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-start justify-center pt-[10vh] p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center p-4 border-b border-neutral-200 dark:border-neutral-800 gap-3">
              <Search size={20} className="text-neutral-400" />
              <input 
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-lg text-neutral-900 dark:text-neutral-100"
                placeholder="Search notes, journals, habits..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button onClick={handleClose} className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {query.length < 2 ? (
                <div className="p-8 text-center text-sm text-neutral-500">
                  Type at least 2 characters to search...
                </div>
              ) : (
                <div className="space-y-4 p-2">
                  {searchResults.notes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-2">Notes</h4>
                      {searchResults.notes.map(note => (
                        <div 
                          key={note.id} 
                          onClick={() => { onNavigate('notes'); handleClose(); }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          <Book size={16} className="text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{note.title}</div>
                            <div className="text-xs text-neutral-500 truncate">{note.content.substring(0, 60)}{note.content.length > 60 ? '...' : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.journals.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-2">Journals</h4>
                      {searchResults.journals.map(entry => (
                        <div 
                          key={entry.id} 
                          onClick={() => { onNavigate('journal'); handleClose(); }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          <FileText size={16} className="text-[var(--color-primary-500)]" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{new Date(entry.date).toLocaleDateString()} - {entry.moodLabel || 'Entry'}</div>
                            <div className="text-xs text-neutral-500 truncate">{entry.notes.substring(0, 60)}{entry.notes.length > 60 ? '...' : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.habits.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-2">Habits</h4>
                      {searchResults.habits.map(habit => (
                        <div 
                          key={habit.id} 
                          onClick={() => { onNavigate('habits'); handleClose(); }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          <CheckCircle size={16} className="text-green-500" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{habit.title}</div>
                            <div className="text-xs text-neutral-500 truncate">{habit.category || 'Uncategorized'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.notes.length === 0 && searchResults.journals.length === 0 && searchResults.habits.length === 0 && (
                    <div className="p-8 text-center text-sm text-neutral-500">
                      No results found for "{query}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
