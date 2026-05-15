import type { SandboxProfile, SandboxProfileConfig } from '../types/sandbox.js';

export function sandboxProfile(
  name: string,
  config?: SandboxProfileConfig,
): SandboxProfile {
  return Object.freeze({
    name,
    config: Object.freeze({
      backend: 'bubblewrap',
      ...config,
    }),
  });
}
