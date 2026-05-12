
import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  content: string;
  onBlur: (content: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onBlur }) => {
  const editor = useEditor({
    extensions: [
        StarterKit,
        Underline,
        TaskList,
        TaskItem.configure({ nested: true }),
        Link.configure({ openOnClick: false })
    ],
    content,
    onBlur: ({ editor }) => {
      onBlur(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="prose prose-sm max-w-none border border-neutral-200 dark:border-neutral-800 rounded p-2 min-h-[200px] cursor-text bg-white dark:bg-neutral-900 overflow-y-auto max-h-[60vh] flex-1">
      <EditorContent editor={editor} className="min-h-[200px]" />
    </div>
  );
};

