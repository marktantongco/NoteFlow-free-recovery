import React, { useState } from 'react';
import { Folder as FolderIcon, ChevronRight, ChevronDown, Trash2, Edit2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder } from '../../lib/db';

interface FolderItemProps {
    folder: Folder;
    subFolders: Folder[];
    childrenMap: Map<string | null, Folder[]>;
    onRename: (id: string, name: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export const FolderItem: React.FC<FolderItemProps> = React.memo(({ folder, subFolders, childrenMap, onRename, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(folder.name);
    
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

    const hasSubFolders = subFolders && subFolders.length > 0;

    return (
        <div ref={setNodeRef} style={style} className="space-y-1" role="treeitem" aria-expanded={isExpanded} aria-selected={false}>
            <div className="group flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className={`text-neutral-500 ${!hasSubFolders && 'invisible'}`}>
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
                        onKeyDown={(e) => { if (e.key === 'Enter') { onRename(folder.id, name); setIsEditing(false); } }}
                        className="flex-1 px-1 text-sm bg-white border rounded outline-none text-black"
                        autoFocus
                    />
                ) : (
                    <>
                        <span className="flex-1 text-sm truncate cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
                            {folder.name}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 size={12} className="cursor-pointer text-neutral-400 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} />
                            <Trash2 size={12} className="cursor-pointer text-neutral-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }} />
                        </div>
                    </>
                )}
            </div>

            {isExpanded && hasSubFolders && (
                <div className="pl-4 border-l border-neutral-200 dark:border-neutral-700 ml-2" role="group">
                    {subFolders.map(sub => (
                        <FolderItem 
                            key={sub.id} 
                            folder={sub} 
                            subFolders={childrenMap.get(sub.id) || []}
                            childrenMap={childrenMap}
                            onRename={onRename} 
                            onDelete={onDelete} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

FolderItem.displayName = 'FolderItem';
