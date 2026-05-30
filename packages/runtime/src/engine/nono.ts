import type { Permissions } from '@fabster/core';

const NONO_BIN = 'nono';

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
 * Wrap a command with nono sandbox based on permissions.
 * Every command runs through nono when available — deny by default.
 *
 * - Filesystem: only paths declared in permissions.fs are accessible
 * - Network: only hosts declared in permissions.network are reachable (all blocked if not declared)
 * - Secrets: only secrets declared in permissions.secrets are injected from system keystore
 */
export function wrapWithNono(
  command: string,
  cwd: string,
  permissions?: Permissions,
): string {
  const args: string[] = [NONO_BIN, 'run'];

  // Filesystem: allow declared paths, block everything else
  const fsRead = permissions?.fs?.read;
  const fsWrite = permissions?.fs?.write;
  if (fsRead?.length) {
    for (const p of fsRead) {
      args.push('--allow-read', p.replace('/repo', cwd));
    }
  }
  if (fsWrite?.length) {
    for (const p of fsWrite) {
      args.push('--allow-write', p.replace('/repo', cwd));
    }
  }
  // If no fs permissions declared, allow read/write to cwd (minimum for any command to work)
  if (!fsRead?.length && !fsWrite?.length) {
    args.push('--allow', cwd);
  }

  // Network: allow declared hosts, block everything else
  const network = permissions?.network;
  if (network?.length) {
    for (const host of network) {
      args.push('--allow-host', host);
    }
  } else {
    args.push('--block-network');
  }

  // Secrets: inject from system keystore
  const secrets = permissions?.secrets;
  if (secrets?.length) {
    for (const secret of secrets) {
      args.push('--secrets', secret);
    }
  }

  args.push('--');
  args.push(command);

  return args.join(' ');
}
