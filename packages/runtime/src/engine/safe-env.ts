/**
 * The minimum environment a spawned process needs to actually run — shell
 * lookup, HOME-relative tool caches, locale, terminal/CI detection, and
 * network routing. Nothing else passes through by default.
 *
 * Effects previously inherited the full parent `process.env` unconditionally
 * (both `run()` steps via mise and agent subprocesses), which meant that
 * without nono actively stripping it back down, an untrusted agent or a
 * compromised dependency pulled in by a `run()` step could read anything
 * sitting in the engine's own environment — API keys, CI tokens, whatever
 * happened to be exported in the parent shell. Declared secrets
 * (`Permissions.secrets`) are the sanctioned path for a node to actually
 * need a credential; nono resolves those from the system keystore, never
 * from inherited env vars. This allowlist is the floor underneath that,
 * so the floor itself doesn't leak secrets when nono isn't installed.
 */
const SAFE_ENV_KEYS = [
  'PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL',
  'TMPDIR', 'TMP', 'TEMP',
  'LANG', 'LC_ALL',
  'TERM', 'CI', 'NODE_ENV',
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY',
  'http_proxy', 'https_proxy', 'no_proxy',
  'SYSTEMROOT', 'WINDIR', 'PATHEXT', // Windows
] as const;

export function safeEnv(overrides?: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of SAFE_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return { ...env, ...overrides };
}
