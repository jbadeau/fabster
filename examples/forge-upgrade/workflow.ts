import { createOpenAI } from '@ai-sdk/openai';
import type { ModelMap } from '@fabster/runtime';
import { forgeUpgrade, forgeMigrator } from '@fabster/forge';

// Model configuration (local Ollama)
const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
});

export const models: ModelMap = {
  low: ollama.chat('devstral'),
  medium: ollama.chat('qwen3:32b'),
  high: ollama.chat('qwen3:32b'),
};

export default forgeUpgrade({
  repo: '/Users/jbadeau/git/mobiledash',
  platform: 'devcloud',
  projectTypes: ['maven', 'docker', 'react'],
});

export const agents = [forgeMigrator];
