import { vi } from 'vitest';

// Mock console methods pour éviter le bruit dans les tests
global.console = {
	...console,
	error: vi.fn(),
	warn: vi.fn(),
	log: vi.fn(),
};

