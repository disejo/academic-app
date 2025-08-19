import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const quillRef = useRef<Quill | null>(null);

    useEffect(() => {
        if (editorRef.current && !quillRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
            });
            quillRef.current.on('text-change', () => {
                if (onChange) {
                    onChange(quillRef.current!.root.innerHTML);
                }
            });
            quillRef.current.root.innerHTML = value || '';
        }
    }, [editorRef, quillRef]);

    useEffect(() => {
        if (quillRef.current && value !== quillRef.current.root.innerHTML) {
            quillRef.current.root.innerHTML = value || '';
        }
    }, [value]);

    return <div ref={editorRef} style={{ height: '300px' }}></div>;
};
export default RichTextEditor;