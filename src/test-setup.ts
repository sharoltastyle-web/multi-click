import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

// The service worker registration module only exists in a real build.
vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn(() => async () => {}) }));
