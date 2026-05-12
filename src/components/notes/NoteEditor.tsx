import React, { useState, useEffect } from 'react';
import { db, NoteDocument, NoteVersion } from '../../lib/db';
import { RichTextEditor } from './RichTextEditor';
import { useLiveQuery } from 'dexie-react-hooks';

interface NoteEditorProps {
  note: NoteDocument | null;
  onSave: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const versions = useLiveQuery(() => note ? db.noteVersions.where('noteId').equals(note.id).reverse().sortBy('timestamp') : Promise.resolve([]));

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setTitle(note.title);
    } else {
      setContent('');
      setTitle('');
    }
  }, [note]);

  const saveNote = async () => {
    if (!note) return;
    
    // Save current version to history before updating
    await db.noteVersions.add({
      id: crypto.randomUUID(),
      noteId: note.id,
      content: note.content,
      title: note.title,
      timestamp: new Date().toISOString(),
      userId: note.userId,
    });

    await db.notes.update(note.id, { title, content, updatedAt: new Date().toISOString() });
    onSave();
  };

  const restoreVersion = async (version: NoteVersion) => {
    setTitle(version.title);
    setContent(version.content);
    await db.notes.update(version.noteId, { title: version.title, content: version.content, updatedAt: new Date().toISOString() });
  };

  if (!note) return <div className="p-4 text-neutral-500">Select a note to edit</div>;

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <input 
        className="text-xl font-bold p-2 border-b outline-none"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <RichTextEditor content={content} onChange={setContent} />
      <button onClick={saveNote} className="bg-blue-500 text-white p-2 rounded">Save</button>
      
      <div className="mt-4">
        <h4 className="font-semibold text-sm">Version History</h4>
        <div className="space-y-1 mt-2">
            {versions?.map(v => (
                <div key={v.id} className="text-xs p-1 border rounded flex justify-between">
                    <span>{new Date(v.timestamp).toLocaleString()}</span>
                    <button className="text-blue-500" onClick={() => restoreVersion(v)}>Restore</button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
