export interface Permissions {
  readonly fs?: {
    readonly read?: readonly string[];
    readonly write?: readonly string[];
  };
  readonly tools?: readonly string[];
  readonly network?: readonly string[];
}
