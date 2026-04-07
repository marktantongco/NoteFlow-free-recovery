import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, NoteDocument, Folder } from '../../lib/db';
import { useAppContext } from '../../lib/context';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'motion/react';
import { FileText, Plus, Search, Trash2, Clock, Filter, Folder as FolderIcon, FolderPlus, Tag, Share2, Bold, Italic, List, ListOrdered, Edit2, Check, X } from 'lucide-react';
import { subDays } from 'date-fns';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const TipTapEditor = ({ content, onChange }: { content: string, onChange: (html: string) => void }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Only update content if it's significantly different to avoid cursor jumping
      // In a real app, you'd want a more robust sync mechanism, but this works for basic auto-save
      if (!editor.isFocused) {
          editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
        >
          <ListOrdered size={16} />
        </button>
      </div>
      <EditorContent editor={editor} className="flex-1 p-6 overflow-y-auto prose dark:prose-invert max-w-none [&>div]:outline-none [&>div]:min-h-full" />
    </div>
  );
};

export const NotesTab = () => {
  const { user } = useAppContext();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  
  // Folders & Tags State
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Auto-save State
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  const notes = useLiveQuery(
    () => user ? db.notes.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const folders = useLiveQuery(
    () => user ? db.folders.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  );

  const allTags = Array.from(new Set(notes?.flatMap(n => n.tags || []) || []));

  const activeNote = notes?.find(n => n.id === activeNoteId);

  // Sync active note to draft for auto-save
  useEffect(() => {
    if (activeNote) {
      setDraftTitle(activeNote.title);
      setDraftContent(activeNote.content);
    }
  }, [activeNoteId]); // Only sync when active note changes

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeNote && (draftTitle !== activeNote.title || draftContent !== activeNote.content)) {
        updateNote(activeNote.id, { title: draftTitle, content: draftContent });
      }
    }, 1000); // Auto-save after 1 second of inactivity
    return () => clearTimeout(timer);
  }, [draftTitle, draftContent, activeNote]);

  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const filteredNotes = notes?.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter === '7days') {
      matchesDate = new Date(n.updatedAt) >= subDays(new Date(), 7);
    } else if (dateFilter === '30days') {
      matchesDate = new Date(n.updatedAt) >= subDays(new Date(), 30);
    }

    const matchesFolder = activeFolderId === null || n.folderId === activeFolderId;
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => n.tags?.includes(tag));

    return matchesSearch && matchesDate && matchesFolder && matchesTags;
  }).sort((a, b) => {
    if (!searchQuery) return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

    const getScore = (note: NoteDocument) => {
      let score = 0;
      const lowerQuery = searchQuery.toLowerCase();
      const lowerTitle = note.title.toLowerCase();
      const lowerContent = note.content.toLowerCase();
      
      // Title match
      if (lowerTitle.includes(lowerQuery)) score += 20;

      // Tag match
      if (note.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        score += 15;
      }
      
      // Keyword frequency in content
      const contentMatches = lowerContent.split(lowerQuery).length - 1;
      score += (contentMatches * 2);
      
      // Length consideration (bonus for more substantial notes, but normalized)
      const contentLength = note.content.length;
      if (contentLength > 500) score += 2;
      else if (contentLength > 100) score += 1;
      
      // Recency
      const daysSinceUpdate = (new Date().getTime() - new Date(note.updatedAt).getTime()) / (1000 * 3600 * 24);
      if (daysSinceUpdate <= 1) score += 10;
      else if (daysSinceUpdate <= 7) score += 5;
      else if (daysSinceUpdate <= 30) score += 2;
      
      return score;
    };

    return getScore(b) - getScore(a);
  });

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePassword, setSharePassword] = useState('');

  const handleShareClick = () => {
    setSharePassword('');
    setShowShareModal(true);
  };

  const generateShareLink = () => {
    // In a real app, this would generate a signed URL or store the share config in DB
    // For this demo, we'll simulate a link
    const baseUrl = window.location.origin;
    const shareId = activeNoteId || 'unknown';
    let shareUrl = `${baseUrl}/share/${shareId}`;
    
    if (sharePassword) {
      // Simulate password protection param (in reality, this would be handled backend-side)
      shareUrl += `?protected=true`;
    }

    navigator.clipboard.writeText(shareUrl);
    alert(`Link copied to clipboard!\n${shareUrl}\n${sharePassword ? '(Password protected)' : '(Public link)'}`);
    setShowShareModal(false);
  };

  const createNote = async () => {
    if (!user) return;
    const newNote: NoteDocument = {
      id: uuidv4(),
      userId: user.id,
      title: 'Untitled Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      folderId: activeFolderId,
      order: notes ? notes.length : 0,
      tags: []
    };
    await db.notes.add(newNote);
    setActiveNoteId(newNote.id);
  };

  const updateNote = async (id: string, updates: Partial<NoteDocument>) => {
    await db.notes.update(id, { ...updates, updatedAt: new Date().toISOString() });
  };

  const deleteNote = async (id: string) => {
    await db.notes.delete(id);
    if (activeNoteId === id) setActiveNoteId(null);
  };

  const createFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    const newFolder: Folder = {
      id: uuidv4(),
      userId: user.id,
      name: newFolderName.trim(),
      createdAt: new Date().toISOString()
    };
    await db.folders.add(newFolder);
    setNewFolderName('');
    setIsCreatingFolder(false);
    setActiveFolderId(newFolder.id);
  };

  const renameFolder = async (id: string) => {
    if (!editingFolderName.trim()) return;
    await db.folders.update(id, { name: editingFolderName.trim() });
    setEditingFolderId(null);
  };

  const deleteFolder = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this folder? Notes inside will be moved to "All Notes".')) {
      await db.folders.delete(id);
      // Move notes out of the folder
      const notesInFolder = await db.notes.where('folderId').equals(id).toArray();
      for (const note of notesInFolder) {
        await db.notes.update(note.id, { folderId: null });
      }
      if (activeFolderId === id) setActiveFolderId(null);
    }
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleShare = () => {
    if (!activeNote) return;
    handleShareClick();
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <div className="w-full md:w-64 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Knowledge Base</h2>
          <button 
            onClick={createNote}
            className="p-2 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/30 dark:text-[var(--color-primary-400)] rounded-lg hover:bg-[var(--color-primary-200)] dark:hover:bg-[var(--color-primary-800)]/50 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Folders */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            <span>Folders</span>
            <button onClick={() => setIsCreatingFolder(true)} className="hover:text-[var(--color-primary-500)]"><FolderPlus size={14} /></button>
          </div>
          {isCreatingFolder && (
            <div className="flex items-center gap-2 px-2 mb-2">
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setIsCreatingFolder(false); }}
                className="flex-1 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 outline-none"
                placeholder="Folder name..."
              />
              <button onClick={createFolder} className="text-green-500"><Check size={14} /></button>
              <button onClick={() => setIsCreatingFolder(false)} className="text-red-500"><X size={14} /></button>
            </div>
          )}
          <button
            onClick={() => setActiveFolderId(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeFolderId === null ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/20 dark:text-[var(--color-primary-400)] font-medium' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
          >
            <FolderIcon size={16} />
            All Notes
          </button>
          {folders?.map(folder => (
            <div key={folder.id} className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeFolderId === folder.id ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-[var(--color-primary-900)]/20 dark:text-[var(--color-primary-400)] font-medium' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
              {editingFolderId === folder.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    autoFocus
                    type="text"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(folder.id); if (e.key === 'Escape') setEditingFolderId(null); }}
                    className="flex-1 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 outline-none"
                  />
                  <button onClick={() => renameFolder(folder.id)} className="text-green-500"><Check size={14} /></button>
                </div>
              ) : (
                <>
                  <button onClick={() => setActiveFolderId(folder.id)} className="flex items-center gap-2 flex-1 text-left truncate">
                    <FolderIcon size={16} />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); }} className="p-1 text-neutral-400 hover:text-[var(--color-primary-500)]"><Edit2 size={12} /></button>
                    <button onClick={() => deleteFolder(folder.id)} className="p-1 text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tags</div>
            <div className="flex flex-wrap gap-1 px-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${selectedTags.includes(tag) ? 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-500)]' : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-[var(--color-primary-500)]'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowRecentSearches(true)}
              onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveSearch(searchQuery);
                  setShowRecentSearches(false);
                }
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all text-sm"
            />
            {showRecentSearches && recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-10 overflow-hidden">
                <div className="px-3 py-2 text-xs font-medium text-neutral-500 bg-neutral-50 dark:bg-neutral-900/50">Recent Searches</div>
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    onClick={() => {
                      setSearchQuery(search);
                      setShowRecentSearches(false);
                    }}
                  >
                    <Clock size={14} className="text-neutral-400" />
                    {search}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative shrink-0">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-8 pr-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] outline-none transition-all text-sm appearance-none"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredNotes?.map(note => (
            <motion.div 
              key={note.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                activeNoteId === note.id 
                  ? 'bg-white dark:bg-neutral-800 border-[var(--color-primary-500)] shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
              }`}
              onClick={() => setActiveNoteId(note.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={16} className="text-[var(--color-primary-500)] shrink-0" />
                  <p className="text-sm font-medium truncate">{note.title || 'Untitled'}</p>
                </div>
                {activeNoteId === note.id && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-1 truncate">
                {new Date(note.updatedAt).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
          {filteredNotes?.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">No notes found.</p>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col">
        {activeNote ? (
          <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <input 
                  type="text" 
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Note Title"
                  className="flex-1 text-2xl font-semibold bg-transparent border-none outline-none placeholder-neutral-400"
                />
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--color-primary-600)] bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)] dark:text-[var(--color-primary-400)] dark:bg-[var(--color-primary-900)]/30 dark:hover:bg-[var(--color-primary-900)]/50 rounded-lg transition-colors"
                  title="Share Note"
                >
                  <Share2 size={16} />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-neutral-400" />
                <div className="flex flex-wrap gap-1">
                  {activeNote.tags?.map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                      {tag}
                      <button onClick={() => updateNote(activeNote.id, { tags: activeNote.tags?.filter(t => t !== tag) })} className="hover:text-red-500"><X size={10} /></button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newTag = e.currentTarget.value.trim();
                        if (!activeNote.tags?.includes(newTag)) {
                          updateNote(activeNote.id, { tags: [...(activeNote.tags || []), newTag] });
                        }
                        e.currentTarget.value = '';
                      }
                    }}
                    className="px-2 py-0.5 text-xs rounded-full border border-neutral-200 dark:border-neutral-700 bg-transparent outline-none focus:border-[var(--color-primary-500)]"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TipTapEditor content={draftContent} onChange={setDraftContent} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p>Select a note or create a new one.</p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-semibold mb-4">Share Note</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Generate a shareable link for <span className="font-medium text-neutral-900 dark:text-neutral-100">"{draftTitle}"</span>.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                  Password Protection (Optional)
                </label>
                <input
                  type="password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="Set a password..."
                  className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-transparent focus:ring-2 focus:ring-[var(--color-primary-500)] outline-none"
                />
                <p className="text-xs text-neutral-400 mt-1">
                  If set, users will need this password to view the note.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={generateShareLink}
                className="flex-1 px-4 py-2 bg-[var(--color-primary-600)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-700)] transition-colors"
              >
                Copy Link
              </button>
              <button
                onClick={() => setShowShareModal(false)}
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
