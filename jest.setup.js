// Suppress only the specific jsdom "Not implemented: HTMLFormElement.prototype.requestSubmit" error
const originalConsoleError = console.error;
console.error = function (...args) {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Not implemented: HTMLFormElement.prototype.requestSubmit')
  ) {
    // Suppress this specific error
    return;
  }
  originalConsoleError.apply(console, args);
};




// Extend Jest's matchers with @testing-library/jest-dom
import '@testing-library/jest-dom';

// Enable fetch mocks using whatwg-fetch and jest-fetch-mock
import 'whatwg-fetch'; // Polyfills fetch for Node.js environment
import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks(); // Enables the mocking functionality


// Mock next/navigation hooks
// Required for components using useRouter, useSearchParams, or usePathname.
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'), // Use actual for non-hook exports
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    // Add other methods if your components use them, e.g.:
    // prefetch: jest.fn(),
    // refresh: jest.fn(),
    // events: { on: jest.fn(), off: jest.fn() },
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    // Add other methods if your components use them, e.g.:
    // append: jest.fn(),
    // delete: jest.fn(),
    // entries: jest.fn(),
    // forEach: jest.fn(),
    // getAll: jest.fn(),
    // has: jest.fn(),
    // keys: jest.fn(),
    // set: jest.fn(),
    // values: jest.fn(),
    // toString: jest.fn(),
  }),
  usePathname: jest.fn(),
}));


// Polyfill IntersectionObserver (typically fine in setupFilesAfterEnv)
// JSDOM doesn't implement this, so a mock is needed for components that use it.
if (typeof global.IntersectionObserver === 'undefined') {
  class IntersectionObserver {
    constructor(callback, options) { }
    observe(target) { }
    unobserve(target) { }
    disconnect() { }
  }
  global.IntersectionObserver = IntersectionObserver;
}

import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
