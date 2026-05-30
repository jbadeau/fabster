import { workflow, workspace } from '@fabster/core';
import type { WorkflowDefinition } from '@fabster/core';
import { validateRepo } from '../commands/validate-repo.js';
import { detectProjectTypes } from '../commands/detect-project-types.js';
import { cleanupLegacy } from '../commands/cleanup-legacy.js';
import { writeForgeConfigs } from '../commands/write-forge-configs.js';
import { installDependencies } from '../commands/install-dependencies.js';
import { addForgePlugins } from '../commands/add-forge-plugins.js';
import { runForgeUpgrade } from '../commands/run-forge-upgrade.js';
import { runNxSync } from '../commands/run-nx-sync.js';
import { migrateMaven } from '../tasks/migrate-maven.js';
import { migrateDocker } from '../tasks/migrate-docker.js';
import { migrateHelm } from '../tasks/migrate-helm.js';
import { migrateReact } from '../tasks/migrate-react.js';
import { migratePlaywright } from '../tasks/migrate-playwright.js';
import { migrateStorybook } from '../tasks/migrate-storybook.js';
import { migrateOpenapi } from '../tasks/migrate-openapi.js';

export interface ForgeUpgradeConfig {
  repo: string;
  platform: 'devcloud' | 'codeak';
  projectTypes?: string[];
}

export function forgeUpgrade(config: ForgeUpgradeConfig): WorkflowDefinition {
  return workflow({
    name: 'forge-upgrade',
    purpose: `Upgrade repository to latest Forge version (${config.platform})`,
    workspace: workspace(config.repo),
    graph: (ctx) => {
      const validate = ctx.run('validate-repo', validateRepo, {});

      const detect = ctx.run('detect-project-types', detectProjectTypes, {}, {
        dependsOn: [validate],
      });

      const cleanup = ctx.run('cleanup-legacy', cleanupLegacy, {}, {
        dependsOn: [detect],
      });

      const writeConfigs = ctx.run('write-forge-configs', writeForgeConfigs, {
        platform: config.platform,
      }, { dependsOn: [cleanup] });

      const install = ctx.run('install-dependencies', installDependencies, {}, {
        dependsOn: [writeConfigs],
      });

      const plugins = ctx.run('add-forge-plugins', addForgePlugins, {
        plugins: JSON.stringify(config.projectTypes ?? []),
      }, { dependsOn: [install] });

      // Technology migrations — conditional on projectTypes
      const types = new Set(config.projectTypes ?? []);
      const migrations = [];

      if (types.has('maven')) {
        migrations.push(ctx.run('migrate-maven', migrateMaven, {
          platform: config.platform,
        }, { dependsOn: [plugins] }));
      }

      if (types.has('docker')) {
        migrations.push(ctx.run('migrate-docker', migrateDocker, {
          platform: config.platform,
        }, { dependsOn: [plugins] }));
      }

      if (types.has('helm')) {
        migrations.push(ctx.run('migrate-helm', migrateHelm, {
          platform: config.platform,
        }, { dependsOn: [plugins] }));
      }

      if (types.has('react')) {
        migrations.push(ctx.run('migrate-react', migrateReact, {}, {
          dependsOn: [plugins],
        }));
      }

      if (types.has('playwright')) {
        migrations.push(ctx.run('migrate-playwright', migratePlaywright, {}, {
          dependsOn: [plugins],
        }));
      }

      if (types.has('storybook')) {
        migrations.push(ctx.run('migrate-storybook', migrateStorybook, {}, {
          dependsOn: [plugins],
        }));
      }

      if (types.has('openapi')) {
        migrations.push(ctx.run('migrate-openapi', migrateOpenapi, {}, {
          dependsOn: [plugins],
        }));
      }

      // Final steps depend on all migrations (or just plugins if no migrations)
      const allDone = migrations.length > 0 ? migrations : [plugins];

      const upgrade = ctx.run('run-forge-upgrade', runForgeUpgrade, {}, {
        dependsOn: allDone,
      });

      ctx.run('run-nx-sync', runNxSync, {}, {
        dependsOn: [upgrade],
      });
    },
  });
}
