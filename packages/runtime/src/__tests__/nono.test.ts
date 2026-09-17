import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { isNonoAvailable, wrapWithNono } from '../engine/nono.js';

const execFileAsync = promisify(execFile);

describe('wrapWithNono', () => {
  it('uses the real nono CLI flags, not the ones from an earlier, unverified draft', () => {
    const wrapped = wrapWithNono('npm install', '/work', {
      fs: { read: ['/repo/**'], write: ['/repo/packages/**'] },
      network: ['registry.npmjs.org'],
      secrets: ['npm_token', 'github_token'],
    });

    // nono run's actual flags are --read/--write/--allow (plain directories,
    // no glob expansion), --allow-domain, --block-net, and a single
    // comma-joined --env-credential — confirmed against the installed
    // binary's --help and by spawning it directly, not from documentation.
    expect(wrapped).toContain('--read /work');
    expect(wrapped).toContain('--write /work/packages');
    expect(wrapped).toContain('--allow-domain registry.npmjs.org');
    expect(wrapped).toContain('--env-credential npm_token,github_token');
    expect(wrapped).not.toContain('--allow-read');
    expect(wrapped).not.toContain('--allow-write');
    expect(wrapped).not.toContain('--allow-host');
    expect(wrapped).not.toContain('--secrets ');
  });

  it('strips the glob suffix from fs patterns — nono grants plain directories, not globs', () => {
    const wrapped = wrapWithNono('true', '/work', {
      fs: { read: ['/repo/**'], write: [] },
    });

    expect(wrapped).toContain('--read /work');
    expect(wrapped).not.toContain('/work/**');
  });

  it('blocks network by default when nothing is declared', () => {
    const wrapped = wrapWithNono('true', '/work', {});

    expect(wrapped).toContain('--block-net');
  });
});

describe('nono (real binary)', () => {
  it('actually enforces the filesystem grant it was given', async () => {
    if (!(await isNonoAvailable())) return; // not installed in this environment

    // NOT under tmpdir(): verified directly (`-v` capability dump) that
    // nono's built-in macOS default groups grant blanket r+w on the whole
    // /tmp (and /private/var/folders) tree, independent of any --allow/
    // --read/--write passed — so a denial test rooted in tmpdir() would
    // pass for the wrong reason. This also means a workspace living under
    // /tmp (examples/todomvc's default) can never get real filesystem
    // isolation from nono on macOS, regardless of what Permissions.fs
    // declares — worth knowing before trusting that demo's sandboxing.
    const root = await mkdtemp(join(homedir(), '.fabster-nono-test-'));
    const dir = join(root, 'granted');
    const outsideDir = join(root, 'not-granted');
    await mkdir(dir, { recursive: true });
    await mkdir(outsideDir, { recursive: true });
    try {
      // Allowed: writing inside the granted directory.
      await execFileAsync('nono', [
        'run', '--allow', dir, '--block-net', '--',
        'sh', '-c', `echo ok > ${dir}/inside.txt`,
      ]);
      expect((await readFile(join(dir, 'inside.txt'), 'utf8')).trim()).toBe('ok');

      // Denied: writing to a real sibling directory that was never granted.
      await expect(
        execFileAsync('nono', [
          'run', '--allow', dir, '--block-net', '--',
          'sh', '-c', `echo leak > ${outsideDir}/leak.txt`,
        ]),
      ).rejects.toThrow();
      await expect(readFile(join(outsideDir, 'leak.txt'), 'utf8')).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
