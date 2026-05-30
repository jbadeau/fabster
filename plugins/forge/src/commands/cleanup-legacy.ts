import { command, run } from '@fabster/core';

export const cleanupLegacy = command({
  name: 'cleanup-legacy',
  purpose: 'Remove legacy files and old plugins that conflict with Forge',
  steps: [
    run('rm -rf mvnw mvnw.cmd .mvn/wrapper'),
    run('find . -name ".env" -not -path "./node_modules/*" -delete 2>/dev/null || true'),
    run('rm -f .scotty.yml nexus_rel.json 2>/dev/null || true'),
    run("node -e \"const fs=require('fs'),f='nx.json';if(fs.existsSync(f)){const d=JSON.parse(fs.readFileSync(f,'utf8'));d.plugins=(d.plugins||[]).filter(p=>{const n=typeof p==='string'?p:p.plugin;return!n.startsWith('@techx/')&&!n.startsWith('@jnxplus/')});fs.writeFileSync(f,JSON.stringify(d,null,2)+'\\n');console.log('Removed @techx and @jnxplus plugins from nx.json')}\""),
    run("node -e \"const fs=require('fs'),f='package.json';if(fs.existsSync(f)){const d=JSON.parse(fs.readFileSync(f,'utf8'));for(const s of['dependencies','devDependencies','peerDependencies']){if(d[s]){for(const k of Object.keys(d[s])){if(k.startsWith('@techx/')||k.startsWith('@jnxplus/'))delete d[s][k]}}}fs.writeFileSync(f,JSON.stringify(d,null,2)+'\\n');console.log('Removed @techx and @jnxplus packages from package.json')}\""),
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node'],
  },
  gates: [],
});
