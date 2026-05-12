import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Folder } from '../lib/db';

export function useFolderTree() {
  const allFolders = useLiveQuery(() => db.folders.toArray());

  const { rootFolders, childrenMap } = useMemo(() => {
    if (!allFolders) return { rootFolders: [], childrenMap: new Map() };

    const map = new Map<string | null, Folder[]>();
    
    allFolders.forEach(folder => {
      const parentId = folder.parentId || null;
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(folder);
    });

    // Sort by order for each level
    map.forEach(list => list.sort((a, b) => (a.order || 0) - (b.order || 0)));

    return {
      rootFolders: map.get(null) || [],
      childrenMap: map
    };
  }, [allFolders]);

  return { rootFolders, childrenMap };
}
