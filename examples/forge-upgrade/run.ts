import { runWorkflow } from '@fabster/runtime';
import { createOpenAI } from '@ai-sdk/openai';
import type { ModelMap } from '@fabster/runtime';
import { forgeUpgrade, forgeMigrator } from '@fabster/forge';

// Model configuration (local Ollama)
const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
});

const models: ModelMap = {
  low: ollama.chat('devstral'),
  medium: ollama.chat('qwen3:32b'),
  high: ollama.chat('qwen3:32b'),
};

// Create the forge upgrade workflow for mobiledash
const workflow = forgeUpgrade({
  repo: '/Users/jbadeau/git/mobiledash',
  platform: 'devcloud',
  projectTypes: ['maven', 'docker', 'react'],
});

const result = await runWorkflow(workflow, {
  agents: [forgeMigrator],
  models,
  // dryRun: true,
});

console.log(`\nWorkflow "${result.workflow}" ${result.status}`);
for (const node of result.nodes) {
  const icon = node.state === 'complete' ? '+' : node.state === 'failed' ? 'x' : '-';
  console.log(`  ${icon} ${node.id} [${node.state}]`);
}
