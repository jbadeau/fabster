import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { WorkflowDefinition, AgentDefinition } from '@fabster/core';
import { runWorkflow } from '@fabster/runtime';

interface RunFlags {
  dryRun?: boolean;
}

interface WorkflowModule {
  default?: WorkflowDefinition;
  workflow?: WorkflowDefinition;
  agents?: readonly AgentDefinition[];
}

export async function run(workflowFile: string, flags: RunFlags): Promise<void> {
  const absolutePath = path.resolve(workflowFile);
  const fileUrl = pathToFileURL(absolutePath).href;

  const mod = (await import(fileUrl)) as WorkflowModule;

  const workflow = mod.default ?? mod.workflow;
  if (!workflow) {
    throw new Error(
      `Workflow file must export a WorkflowDefinition as default or named "workflow"`,
    );
  }

  const agents = mod.agents ?? [];

  console.log(`Running workflow: ${workflow.name}`);
  console.log(`  Agents: ${agents.length}`);
  console.log(`  Dry run: ${flags.dryRun ?? false}`);
  console.log('');

  const result = await runWorkflow(workflow, {
    agents,
    dryRun: flags.dryRun ?? false,
  });

  console.log('');
  console.log(`Workflow "${result.workflow}" ${result.status}`);
  if (result.mr) {
    console.log(`  MR: ${result.mr}`);
  }
  for (const node of result.nodes) {
    const icon = node.state === 'complete' ? '+' : node.state === 'failed' ? 'x' : '-';
    console.log(`  ${icon} ${node.id} [${node.state}] (${formatDuration(node.duration)})`);
    if (node.state === 'failed' && node.logs.length > 0) {
      console.log('    Logs:');
      for (const log of node.logs) {
        console.log(`      ${log}`);
      }
    }
  }

  if (result.status === 'failed') {
    process.exit(1);
  }
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}:${String(remainSecs).padStart(2, '0')}`;
}
