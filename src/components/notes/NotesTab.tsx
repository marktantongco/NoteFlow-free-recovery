import React, { useState } from 'react';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { FolderItem } from './FolderItem';

import React, { useState } from 'react';
import { db, NoteDocument } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { FolderItem } from './FolderItem';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';

export const NotesTab: React.FC = () => {
    const folders = useLiveQuery(() => db.folders.where('parentId').equals(null).sortBy('order'));
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedNote, setSelectedNote] = useState<NoteDocument | null>(null);

    const renameFolder = async (id: string, name: string) => {
        await db.folders.update(id, { name });
    };

    const deleteFolder = async (id: string) => {
        await db.folders.delete(id);
    };

    return (
        <div className="flex h-full w-full">
            <div className="w-1/4 border-r flex flex-col p-4">
                <h2 className="text-sm font-semibold mb-4">Folders</h2>
                <div className="flex-1 overflow-y-auto space-y-1">
                    {folders?.map(folder => (
                        <div key={folder.id} onClick={() => setSelectedFolderId(folder.id)}>
                            <FolderItem folder={folder} onRename={renameFolder} onDelete={deleteFolder} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-1/4 border-r">
                <NoteList folderId={selectedFolderId} onSelectNote={setSelectedNote} />
            </div>
            <div className="flex-1">
                <NoteEditor note={selectedNote} onSave={() => {}} />
            </div>
        </div>
    );
};
