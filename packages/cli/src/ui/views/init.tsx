import { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import { Banner, Spinner, useKeys } from '../components.js';
import { planInit, applyInit } from '../../init.js';
import type { InitAction, InitStatus } from '../../init.js';

type Phase = 'planning' | 'confirm' | 'preview' | 'applying' | 'done' | 'error';

const STATUS_COLOR: Record<InitStatus, string> = {
  create: 'green',
  update: 'yellow',
  skip: 'gray',
};

const STATUS_LABEL: Record<InitStatus, string> = {
  create: 'create',
  update: 'update',
  skip: ' skip ',
};

export function InitView({ autoYes, onExit }: { autoYes: boolean; onExit?: () => void }) {
  const app = useApp();
  const [phase, setPhase] = useState<Phase>('planning');
  const [actions, setActions] = useState<InitAction[]>([]);
  const [applied, setApplied] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pending = actions.filter((a) => a.status !== 'skip');

  const finish = () => (onExit ? onExit() : app.exit());

  const doApply = async (list: InitAction[]) => {
    setPhase('applying');
    try {
      const count = await applyInit(list);
      setApplied(count);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
      process.exitCode = 1;
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const plan = await planInit();
        if (cancelled) return;
        setActions(plan);
        if (plan.every((a) => a.status === 'skip')) {
          setPhase('done');
        } else if (autoYes) {
          await doApply(plan);
        } else if (process.stdin.isTTY) {
          setPhase('confirm');
        } else {
          // Non-interactive shell can't confirm — show the plan and stop.
          setPhase('preview');
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase('error');
        process.exitCode = 1;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoYes]);

  useKeys((input, key) => {
    if (phase === 'confirm') {
      if (input === 'y' || key.return) void doApply(actions);
      else if (input === 'n' || input === 'q' || key.escape) finish();
    } else if (phase === 'done' || phase === 'error') {
      if (input === 'q' || key.return) finish();
    }
  });

  // In a non-interactive shell there's no keypress coming — exit on completion.
  useEffect(() => {
    if (
      (phase === 'done' || phase === 'error' || phase === 'preview') &&
      !process.stdin.isTTY
    ) {
      app.exit();
    }
  }, [phase, app]);

  if (phase === 'planning') {
    return (
      <Box flexDirection="column">
        <Banner subtitle="init" />
        <Text>
          <Spinner /> Scanning repo and plugins…
        </Text>
      </Box>
    );
  }

  if (phase === 'error') {
    return (
      <Box flexDirection="column">
        <Banner subtitle="init" />
        <Text color="red">✖ {error}</Text>
        <Text dimColor>Press q to exit.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Banner subtitle="init — set up MCP servers, skills, and agent context" />
      <Box flexDirection="column">
        {actions.map((action, i) => (
          <Text key={i} dimColor={action.status === 'skip'}>
            <Text color={STATUS_COLOR[action.status]}>
              {`[${STATUS_LABEL[action.status]}]`}
            </Text>{' '}
            <Text dimColor>{`${action.group.padEnd(8)}`}</Text>
            {action.title} <Text dimColor>{`→ ${action.target}`}</Text>
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        {phase === 'confirm' && (
          <Text>
            Apply <Text color="cyan">{pending.length}</Text> change
            {pending.length === 1 ? '' : 's'}? <Text color="green">y</Text>/
            <Text color="red">n</Text>
          </Text>
        )}
        {phase === 'preview' && (
          <Text dimColor>
            {pending.length} change{pending.length === 1 ? '' : 's'} pending. Re-run{' '}
            <Text color="cyan">fabster init --yes</Text> to apply.
          </Text>
        )}
        {phase === 'applying' && (
          <Text>
            <Spinner /> Applying…
          </Text>
        )}
        {phase === 'done' && (
          <Text color="green">
            ✔ {applied > 0 ? `Applied ${applied} change${applied === 1 ? '' : 's'}.` : 'Already up to date.'}{' '}
            <Text dimColor>Press q to exit.</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}
