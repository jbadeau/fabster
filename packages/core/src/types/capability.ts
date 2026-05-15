export type AttributeValue = string | number | boolean | string[];

export interface Requirement {
  readonly namespace: string;
  readonly filter: Record<string, AttributeValue>;
  readonly optional?: boolean;
}

export interface Capability {
  readonly namespace: string;
  readonly attributes: Record<string, AttributeValue>;
}
