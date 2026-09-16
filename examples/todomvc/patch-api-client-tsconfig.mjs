// The generated client is a fetch-based browser API client, so it needs DOM
// types (RequestCredentials, Response, ...) that this workspace's
// tsconfig.base.json doesn't include by default. It also hits two
// long-standing typescript-fetch template bugs with no generator config to
// fix them: an unused "mapValues"/"...ToJSON" import in some model files,
// and a missing "override" modifier on a class field that shadows
// Error.cause. Module resolution itself needs no override — the generator's
// own importFileExtension=.js option (set in workflow.ts) already produces
// imports compatible with the workspace's "nodenext" setting.
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'packages/api-client/tsconfig.lib.json';
const config = JSON.parse(readFileSync(path, 'utf8'));

config.compilerOptions = {
  ...config.compilerOptions,
  lib: ['es2022', 'dom'],
  noUnusedLocals: false,
  noImplicitOverride: false,
};

writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
