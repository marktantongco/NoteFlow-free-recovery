import React, { useState, useEffect } from 'react';
import { db, NoteDocument, NoteVersion } from '../../lib/db';
import { RichTextEditor } from './RichTextEditor';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Clock, X } from 'lucide-react';

interface NoteEditorProps {
  note: NoteDocument | null;
  onSave: () => void;
  onBack?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onBack }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const versions = useLiveQuery(() => note ? db.noteVersions.where('noteId').equals(note.id).reverse().sortBy('timestamp') : Promise.resolve([] as NoteVersion[]), [note?.id]);

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setTitle(note.title);
    } else {
      setContent('');
      setTitle('');
    }
  }, [note?.id, note?.content, note?.title]); 

  const saveTitle = async (newTitle: string) => {
      setTitle(newTitle);
      if (note) {
          await db.notes.update(note.id, { title: newTitle, updatedAt: new Date().toISOString() });
      }
  };

  const saveContent = async (newContent: string) => {
      setContent(newContent);
      if (note) {
          await db.notes.update(note.id, { content: newContent, updatedAt: new Date().toISOString() });
      }
  };

  const createSnapshot = async () => {
    if (!note) return;
    
    await db.noteVersions.add({
      id: crypto.randomUUID(),
      noteId: note.id,
      content,
      title,
      timestamp: new Date().toISOString(),
      userId: note.userId,
    });
    
    onSave();
  };

  const restoreVersion = async (version: NoteVersion) => {
    setTitle(version.title);
    setContent(version.content);
    await db.notes.update(version.noteId, { title: version.title, content: version.content, updatedAt: new Date().toISOString() });
  };

  if (!note) return <div className="p-4 text-neutral-500 flex flex-col items-center justify-center h-full text-sm">Select a note to edit</div>;

  return (
    <div className="flex h-full w-full relative">
      <div className="flex flex-col h-full p-4 gap-4 overflow-hidden max-w-4xl mx-auto w-full flex-1">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
              {onBack && (
                  <button onClick={onBack} className="md:hidden p-2 -ml-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 shrink-0">
                      <ArrowLeft size={20} />
                  </button>
              )}
              <input 
                className="text-xl font-bold p-2 outline-none w-full bg-transparent"
                value={title}
                placeholder="Note title..."
                onChange={e => setTitle(e.target.value)}
                onBlur={e => saveTitle(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.currentTarget.blur();
                    }
                }}
              />
          </div>
          <div className="flex items-center gap-2 shrink-0">
              <button 
                  onClick={() => setShowHistory(!showHistory)} 
                  className={`p-2 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${showHistory ? 'bg-neutral-100 dark:bg-neutral-800 text-blue-500' : ''}`}
                  title="Version History"
              >
                  <Clock size={16} />
              </button>
              <button onClick={createSnapshot} className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 hover:bg-neutral-200 text-neutral-900 dark:text-white rounded text-sm transition-colors font-medium">
                  Save Snapshot
              </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
            <RichTextEditor content={content} onBlur={saveContent} />
        </div>
      </div>

      {showHistory && (
          <div className="w-80 h-full border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col absolute right-0 top-0 shadow-xl z-10 md:relative md:shadow-none">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900">
                  <h4 className="font-semibold text-sm">Version History</h4>
                  <button onClick={() => setShowHistory(false)} className="p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                      <X size={16} />
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                  {versions && versions.length > 0 ? (
                      <div className="space-y-2">
                          {versions.map(v => (
                              <div key={v.id} className="text-sm p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm relative group transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800/80">
                                  <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1 truncate">{v.title || 'Untitled'}</div>
                                  <div className="text-xs text-neutral-500 mb-3">{new Date(v.timestamp).toLocaleString()}</div>
                                  <button className="text-xs font-medium text-blue-600 dark:text-blue-400 opacity-80 hover:opacity-100 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded w-full transition-colors" onClick={() => restoreVersion(v)}>
                                      Restore Version
                                  </button>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="p-4 text-center text-sm text-neutral-500">
                          No snapshots saved yet.
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
