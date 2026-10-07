'use client';

import { useEffect, useState } from 'react';
import { Extension } from '@tiptap/core';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  LuBold,
  LuHeading2,
  LuItalic,
  LuList,
  LuListOrdered,
  LuQuote,
  LuRemoveFormatting,
  LuRedo2,
  LuStrikethrough,
  LuUndo2,
  LuUnderline,
  LuMaximize2,
  LuMinimize2,
} from 'react-icons/lu';
import { serializeConceptDocument, toConceptEditorDocument } from '@/components/ConceptRichText';

const sizes = ['12px', '14px', '16px', '18px', '24px', '32px'];

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element) => element.style.fontSize || null,
          renderHTML: (attributes) => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
        },
      },
    }];
  },
});

function ToolButton({ label, active, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-win/60 bg-win/10 text-win' : 'border-transparent text-muted hover:border-line hover:bg-panel2 hover:text-text'}`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ label = 'Detailed notes', value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const editorClass = expanded
    ? 'min-h-[calc(100vh-160px)] max-h-none overflow-y-auto px-4 py-4 text-sm leading-7 text-text outline-none [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_p]:mb-3 [&_p:last-child]:mb-0'
    : 'min-h-[220px] max-h-[55vh] overflow-y-auto px-3 py-3 text-sm leading-6 text-text outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mb-2 [&_p:last-child]:mb-0';
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TextStyle, Color, FontSize],
    content: toConceptEditorDocument(value),
    editorProps: {
      attributes: {
        'aria-label': `${label} editor`,
        class: 'min-h-[220px] max-h-[55vh] overflow-y-auto px-3 py-3 text-sm leading-6 text-text outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mb-2 [&_p:last-child]:mb-0',
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(serializeConceptDocument(currentEditor.getJSON())),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: { ...editor.options.editorProps.attributes, class: editorClass },
      },
    });
  }, [editor, editorClass]);

  if (!editor) return <div className="field min-h-[280px]" aria-busy="true" />;

  return (
    <div
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded ? 'true' : undefined}
      aria-label={expanded ? `${label} full-page editor` : undefined}
      className={expanded ? 'fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-panel p-3 sm:p-6' : 'overflow-hidden rounded-lg border border-line bg-ink focus-within:border-win/60'}
    >
      {expanded && (
        <header className="mx-auto mb-3 flex w-full max-w-6xl items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">{label}</h2>
            <p className="text-xs text-muted">Full-page editing</p>
          </div>
          <button type="button" className="btn" onClick={() => setExpanded(false)}>
            <LuMinimize2 className="mr-2 inline h-4 w-4" aria-hidden />Back to form
          </button>
        </header>
      )}
      <div className={expanded ? 'mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-lg border border-line bg-ink' : ''}>
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-panel2/70 p-2">
        <ToolButton label="Undo" active={false} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><LuUndo2 aria-hidden /></ToolButton>
        <ToolButton label="Redo" active={false} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><LuRedo2 aria-hidden /></ToolButton>
        <span className="mx-1 h-5 border-l border-line" aria-hidden />
        <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><LuBold aria-hidden /></ToolButton>
        <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><LuItalic aria-hidden /></ToolButton>
        <ToolButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><LuUnderline aria-hidden /></ToolButton>
        <ToolButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><LuStrikethrough aria-hidden /></ToolButton>
        <span className="mx-1 h-5 border-l border-line" aria-hidden />
        <ToolButton label="Heading" active={editor.isActive('heading')} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><LuHeading2 aria-hidden /></ToolButton>
        <ToolButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><LuList aria-hidden /></ToolButton>
        <ToolButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><LuListOrdered aria-hidden /></ToolButton>
        <ToolButton label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><LuQuote aria-hidden /></ToolButton>
        <label className="ml-1 grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted transition hover:bg-panel2 hover:text-text" title="Text color">
          <input
            type="color"
            aria-label="Text color"
            className="absolute h-px w-px opacity-0"
            value={editor.getAttributes('textStyle').color || '#dce4ed'}
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          />
          <span className="h-4 w-4 rounded-sm border border-line" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#dce4ed' }} aria-hidden />
        </label>
        <select
          aria-label="Text size"
          title="Text size"
          className="field h-8 w-[100px] px-2 py-1 text-[12px]"
          value={editor.getAttributes('textStyle').fontSize || ''}
          onChange={(event) => {
            const fontSize = event.target.value;
            if (fontSize) editor.chain().focus().setMark('textStyle', { fontSize }).run();
            else editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
          }}
        >
          <option value="">Size</option>
          {sizes.map((size) => <option key={size} value={size}>{size.replace('px', '')} px</option>)}
        </select>
        <ToolButton label="Clear formatting" active={false} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><LuRemoveFormatting aria-hidden /></ToolButton>
        <span className="ml-auto" />
        <ToolButton
          label={expanded ? 'Return to form' : 'Expand notes editor'}
          active={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? <LuMinimize2 aria-hidden /> : <LuMaximize2 aria-hidden />}
        </ToolButton>
      </div>
      <div className={expanded ? 'min-h-0 flex-1 overflow-y-auto' : ''}>
        <EditorContent editor={editor} />
      </div>
      </div>
    </div>
  );
}