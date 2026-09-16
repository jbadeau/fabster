import { describe, expect, it } from 'vitest';
import { run } from '../run.js';

describe('@fabster/cli', () => {
  it('exports the run function', () => {
    expect(typeof run).toBe('function');
  });

  it('throws on missing workflow file', async () => {
    await expect(run('/nonexistent/file.ts', {})).rejects.toThrow();
  });
});
