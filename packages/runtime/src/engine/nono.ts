import { homedir } from 'node:os';
import path from 'node:path';
import type { Permissions } from '@fabster/core';

const NONO_BIN = 'nono';

/**
 * The tool managers' own state/data/config/cache — not workflow data, but
 * mise- and npm-based execution genuinely can't function without writing
 * here. Verified directly, not assumed: sandboxing only the worktree made
 * `mise exec` fail ("failed to ln -sf .../trusted-configs/...", marking a
 * project directory as trusted), mise's own binary-path cache warn on every
 * call ("failed to write cache file: ~/Library/Caches/mise/..."), and npm
 * fail outright ("EPERM ... /Users/.../\.npm/_cacache", its global cache).
 * Granted unconditionally, the same way nono itself always grants a set of
 * baseline OS paths — this is the engine's own tooling infrastructure, not
 * something a workflow author should have to remember to declare per node.
 * (~/.npmrc is deliberately left ungranted — nono treats it as a protected
 * credentials file, which is correct: a real private-registry token
 * belongs in Permissions.secrets, not ambient .npmrc access.)
 */
function toolingInfraDirs(): string[] {
  const home = homedir();
  const stateHome = process.env['XDG_STATE_HOME'] ?? path.join(home, '.local', 'state');
  const dataHome = process.env['XDG_DATA_HOME'] ?? path.join(home, '.local', 'share');
  const configHome = process.env['XDG_CONFIG_HOME'] ?? path.join(home, '.config');
  const cacheHome = process.env['XDG_CACHE_HOME'] ?? path.join(home, '.cache');
  return [
    path.join(stateHome, 'mise'),
    path.join(dataHome, 'mise'),
    path.join(configHome, 'mise'),
    path.join(cacheHome, 'mise'),
    path.join(home, 'Library', 'Caches', 'mise'), // macOS: mise caches here regardless of XDG_CACHE_HOME
    path.join(home, '.npm'),
  ];
}

/**
 * Nx's background daemon and plugin-worker processes talk over Unix domain
 * sockets nested under /tmp/.nx/<uid>/sockets/<workspace-hash>/*.sock —
 * every nx-based command needs this. Verified directly, twice: granting
 * only .../sockets with --allow-unix-socket-dir-bind (non-recursive) still
 * failed ("listen EPERM ... sockets/09448623/...") because of that extra,
 * workspace-hashed directory level; --allow-unix-socket-subtree-bind is the
 * recursive variant. Socket bind is a distinct nono capability from plain
 * file access — granting the directory for file I/O does not cover it.
 */
function toolingSocketDirs(): string[] {
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;
  return uid === undefined ? [] : [path.join('/tmp/.nx', String(uid), 'sockets')];
}

/**
 * git itself needs to read the user's global config for basic operations —
 * verified directly: `commitChanges` (the engine's own seal step, running
 * in the same sandboxed scope as the node's effect) failed outright with
 * "fatal: unable to access '~/.gitconfig': Operation not permitted" with
 * no other grant covering it. Read-only: nothing about sealing a verified
 * commit needs to write global git config.
 */
function toolingReadOnlyFiles(): string[] {
  return [path.join(homedir(), '.gitconfig')];
}

/**
 * Check if nono is available on the system.
 */
let nonoAvailable: boolean | undefined;
export async function isNonoAvailable(): Promise<boolean> {
  if (nonoAvailable !== undefined) return nonoAvailable;
  try {
    const { execSync } = await import('node:child_process');
    execSync(`${NONO_BIN} --version`, { stdio: 'ignore' });
    nonoAvailable = true;
  } catch {
    nonoAvailable = false;
  }
  return nonoAvailable;
}

/**
 * A fabster fs pattern is glob-shaped ('/repo/**', '/repo/packages/**') but
 * nono's --read/--write/--allow take a plain, existing directory (recursive
 * grant) — it does not glob-expand, and silently drops a grant it can't
 * resolve to a real path (verified directly: `--allow '/x/**'` logs "does
 * not exist and will be ignored" and the grant never applies). Strip a
 * trailing /** or /* to get the directory the glob was scoping to.
 */
function toDirectory(pattern: string): string {
  return pattern.replace(/\/\*\*?$/, '');
}

/**
 * Wrap a command with nono sandbox based on permissions.
 * Every command runs through nono when available — deny by default.
 *
 * - Filesystem: only paths declared in permissions.fs are accessible, plus
 *   the tool managers' own state (see toolingInfraDirs) so mise/npm work
 * - Network: only hosts declared in permissions.network are reachable (all blocked if not declared)
 * - Secrets: only secrets declared in permissions.secrets are injected from system keystore
 */
export function wrapWithNono(
  command: string,
  cwd: string,
  permissions?: Permissions,
): string {
  const args: string[] = [NONO_BIN, 'run'];

  for (const dir of toolingInfraDirs()) {
    args.push('--allow', dir);
  }
  for (const dir of toolingSocketDirs()) {
    args.push('--allow-unix-socket-subtree-bind', dir);
  }
  for (const file of toolingReadOnlyFiles()) {
    args.push('--read-file', file);
  }

  // Filesystem: allow declared paths, block everything else
  const fsRead = permissions?.fs?.read;
  const fsWrite = permissions?.fs?.write;
  if (fsRead?.length) {
    for (const p of fsRead) {
      args.push('--read', toDirectory(p.replace('/repo', cwd)));
    }
  }
  if (fsWrite?.length) {
    for (const p of fsWrite) {
      args.push('--write', toDirectory(p.replace('/repo', cwd)));
    }
  }
  // If no fs permissions declared, allow read/write to cwd (minimum for any command to work)
  if (!fsRead?.length && !fsWrite?.length) {
    args.push('--allow', cwd);
  }

  // Network: allow declared hosts, block everything else. Declared API base
  // URLs and remote external-system hosts also join the allow-list, so those
  // declarations are enforced rather than merely descriptive.
  const allowedHosts = new Set<string>();
  for (const host of permissions?.network ?? []) allowedHosts.add(host);
  for (const api of permissions?.apis ?? []) {
    const host = hostOf(api.baseUrl);
    if (host) allowedHosts.add(host);
  }
  for (const sys of permissions?.externalSystems ?? []) {
    if (sys.host) allowedHosts.add(sys.host);
  }
  if (allowedHosts.size > 0) {
    for (const host of allowedHosts) {
      args.push('--allow-domain', host);
    }
  } else {
    args.push('--block-net');
  }

  // Secrets: inject only the declared names from the system keystore. Values
  // never appear in definitions, prompts, or logs — nono resolves them into
  // the sandboxed process environment at run time. Anything not listed here is
  // unreadable to the command and to any agent driving it. --env-credential
  // takes one comma-joined value — it errors if passed more than once.
  const secrets = permissions?.secrets;
  if (secrets?.length) {
    args.push('--env-credential', secrets.join(','));
  }

  args.push('--');
  args.push(command);

  return args.join(' ');
}

/** Extract the host (with port, if any) from a URL string, or undefined. */
function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    // Bare host (no scheme) — use as-is.
    return url.replace(/^\/+/, '').split('/')[0] || undefined;
  }
}
