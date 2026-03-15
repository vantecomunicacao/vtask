import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Silence console.error in tests unless explicitly enabled
vi.spyOn(console, 'error').mockImplementation(() => undefined);
