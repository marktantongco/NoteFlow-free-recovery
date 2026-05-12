import React, { useState } from 'react';
import { db } from '../../lib/db';
import { Folder as FolderIcon, ChevronRight, ChevronDown, Check, Trash2, Edit2, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FolderItemProps {
    folder: any;
    onRename: (id: string, name: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export const FolderItem: React.FC<FolderItemProps> = ({ folder, onRename, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(folder.name);
    
    const subFolders = useLiveQuery(() => db.folders.where('parentId').equals(folder.id).sortBy('order'));

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: folder.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="space-y-1">
            <div className="group flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-neutral-500">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                <div {...attributes} {...listeners} className="cursor-grab">
                    <FolderIcon size={16} className="text-blue-500" />
                </div>

                {isEditing ? (
                    <input 
                        value={name} 
                        onChange={e => setName(e.target.value)}
                        onBlur={() => { onRename(folder.id, name); setIsEditing(false); }}
                        className="flex-1 px-1 text-sm bg-white border rounded outline-none"
                    />
                ) : (
                    <>
                        <span className="flex-1 text-sm truncate cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>{folder.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <Edit2 size={12} className="cursor-pointer text-neutral-400 hover:text-blue-500" onClick={() => setIsEditing(true)} />
                            <Trash2 size={12} className="cursor-pointer text-neutral-400 hover:text-red-500" onClick={() => onDelete(folder.id)} />
                        </div>
                    </>
                )}
            </div>

            {isExpanded && subFolders && (
                <div className="pl-4 border-l border-neutral-200 dark:border-neutral-700 ml-2">
                    {subFolders.map(sub => (
                        <FolderItem key={sub.id} folder={sub} onRename={onRename} onDelete={onDelete} />
                    ))}
                </div>
            )}
        </div>
    );
};
