import { config } from 'dotenv';
import { vi } from 'vitest';

config(); // Load .env file

// Mock $env/dynamic/private
vi.mock('$env/dynamic/private', () => ({
	env: process.env
}));
