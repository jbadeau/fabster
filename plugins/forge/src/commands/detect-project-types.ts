import { command, run, string } from '@fabster/core';

export const detectProjectTypes = command({
  name: 'detect-project-types',
  purpose: 'Auto-detect which Forge technology plugins apply to this repository',
  steps: [
    run('node -e "const fs=require(\'fs\'),p=f=>fs.existsSync(f),pkg=p(\'package.json\')?JSON.parse(fs.readFileSync(\'package.json\',\'utf8\')):{},d=pkg.dependencies||{},dd=pkg.devDependencies||{},t=[];if(p(\'pom.xml\'))t.push(\'maven\');if(p(\'Dockerfile\')||p(\'jib.yaml\'))t.push(\'docker\');if(p(\'charts\')||p(\'Chart.yaml\'))t.push(\'helm\');if(d.react||dd.react)t.push(\'react\');if(dd.playwright||dd[\'@playwright/test\'])t.push(\'playwright\');if(dd.storybook||dd[\'@storybook/react\'])t.push(\'storybook\');if(fs.readdirSync(\'.\').some(f=>f.endsWith(\'.openapi.yaml\')||f.endsWith(\'.openapi.json\')))t.push(\'openapi\');console.log(JSON.stringify(t))"'),
  ],
  inputs: {},
  outputs: {
    projectTypes: string('JSON array of detected project types'),
  },
  permissions: {
    fs: { read: ['/repo/**'] },
    tools: ['node'],
  },
  gates: [],
});
