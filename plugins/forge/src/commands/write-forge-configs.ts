import { command, run, string } from '@fabster/core';

export const writeForgeConfigs = command({
  name: 'write-forge-configs',
  purpose: 'Write Forge configuration files (.npmrc, add @bjb-forge/cli to package.json)',
  steps: [
    // 1. Write .npmrc with correct registry config (env var refs, no actual secrets)
    run("cat > .npmrc << 'NPMRC'\nsave-exact=true\nengine-strict=true\nstrict-peer-dependencies=false\nauto-install-peers=true\nminimum-release-age=10080\nminimum-release-age-exclude=@bjb-forge/*\n\n@bjb-forge:registry=${CODEAK_NPM_CSA_PUBLIC_REPO}\n//${CODEAK_REPOSITORY_HOST}/:_auth=${CODEAK_REPOSITORY_BASIC_AUTH}\nNPMRC"),
    // 2. Add @bjb-forge/cli to devDependencies
    run("node -e \"const fs=require('fs'),f='package.json',d=JSON.parse(fs.readFileSync(f,'utf8'));d.devDependencies=d.devDependencies||{};d.devDependencies['@bjb-forge/cli']='latest';fs.writeFileSync(f,JSON.stringify(d,null,2)+'\\n');console.log('Added @bjb-forge/cli to devDependencies')\""),
    // 3. Install dependencies (now .npmrc points to correct registry)
    run('pnpm install --no-frozen-lockfile'),
  ],
  inputs: {
    platform: string('Platform: devcloud or codeak'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'pnpm'],
    secrets: ['CODEAK_REPOSITORY_BASIC_AUTH', 'CODEAK_NPM_CSA_PUBLIC_REPO', 'CODEAK_REPOSITORY_HOST'],
  },
  gates: [],
});
