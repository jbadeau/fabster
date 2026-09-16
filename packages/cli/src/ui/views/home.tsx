import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { Banner, SelectList, Spinner, useKeys } from '../components.js';
import type { SelectItem } from '../components.js';
import { discoverWorkflows } from '../../workflow-loader.js';
import type { DiscoveredWorkflow } from '../../workflow-loader.js';

export type HomeTarget =
  | 'run-picker'
  | 'init'
  | 'daemon'
  | 'catalog'
  | 'help'
  | 'quit';

export function Home({ onNavigate }: { onNavigate: (target: HomeTarget) => void }) {
  useEffect(() => {
    if (!process.stdin.isTTY) onNavigate('quit');
  }, [onNavigate]);

  const items: Array<SelectItem<HomeTarget>> = [
    { label: 'Run a workflow', value: 'run-picker' },
    { label: 'Initialize repo', hint: 'MCP servers, skills, agent context', value: 'init' },
    { label: 'Start daemon + dashboard', value: 'daemon' },
    { label: 'Browse catalog', hint: 'tasks · commands · skills · rules', value: 'catalog' },
    { label: 'Help', value: 'help' },
    { label: 'Quit', value: 'quit' },
  ];

  return (
    <Box flexDirection="column">
      <Banner subtitle="select a command (↑/↓, enter)" />
      <SelectList
        items={items}
        onSelect={onNavigate}
        onCancel={() => onNavigate('quit')}
      />
    </Box>
  );
}

export function RunPicker({
  onPick,
  onCancel,
}: {
  onPick: (file: string) => void;
  onCancel: () => void;
}) {
  const [workflows, setWorkflows] = useState<DiscoveredWorkflow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    discoverWorkflows().then((w) => {
      if (!cancelled) setWorkflows(w);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useKeys(
    (input, key) => {
      if (input === 'q' || key.escape) onCancel();
    },
    { isActive: workflows != null && workflows.length === 0 },
  );

  if (!workflows) {
    return (
      <Box flexDirection="column">
        <Banner subtitle="run" />
        <Text>
          <Spinner /> Discovering workflows…
        </Text>
      </Box>
    );
  }

  if (workflows.length === 0) {
    return (
      <Box flexDirection="column">
        <Banner subtitle="run" />
        <Text dimColor>No workflows found in examples/ or workflows/. Press q.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Banner subtitle="run — pick a workflow (↑/↓, enter)" />
      <SelectList
        items={workflows.map((w) => ({ label: w.name, hint: w.path, value: w.path }))}
        onSelect={onPick}
        onCancel={onCancel}
      />
    </Box>
  );
}
