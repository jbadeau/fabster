export type {
  Resource,
  Workspace,
  WorkspaceOptions,
  MountMode,
  RAMResource,
  GitHubResourceLike,
  S3ResourceLike,
  DiscordResourceLike,
} from '@struktoai/mirage-core';

export interface WorkspaceDefinition {
  readonly mounts: Record<string, import('@struktoai/mirage-core').Resource>;
}
