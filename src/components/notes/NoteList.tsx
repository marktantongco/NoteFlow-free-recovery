import React from 'react';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { NoteDocument } from '../../lib/db';

interface NoteListProps {
  folderId: string | null;
  onSelectNote: (note: NoteDocument) => void;
}

export const NoteList: React.FC<NoteListProps> = ({ folderId, onSelectNote }) => {
  const notes = useLiveQuery(async () => {
    const allNotes = await db.notes.toArray();
    return allNotes.filter(n => n.folderId === folderId);
  });

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <h3 className="text-xs font-semibold uppercase text-neutral-500 mb-2">Notes</h3>
      {notes?.map(note => (
        <div key={note.id} className="p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-sm" onClick={() => onSelectNote(note)}>
          {note.title}
        </div>
      ))}
      {(!notes || notes.length === 0) && <p className="text-xs text-neutral-400">No notes here.</p>}
    </div>
  );
};
