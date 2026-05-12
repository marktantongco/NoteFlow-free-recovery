import React, { useState, useEffect } from 'react';
import { db, NoteDocument } from '../../lib/db';
import { FolderItem } from './FolderItem';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';
import { useFolderTree } from '../../hooks/useFolderTree';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

export const NotesTab: React.FC = () => {
    const { rootFolders, childrenMap } = useFolderTree();
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedNote, setSelectedNote] = useState<NoteDocument | null>(null);

    const renameFolder = async (id: string, name: string) => {
        await db.folders.update(id, { name });
    };

    const deleteFolder = async (id: string) => {
        await db.folders.delete(id);
        // Also clean up notes? (optional depending on policy)
    };

    const handleCreateFolder = async () => {
        const result = prompt('Enter folder name:');
        if (result) {
            const folderCount = await db.folders.where('parentId').equals(selectedFolderId || null).count();
            await db.folders.add({
                id: crypto.randomUUID(),
                name: result,
                parentId: selectedFolderId, 
                order: folderCount,
                userId: 'anonymous', // we can update with real user
                createdAt: new Date().toISOString()
            });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const activeFolder = await db.folders.get(active.id as string);
            const overFolder = await db.folders.get(over.id as string);

            if (activeFolder && overFolder) {
                 if (activeFolder.parentId === overFolder.parentId) {
                     // Sibling reorder
                     await db.folders.update(active.id as string, {
                        order: overFolder.order
                     });
                     await db.folders.update(over.id as string, {
                        order: activeFolder.order
                     });
                 } else {
                     // Drop into folder
                     const folderCount = await db.folders.where('parentId').equals(over.id as string).count();
                     await db.folders.update(active.id as string, {
                        parentId: over.id as string,
                        order: folderCount
                     });
                 }
            }
        }
    };

    return (
        <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex h-full w-full bg-white dark:bg-black overflow-hidden relative">
                {/* Sidebar area: Folders and Note List (Hidden on mobile when a note is open) */}
                <div className={`${selectedNote ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 shrink-0 border-r border-neutral-200 dark:border-neutral-800`}>
                    <div className="w-1/2 border-r border-neutral-200 dark:border-neutral-800 flex flex-col pt-2 bg-neutral-50 dark:bg-neutral-900/20">
                        <div className="flex items-center justify-between mb-2 px-4">
                            <h2 className="text-sm font-semibold tracking-tight">Folders</h2>
                            <button onClick={handleCreateFolder} className="p-1 text-neutral-400 hover:text-blue-500 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800" title="New Folder">
                                <Plus size={14} />
                            </button>
                        </div>
                        <div 
                            className="flex-1 overflow-y-auto space-y-0.5 px-2"
                            role="tree"
                            aria-label="Notes Folders"
                        >
                            <div 
                                className={`p-2 rounded cursor-pointer text-sm mb-2 font-medium ${selectedFolderId === null ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'}`}
                                onClick={() => setSelectedFolderId(null)}
                            >
                                All Notes
                            </div>

                            <SortableContext 
                                items={rootFolders.map(f => f.id)} 
                                strategy={verticalListSortingStrategy}
                            >
                                {rootFolders.map(folder => (
                                    <div key={folder.id} onClick={() => setSelectedFolderId(folder.id)}>
                                        <FolderItem 
                                            folder={folder} 
                                            subFolders={childrenMap.get(folder.id) || []}
                                            childrenMap={childrenMap}
                                            onRename={renameFolder} 
                                            onDelete={deleteFolder} 
                                        />
                                    </div>
                                ))}
                            </SortableContext>
                        </div>
                    </div>
                    <div className="w-1/2 flex flex-col bg-white dark:bg-black">
                        <NoteList folderId={selectedFolderId} onSelectNote={setSelectedNote} />
                    </div>
                </div>

                {/* Editor area: (Hidden on mobile when NO note is open) */}
                <div className={`${!selectedNote ? 'hidden md:flex flex-1' : 'flex-1'} min-w-0`}>
                    <NoteEditor note={selectedNote} onSave={() => {}} onBack={() => setSelectedNote(null)} />
                </div>
            </div>
        </DndContext>
    );
};
