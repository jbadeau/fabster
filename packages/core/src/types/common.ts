/** An external HTTP API the unit is allowed to call. */
export interface ApiAccess {
  readonly name: string;
  /** Base URL, e.g. "https://api.github.com". Its host is allow-listed for network. */
  readonly baseUrl?: string;
  /** Logical scopes/permissions requested from the API, e.g. ["repo", "read:org"]. */
  readonly scopes?: readonly string[];
}

/** An external system (database, queue, cache, SaaS, object store) the unit integrates with. */
export interface ExternalSystemAccess {
  readonly name: string;
  /** Category, e.g. "database" | "queue" | "cache" | "saas" | "storage". */
  readonly kind?: string;
  /** Network host, if remote. Allow-listed for network when present. */
  readonly host?: string;
}

/**
 * What a command or task is allowed to touch. Deny-by-default: anything not
 * declared here is blocked by the runtime sandbox (nono).
 */
export interface Permissions {
  readonly fs?: {
    readonly read?: readonly string[];
    readonly write?: readonly string[];
  };
  readonly tools?: readonly string[];
  readonly network?: readonly string[];
  /** External HTTP APIs. Their hosts are allow-listed for network access. */
  readonly apis?: readonly ApiAccess[];
  /** External systems (databases, queues, SaaS). Remote hosts are allow-listed. */
  readonly externalSystems?: readonly ExternalSystemAccess[];
  /**
   * Secret NAMES the unit may use (never values). At run time the sandbox
   * injects only these from the OS keystore; everything else stays unreadable.
   */
  readonly secrets?: readonly string[];
}
