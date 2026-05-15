import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import { LogOutput } from '../components/log-output.js';

describe('LogOutput', () => {
  it('renders empty state', () => {
    const { lastFrame } = render(<LogOutput logs={[]} />);
    expect(lastFrame()).toContain('No output yet');
  });

  it('renders log lines', () => {
    const logs = [
      '[think] Planning approach...',
      '[tool] readFile',
      '[result] Found 3 files',
      '> nx build',
      'Build successful',
    ];

    const { lastFrame } = render(<LogOutput logs={logs} />);
    const output = lastFrame();

    expect(output).toContain('[think]');
    expect(output).toContain('readFile');
    expect(output).toContain('[result]');
    expect(output).toContain('nx build');
    expect(output).toContain('Build successful');
  });

  it('limits visible lines', () => {
    const logs = Array.from({ length: 30 }, (_, i) => `Line ${i}`);
    const { lastFrame } = render(<LogOutput logs={logs} maxLines={5} />);
    const output = lastFrame();

    expect(output).toContain('Line 29');
    expect(output).toContain('Line 25');
    expect(output).not.toContain('Line 0');
  });
});
