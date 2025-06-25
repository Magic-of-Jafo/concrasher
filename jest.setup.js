import '@testing-library/jest-dom';
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

// Mock next/navigation
// See https://github.com/jestjs/jest/issues/14298#issuecomment-1469032432
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock IntersectionObserver
class IntersectionObserver {
  // ... existing code ...
}