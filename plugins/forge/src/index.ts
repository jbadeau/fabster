// Commands
export { validateRepo } from './commands/validate-repo.js';
export { detectProjectTypes } from './commands/detect-project-types.js';
export { cleanupLegacy } from './commands/cleanup-legacy.js';
export { writeForgeConfigs } from './commands/write-forge-configs.js';
export { installDependencies } from './commands/install-dependencies.js';
export { addForgePlugins } from './commands/add-forge-plugins.js';
export { runForgeUpgrade } from './commands/run-forge-upgrade.js';
export { runNxSync } from './commands/run-nx-sync.js';

// Tasks
export { migrateMaven } from './tasks/migrate-maven.js';
export { migrateDocker } from './tasks/migrate-docker.js';
export { migrateHelm } from './tasks/migrate-helm.js';
export { migrateReact } from './tasks/migrate-react.js';
export { migratePlaywright } from './tasks/migrate-playwright.js';
export { migrateStorybook } from './tasks/migrate-storybook.js';
export { migrateOpenapi } from './tasks/migrate-openapi.js';

// Agents
export { forgeMigrator } from './agents/forge-migrator.js';

// Workflow
export { forgeUpgrade } from './workflows/forge-upgrade.js';
export type { ForgeUpgradeConfig } from './workflows/forge-upgrade.js';
