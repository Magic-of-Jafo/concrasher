import { RefObject, useEffect } from 'react';

/**
 * Feed a File into an existing <input type="file"> and fire its change event, so
 * a pasted image flows through the component's normal onChange handler unchanged.
 */
export function fileToInput(input: HTMLInputElement | null, file: File) {
    if (!input) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

interface UsePasteImageOptions {
    /** When false, the paste listener is detached. */
    enabled?: boolean;
    /**
     * Optional element to scope pasting to. When provided, a paste only counts
     * if that element is hovered or contains focus — so multiple upload boxes on
     * one screen don't all grab the same paste. Omit for single-focus surfaces
     * like a modal dialog, where a document-wide listener is unambiguous.
     */
    targetRef?: RefObject<HTMLElement | null>;
}

/**
 * Accept an image pasted from the clipboard (Ctrl/Cmd+V) anywhere we accept an
 * image upload. Converts the pasted blob into a named File and hands it to
 * `onImage`, mirroring what a file-input selection would yield.
 */
export function usePasteImage(onImage: (file: File) => void, opts: UsePasteImageOptions = {}) {
    const { enabled = true, targetRef } = opts;
    useEffect(() => {
        if (!enabled) return;
        const handler = (e: ClipboardEvent) => {
            if (targetRef) {
                const el = targetRef.current;
                if (!el) return;
                const hovered = typeof el.matches === 'function' && el.matches(':hover');
                const focused = el.contains(document.activeElement);
                if (!hovered && !focused) return;
            }
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type && item.type.startsWith('image/')) {
                    const blob = item.getAsFile();
                    if (blob) {
                        const ext = (item.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
                        const file = new File([blob], `pasted-image-${Date.now()}.${ext}`, { type: item.type });
                        e.preventDefault();
                        onImage(file);
                        return;
                    }
                }
            }
        };
        document.addEventListener('paste', handler);
        return () => document.removeEventListener('paste', handler);
    }, [enabled, onImage, targetRef]);
}
