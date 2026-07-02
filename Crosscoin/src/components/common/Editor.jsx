import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { productService } from '../../services';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

// Resolve an uploaded image path to a full URL (mirrors the media gallery).
function resolveMediaUrl(path) {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('/uploads/')) return `${API_URL}${path}`;
  return `${API_URL}/uploads/products/${path.replace(/^\/+/, '')}`;
}

// Pull the first uploaded image URL/path out of the upload response, which may
// come back in a few shapes depending on the endpoint version.
function extractUploadedPath(result) {
  const cand = result?.images || result?.data || result?.urls
    || result?.results || result?.uploaded || result?.files;
  const first = Array.isArray(cand) ? cand[0] : cand;
  if (!first) return null;
  if (typeof first === 'string') return first;
  return first.image_url || first.url || first.path || first.src || first.location || null;
}

/**
 * Rich text editor built on Tiptap (ProseMirror) — free/MIT and React 19 ready.
 *
 * Replaces the previous contentEditable + document.execCommand editor, whose
 * list/formatting behaviour was unreliable (execCommand is deprecated). Tiptap
 * gives rock-solid bullet/numbered lists, headings, links, blockquotes, and
 * undo/redo, and outputs clean HTML via editor.getHTML().
 *
 * Drop-in API (unchanged): `value` (HTML string) and `onChange(html)`. Kept the
 * rte-* class names so every existing usage keeps working.
 */
const Editor = ({ value, onChange, placeholder = 'Start typing...', ...props }) => {
  // Source (HTML) mode — lets an admin paste raw HTML and have it render as
  // real formatting instead of literal <p>/<li> tags (Tiptap keeps pasted
  // content as plain text when the clipboard has no HTML flavour).
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const editor = useEditor({
    // Required for Next.js SSR — render on the client only to avoid hydration
    // mismatches (Tiptap recommends this for SSR frameworks).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, HTMLAttributes: { class: 'rte-img' } }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      if (!onChange) return;
      const html = editor.getHTML();
      // Normalise Tiptap's empty document to '' to match the old editor.
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Push external value changes (e.g. loading an existing post to edit) into the
  // editor without emitting an update or stealing the caret on every keystroke.
  // Skip while in source mode so it doesn't clobber what's being typed there.
  useEffect(() => {
    if (!editor || sourceMode) return;
    const current = editor.getHTML();
    const next = value || '';
    if (next !== current && !(next === '' && current === '<p></p>')) {
      editor.commands.setContent(next, false);
    }
  }, [value, editor, sourceMode]);

  if (!editor) {
    return <div style={{ minHeight: 150, border: '1px solid #e5e7eb', borderRadius: 6 }} />;
  }

  // Toggle between the rich editor and raw-HTML source. Entering source mode
  // seeds the textarea with the current HTML; leaving it parses the HTML back
  // into the document (which emits onChange with clean, rendered HTML).
  const toggleSource = () => {
    if (sourceMode) {
      editor.commands.setContent(sourceHtml || '', true);
      setSourceMode(false);
    } else {
      setSourceHtml(editor.getHTML());
      setSourceMode(true);
    }
  };

  const setLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Insert an image by URL (always available, no upload needed).
  const insertImageByUrl = () => {
    const url = window.prompt('Image URL:', 'https://');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  // Upload a picked file via the existing media endpoint, then insert it.
  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      const result = await productService.uploadImages([file]);
      const path = extractUploadedPath(result);
      const src = resolveMediaUrl(path);
      if (src) {
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      } else {
        window.alert('Upload succeeded but no image URL was returned. You can paste the image URL instead.');
      }
    } catch (err) {
      window.alert('Image upload failed: ' + (err?.message || 'Unknown error') + '. You can paste an image URL instead.');
    } finally {
      setUploading(false);
    }
  };

  const items = [
    { t: 'Bold', l: 'B', s: { fontWeight: 700 }, on: () => editor.chain().focus().toggleBold().run(), a: editor.isActive('bold') },
    { t: 'Italic', l: 'I', s: { fontStyle: 'italic' }, on: () => editor.chain().focus().toggleItalic().run(), a: editor.isActive('italic') },
    { t: 'Underline', l: 'U', s: { textDecoration: 'underline' }, on: () => editor.chain().focus().toggleUnderline().run(), a: editor.isActive('underline') },
    { t: 'Strikethrough', l: 'S', s: { textDecoration: 'line-through' }, on: () => editor.chain().focus().toggleStrike().run(), a: editor.isActive('strike') },
    { sep: true },
    { t: 'Heading 2', l: 'H2', on: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), a: editor.isActive('heading', { level: 2 }) },
    { t: 'Heading 3', l: 'H3', on: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), a: editor.isActive('heading', { level: 3 }) },
    { t: 'Paragraph', l: '¶', on: () => editor.chain().focus().setParagraph().run(), a: editor.isActive('paragraph') },
    { sep: true },
    { t: 'Bullet List', l: '•', on: () => editor.chain().focus().toggleBulletList().run(), a: editor.isActive('bulletList') },
    { t: 'Numbered List', l: '1.', on: () => editor.chain().focus().toggleOrderedList().run(), a: editor.isActive('orderedList') },
    { t: 'Quote', l: '❝', on: () => editor.chain().focus().toggleBlockquote().run(), a: editor.isActive('blockquote') },
    { sep: true },
    { t: 'Insert Link', l: '🔗', on: setLink, a: editor.isActive('link') },
    { t: uploading ? 'Uploading…' : 'Upload image', l: uploading ? '⏳' : '🖼️', on: () => { if (!uploading) fileInputRef.current?.click(); } },
    { t: 'Image by URL', l: '🌐', on: insertImageByUrl },
    { t: 'Clear Formatting', l: '✕', on: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
    { sep: true },
    { t: 'Undo', l: '↺', on: () => editor.chain().focus().undo().run() },
    { t: 'Redo', l: '↻', on: () => editor.chain().focus().redo().run() },
  ];

  return (
    <div className="rte-container" {...props}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFile}
      />
      <div className="rte-toolbar">
        {!sourceMode && items.map((btn, i) =>
          btn.sep ? <span key={i} className="rte-sep" /> : (
            <button
              key={i}
              type="button"
              className={`rte-btn${btn.a ? ' is-active' : ''}`}
              title={btn.t}
              style={btn.s}
              onMouseDown={(e) => { e.preventDefault(); btn.on(); }}
            >
              {btn.l}
            </button>
          )
        )}
        <span className="rte-sep" />
        <button
          type="button"
          className={`rte-btn${sourceMode ? ' is-active' : ''}`}
          title={sourceMode ? 'Back to editor' : 'Edit / paste HTML source'}
          onMouseDown={(e) => { e.preventDefault(); toggleSource(); }}
        >
          {sourceMode ? 'Done' : '</>'}
        </button>
      </div>
      {sourceMode ? (
        <textarea
          className="rte-source"
          value={sourceHtml}
          spellCheck={false}
          placeholder="Paste or edit raw HTML here, then click Done."
          onChange={(e) => setSourceHtml(e.target.value)}
        />
      ) : (
        <div className="rte-editor-wrap">
          <EditorContent editor={editor} />
        </div>
      )}
      <style jsx>{`
        .rte-container { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; background: #fff; }
        .rte-toolbar { display: flex; flex-wrap: wrap; gap: 2px; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; background: #fafafa; }
        .rte-btn { border: none; background: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #333; font-family: inherit; min-width: 28px; }
        .rte-btn:hover { background: #e5e7eb; }
        .rte-btn.is-active { background: #dbeafe; color: #1d4ed8; }
        .rte-sep { width: 1px; background: #e5e7eb; margin: 0 4px; align-self: stretch; }
        .rte-source { width: 100%; min-height: 220px; padding: 12px; border: none; outline: none; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.5; color: #333; box-sizing: border-box; }
        .rte-editor-wrap :global(.ProseMirror) { min-height: 150px; padding: 12px; outline: none; font-size: 14px; line-height: 1.6; color: #333; }
        .rte-editor-wrap :global(.ProseMirror:focus) { outline: none; }
        .rte-editor-wrap :global(.ProseMirror h2) { font-size: 1.3em; font-weight: 700; margin: 0.5em 0; }
        .rte-editor-wrap :global(.ProseMirror h3) { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; }
        .rte-editor-wrap :global(.ProseMirror ul) { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .rte-editor-wrap :global(.ProseMirror ol) { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .rte-editor-wrap :global(.ProseMirror blockquote) { border-left: 3px solid #e5e7eb; padding-left: 1em; margin: 0.5em 0; color: #555; }
        .rte-editor-wrap :global(.ProseMirror a) { color: #2563eb; text-decoration: underline; }
        .rte-editor-wrap :global(.ProseMirror img) { max-width: 100%; height: auto; border-radius: 6px; margin: 0.5em 0; }
        .rte-editor-wrap :global(.ProseMirror img.ProseMirror-selectednode) { outline: 2px solid #2563eb; }
        .rte-editor-wrap :global(.ProseMirror p.is-editor-empty:first-child::before) {
          content: attr(data-placeholder);
          color: #aaa;
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default Editor;
