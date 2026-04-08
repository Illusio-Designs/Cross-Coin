import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Lightweight rich text editor — no external deps.
 * Replaces react-quill for React 19 compatibility.
 * Uses contentEditable + execCommand (works in all browsers).
 */

const TOOLBAR = [
  { cmd: 'bold', icon: 'B', title: 'Bold', style: { fontWeight: 700 } },
  { cmd: 'italic', icon: 'I', title: 'Italic', style: { fontStyle: 'italic' } },
  { cmd: 'underline', icon: 'U', title: 'Underline', style: { textDecoration: 'underline' } },
  { cmd: 'strikeThrough', icon: 'S', title: 'Strikethrough', style: { textDecoration: 'line-through' } },
  { sep: true },
  { cmd: 'insertOrderedList', icon: '1.', title: 'Ordered List' },
  { cmd: 'insertUnorderedList', icon: '•', title: 'Bullet List' },
  { sep: true },
  { cmd: 'formatBlock', arg: 'H2', icon: 'H2', title: 'Heading 2' },
  { cmd: 'formatBlock', arg: 'H3', icon: 'H3', title: 'Heading 3' },
  { cmd: 'formatBlock', arg: 'P', icon: '¶', title: 'Paragraph' },
  { sep: true },
  { cmd: 'createLink', icon: '🔗', title: 'Insert Link', prompt: true },
  { cmd: 'removeFormat', icon: '✕', title: 'Clear Formatting' },
];

const QuillEditor = ({ value, onChange, placeholder = 'Start typing...', ...props }) => {
  const editorRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const isInternalChange = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // Sync external value → editor
  useEffect(() => {
    if (!editorRef.current || isInternalChange.current) return;
    if (editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    if (onChange) onChange(html === '<br>' || html === '<div><br></div>' ? '' : html);
    requestAnimationFrame(() => { isInternalChange.current = false; });
  }, [onChange]);

  const exec = useCallback((cmd, arg) => {
    if (cmd === 'createLink') {
      const url = prompt('Enter URL:', 'https://');
      if (url) document.execCommand(cmd, false, url);
    } else {
      document.execCommand(cmd, false, arg || null);
    }
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  if (!mounted) return <div style={{ minHeight: 150, border: '1px solid #e5e7eb', borderRadius: 6 }} />;

  return (
    <div className="rte-container" {...props}>
      <div className="rte-toolbar">
        {TOOLBAR.map((btn, i) =>
          btn.sep ? <span key={i} className="rte-sep" /> : (
            <button
              key={i}
              type="button"
              className="rte-btn"
              title={btn.title}
              style={btn.style}
              onMouseDown={e => { e.preventDefault(); exec(btn.cmd, btn.arg); }}
            >
              {btn.icon}
            </button>
          )
        )}
      </div>
      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
      <style jsx>{`
        .rte-container { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; background: #fff; }
        .rte-toolbar { display: flex; flex-wrap: wrap; gap: 2px; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; background: #fafafa; }
        .rte-btn { border: none; background: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #333; font-family: inherit; min-width: 28px; }
        .rte-btn:hover { background: #e5e7eb; }
        .rte-sep { width: 1px; background: #e5e7eb; margin: 0 4px; align-self: stretch; }
        .rte-editor { min-height: 150px; padding: 12px; outline: none; font-size: 14px; line-height: 1.6; color: #333; }
        .rte-editor:empty:before { content: attr(data-placeholder); color: #aaa; pointer-events: none; }
        .rte-editor h2 { font-size: 1.3em; font-weight: 700; margin: 0.5em 0; }
        .rte-editor h3 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; }
        .rte-editor ul, .rte-editor ol { padding-left: 1.5em; }
        .rte-editor a { color: #2563eb; text-decoration: underline; }
      `}</style>
    </div>
  );
};

export default QuillEditor;
