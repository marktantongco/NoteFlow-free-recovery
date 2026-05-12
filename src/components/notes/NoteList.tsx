import React, { useState } from 'react';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { NoteDocument } from '../../lib/db';
import { FilePlus, ArrowUpDown } from 'lucide-react';

interface NoteListProps {
  folderId: string | null;
  onSelectNote: (note: NoteDocument) => void;
}

type SortField = 'createdAt' | 'updatedAt' | 'title';
type SortOrder = 'asc' | 'desc';

export const NoteList: React.FC<NoteListProps> = ({ folderId, onSelectNote }) => {
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const notes = useLiveQuery(async () => {
    const allNotes = await db.notes.toArray();
    let filtered = allNotes.filter(n => n.folderId === folderId);
    
    filtered.sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
    });

    return filtered;
  }, [folderId, sortField, sortOrder]);

  const handleCreateNote = async () => {
    const title = prompt('Enter note title:');
    if (title) {
        const id = crypto.randomUUID();
        const newNote: NoteDocument = {
            id,
            title,
            content: '',
            folderId: folderId,
            order: 0,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: 'anonymous'
        };
        await db.notes.add(newNote);
        onSelectNote(newNote);
    }
  };

  const toggleSortOrder = () => {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between p-4 pb-2">
              <h3 className="text-xs font-semibold uppercase text-neutral-500 tracking-wider">Notes</h3>
              <button onClick={handleCreateNote} className="text-neutral-400 hover:text-blue-500 transition-colors" title="New Note">
                  <FilePlus size={16} />
              </button>
          </div>
          <div className="px-4 pb-3 flex items-center gap-2">
              <select 
                  className="bg-neutral-100 dark:bg-neutral-800 border-none rounded text-xs py-1 px-2 text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer flex-1"
                  value={sortField}
                  onChange={e => setSortField(e.target.value as SortField)}
              >
                  <option value="updatedAt">Date Modified</option>
                  <option value="createdAt">Date Created</option>
                  <option value="title">Title</option>
              </select>
              <button onClick={toggleSortOrder} className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 rounded rounded transition-colors">
                  <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180 transform transition-transform' : 'transition-transform'} />
              </button>
          </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {notes?.map(note => (
          <div key={note.id} className="p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg text-sm mb-1 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800" onClick={() => onSelectNote(note)}>
            <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{note.title}</div>
            <div className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wide">
                {new Date(note.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
        {(!notes || notes.length === 0) && (
            <div className="text-center p-8">
                <p className="text-sm text-neutral-400">No notes here.</p>
                <button onClick={handleCreateNote} className="text-xs text-blue-500 mt-2 hover:underline">
                    Create your first note
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
