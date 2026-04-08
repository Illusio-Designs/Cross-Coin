import dynamic from 'next/dynamic';
import { useRef, useEffect, useState } from 'react';

/**
 * React 19 compatible Quill wrapper.
 * react-quill uses findDOMNode which was removed in React 19.
 * This wrapper uses a ref-based approach instead.
 */
const QuillEditor = ({ value, onChange, theme = 'snow', ...props }) => {
  const editorRef = useRef(null);
  const [editorHtml, setEditorHtml] = useState(value || '');

  useEffect(() => {
    setEditorHtml(value || '');
  }, [value]);

  useEffect(() => {
    if (typeof window === 'undefined' || !editorRef.current) return;

    let quill;
    const loadQuill = async () => {
      const Quill = (await import('quill')).default;
      if (!editorRef.current || editorRef.current.querySelector('.ql-editor')) return;

      quill = new Quill(editorRef.current, {
        theme,
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            ['clean'],
          ],
        },
      });

      quill.root.innerHTML = editorHtml;

      quill.on('text-change', () => {
        const html = quill.root.innerHTML;
        setEditorHtml(html);
        if (onChange) onChange(html);
      });
    };

    loadQuill();

    return () => {
      if (quill) {
        quill.off('text-change');
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={editorRef} style={{ minHeight: 150 }} {...props} />;
};

export default QuillEditor;
