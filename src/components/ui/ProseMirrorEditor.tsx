'use client';

import React, { useEffect, useRef } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { exampleSetup } from 'prosemirror-example-setup';
import { Box } from '@mui/material';
import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-menu/style/menu.css';
import 'prosemirror-example-setup/style/style.css';


interface ProseMirrorEditorProps {
    value: string;
    onChange: (html: string) => void;
    disabled?: boolean;
}

// Mix in list-related nodes and marks from prosemirror-schema-list
const mySchema = new Schema({
    nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
    marks: basicSchema.spec.marks
});

const ProseMirrorEditor: React.FC<ProseMirrorEditorProps> = ({ value, onChange, disabled = false }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isFirstRender = useRef(true);

    // Initialize editor view
    useEffect(() => {
        if (!editorRef.current || viewRef.current) {
            return;
        }

        const docNode = document.createElement('div');
        docNode.innerHTML = value || '';

        const state = EditorState.create({
            doc: DOMParser.fromSchema(mySchema).parse(docNode),
            plugins: exampleSetup({ schema: mySchema }),
        });

        const view = new EditorView(editorRef.current, {
            state,
            dispatchTransaction(transaction) {
                if (disabled) return;
                const newState = view.state.apply(transaction);
                view.updateState(newState);

                // Only call onChange if the document has changed
                if (!transaction.docChanged) {
                    return;
                }

                const serializer = DOMSerializer.fromSchema(mySchema);
                const fragment = serializer.serializeFragment(newState.doc.content);
                const div = document.createElement('div');
                div.appendChild(fragment);
                onChange(div.innerHTML);
            },
            editable: () => !disabled,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // Update editor content when `value` prop changes from outside
    useEffect(() => {
        // Skip the very first render because the editor is initialized with the value.
        // Also skip if the view isn't ready yet.
        if (isFirstRender.current || !viewRef.current) {
            isFirstRender.current = false;
            return;
        }

        const view = viewRef.current;
        const currentState = view.state;

        // Create a temporary div to serialize the current editor state to HTML
        const tempDiv = document.createElement('div');
        const fragment = DOMSerializer.fromSchema(mySchema).serializeFragment(currentState.doc.content);
        tempDiv.appendChild(fragment);
        const currentHtml = tempDiv.innerHTML;

        // Only update if the external value is different from the editor's content
        if (value !== currentHtml) {
            const newDocNode = document.createElement('div');
            newDocNode.innerHTML = value || '';
            const newState = EditorState.create({
                doc: DOMParser.fromSchema(mySchema).parse(newDocNode),
                plugins: exampleSetup({ schema: mySchema }),
            });
            view.updateState(newState);
        }
    }, [value]);

    // Handle disabled state changes
    useEffect(() => {
        if (viewRef.current) {
            viewRef.current.setProps({
                editable: () => !disabled,
            });
        }
    }, [disabled]);


    return <Box ref={editorRef} sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        '& .ProseMirror': {
            minHeight: '150px',
            outline: 'none',
        }
    }} />;
};

export default ProseMirrorEditor; 