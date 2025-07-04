// jest.polyfills.js

// This file runs before the test environment (JSDOM) is fully set up.
// It's the earliest point to apply global polyfills or console overrides.

// 1. **CRITICAL FIX FOR CONSOLE ERROR SUPPRESSION:**
// We will attempt to suppress the "Not implemented: HTMLFormElement.prototype.requestSubmit" error here.
// This requires capturing the original console.error and then conditionally suppressing specific messages.
const originalConsoleError = console.error;
console.error = (...args) => {
    // Check if the first argument is a string and starts with the exact error message.
    // This is more precise than `includes` and should prevent re-logging.
    if (
        typeof args[0] === 'string' &&
        args[0].startsWith('Error: Not implemented: HTMLFormElement.prototype.requestSubmit')
    ) {
        // If it's the specific error we want to silence, simply return.
        // DO NOT call originalConsoleError(...args) here if you want to suppress it.
        return;
    }
    // For all other console.error calls, let them pass through to the original handler.
    originalConsoleError(...args);
};


// 2. Patch missing globals like TextEncoder/TextDecoder.
// This is done conditionally to avoid errors if they are already defined.
if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    if (typeof global.TextEncoder === 'undefined') {
        global.TextEncoder = TextEncoder;
    }
    if (typeof global.TextDecoder === 'undefined') {
        global.TextDecoder = TextDecoder;
    }
}

// 3. Polyfill HTMLFormElement.prototype.requestSubmit.
// This ensures the method exists, so user-event doesn't hit a completely missing API.
// We make it configurable and writable in case it needs to be mocked later.
if (typeof HTMLFormElement !== 'undefined' && !HTMLFormElement.prototype.requestSubmit) {
    Object.defineProperty(HTMLFormElement.prototype, 'requestSubmit', {
        value: function (submitter) {
            if (submitter && typeof submitter.click === 'function') {
                // If a submitter button is provided, simulate clicking it.
                submitter.click();
            } else {
                // Otherwise, dispatch a generic submit event on the form.
                this.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        },
        configurable: true,
        writable: true,
    });
}