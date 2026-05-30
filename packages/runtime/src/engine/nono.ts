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
 * If nono is not available, returns the command unchanged.
 */
export function wrapWithNono(
  command: string,
  cwd: string,
  permissions?: Permissions,
): string {
  if (!permissions) return command;

  const secrets = permissions.secrets;
  const fsRead = permissions.fs?.read;
  const fsWrite = permissions.fs?.write;
  const network = permissions.network;

  // Only wrap if there are secrets or restrictions to enforce
  if (!secrets?.length && !fsRead?.length && !fsWrite?.length && !network?.length) {
    return command;
  }

  const args: string[] = [NONO_BIN, 'run'];

  // Secrets: inject from system keystore
  if (secrets?.length) {
    for (const secret of secrets) {
      args.push('--secrets', secret);
    }
  }

  // Filesystem: allow paths
  if (fsRead?.length) {
    for (const path of fsRead) {
      args.push('--allow-read', path.replace('/repo', cwd));
    }
  }
  if (fsWrite?.length) {
    for (const path of fsWrite) {
      args.push('--allow-write', path.replace('/repo', cwd));
    }
  }

  // Network: if not specified, block all
  if (network?.length) {
    for (const host of network) {
      args.push('--allow-host', host);
    }
  }

  args.push('--');
  args.push(command);

  return args.join(' ');
}
