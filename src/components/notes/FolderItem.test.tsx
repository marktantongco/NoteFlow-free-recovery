
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FolderItem } from './FolderItem';
import React from 'react';

// Mock Dexie and dnd-kit
vi.mock('../../lib/db', () => ({
  db: {
    folders: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
            sortBy: vi.fn(() => Promise.resolve([]))
        }))
      }))
    }
  }
}));

vi.mock('@dnd-kit/sortable', () => ({
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: () => {},
        transform: null,
        transition: null,
    }),
}));

describe('FolderItem Component', () => {
  it('renders correctly with folder name', () => {
    const mockFolder = { id: '1', name: 'Test Folder', userId: 'user1', parentId: null, order: 0, createdAt: new Date().toISOString() };
    const mockChildrenMap = new Map();
    render(
      <FolderItem 
        folder={mockFolder} 
        subFolders={[]} 
        childrenMap={mockChildrenMap} 
        onRename={vi.fn()} 
        onDelete={vi.fn()} 
      />
    );
    expect(screen.getByText('Test Folder')).toBeDefined();
  });
});
