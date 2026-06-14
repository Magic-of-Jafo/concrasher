import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for jsdom — required by @mui/x-data-grid
// (and other modern libs) which reference them at import time.
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder as typeof global.TextEncoder;
}
if (typeof (global as any).TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}
