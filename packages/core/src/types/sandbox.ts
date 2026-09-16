export interface SandboxProfileConfig {
  readonly backend?: string;
  readonly image?: string;
  readonly network?: 'none' | 'restricted' | 'full' | (string & {});
  readonly readonlyRoot?: boolean;
  readonly env?: Record<string, string>;
}

export interface SandboxProfile {
  readonly name: string;
  readonly config: SandboxProfileConfig & { readonly backend: string };
}
