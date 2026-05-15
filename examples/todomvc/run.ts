import { runWorkflow } from '@fabster/runtime';
import workflow, { agents, models } from './workflow.ts';

const result = await runWorkflow(workflow, { agents, models });

console.log(`\nWorkflow "${result.workflow}" ${result.status}`);
for (const node of result.nodes) {
  const icon = node.state === 'complete' ? '+' : node.state === 'failed' ? 'x' : '-';
  console.log(`  ${icon} ${node.id} [${node.state}] (${Math.round(node.duration / 1000)}s)`);
  if (node.state === 'failed') {
    for (const log of node.logs) console.log(`      ${log}`);
  }
}
process.exit(result.status === 'success' ? 0 : 1);
