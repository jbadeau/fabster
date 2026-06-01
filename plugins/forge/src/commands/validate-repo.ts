import { command, run } from '@fabster/core';

export const validateRepo = command({
  name: 'validate-repo',
  purpose: 'Ensure mise is available, set up mise.toml, write mise.local.toml with credentials, and install tools',
  steps: [
    // 1. Check mise is on PATH
    run('which mise'),
    // 2. Rename .mise.toml → mise.toml
    run('test -f .mise.toml && mv .mise.toml mise.toml || true'),
    // 3. Remove [plugins] and [alias] sections
    run("awk '/^\\[plugins\\]/{skip=1;next}/^\\[alias\\]/{skip=1;next}/^\\[/{skip=0}{if(!skip)print}' mise.toml > mise.toml.tmp && mv mise.toml.tmp mise.toml"),
    // 4. Add jib plugin
    run('printf \'\\n[plugins]\\njib = "https://github.com/jbadeau/asdf-jib.git"\\n\' >> mise.toml'),
    // 5. Pin node to v22 (Forge requirement) and pnpm to v10
    run("sed 's/nodejs = .*/nodejs = \"22\"/' mise.toml > mise.toml.tmp && mv mise.toml.tmp mise.toml"),
    run("sed 's/pnpm = .*/pnpm = \"10\"/' mise.toml > mise.toml.tmp && mv mise.toml.tmp mise.toml"),
    // 6. Write mise.local.toml.tmpl (template checked into git)
    run("cat > mise.local.toml.tmpl << 'TMPL'\n[env]\nCODEAK_NPM_REPOSITORY_BASIC_AUTH = \"\"\nCODEAK_REPOSITORY_BASIC_AUTH = \"\"\nCODEAK_REPOSITORY_PASSWORD = \"\"\nCODEAK_REPOSITORY_USERNAME = \"\"\nDC_NPM_APIKEY = \"\"\nTECHX_CI_JOB_TOKEN = \"\"\nTECHX_CSA_NPM_APIKEY = \"\"\nTMPL"),
    // 7. Ensure mise.local.toml is gitignored
    run('grep -q "mise.local.toml" .gitignore 2>/dev/null || echo "mise.local.toml" >> .gitignore'),
    // 8. Trust and install tools
    run('mise trust --all'),
    run('mise install'),
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    secrets: [
      'CODEAK_NPM_REPOSITORY_BASIC_AUTH',
      'CODEAK_REPOSITORY_BASIC_AUTH',
      'CODEAK_REPOSITORY_PASSWORD',
      'CODEAK_REPOSITORY_USERNAME',
      'DC_NPM_APIKEY',
      'TECHX_CI_JOB_TOKEN',
      'TECHX_CSA_NPM_APIKEY',
    ],
  },
  gates: [],
});
