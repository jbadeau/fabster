import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { NodeState } from '@fabster/runtime';

/**
 * useInput, but inert when stdin is not a TTY. Ink's useInput throws
 * ("Raw mode is not supported") in piped/non-interactive shells, so guard it.
 */
export function useKeys(
  handler: Parameters<typeof useInput>[0],
  options?: { isActive?: boolean },
): void {
  const isTTY = process.stdin.isTTY === true;
  useInput(handler, { isActive: isTTY && (options?.isActive ?? true) });
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function Spinner({ color }: { color?: string }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);
  return <Text color={color ?? 'cyan'}>{SPINNER_FRAMES[frame]}</Text>;
}

const ACTIVE_STATES: ReadonlySet<NodeState> = new Set<NodeState>([
  'executing',
  'validating',
  'publishing',
  'retrying',
]);

export function NodeStatusIcon({ state }: { state: NodeState }) {
  if (ACTIVE_STATES.has(state)) return <Spinner />;
  switch (state) {
    case 'complete':
      return <Text color="green">✔</Text>;
    case 'failed':
      return <Text color="red">✖</Text>;
    case 'skipped':
      return <Text dimColor>–</Text>;
    default:
      return <Text dimColor>○</Text>;
  }
}

export function Banner({ subtitle }: { subtitle?: string }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>
        <Text color="cyan" bold>
          fabster
        </Text>
        <Text dimColor> — workflow automation for fabricating code</Text>
      </Text>
      {subtitle ? <Text dimColor>{subtitle}</Text> : null}
    </Box>
  );
}

export interface SelectItem<T> {
  label: string;
  hint?: string;
  value: T;
}

/** Minimal arrow-key select list. Enter selects, q/esc cancels. */
export function SelectList<T>({
  items,
  onSelect,
  onCancel,
}: {
  items: ReadonlyArray<SelectItem<T>>;
  onSelect: (value: T) => void;
  onCancel?: () => void;
}) {
  const [index, setIndex] = useState(0);

  useKeys((input, key) => {
    if (key.upArrow || input === 'k') {
      setIndex((i) => (i - 1 + items.length) % items.length);
    } else if (key.downArrow || input === 'j') {
      setIndex((i) => (i + 1) % items.length);
    } else if (key.return) {
      if (items[index]) onSelect(items[index].value);
    } else if (key.escape || input === 'q') {
      onCancel?.();
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        const active = i === index;
        return (
          <Text key={i} color={active ? 'cyan' : undefined}>
            {active ? '❯ ' : '  '}
            {item.label}
            {item.hint ? <Text dimColor>{`  ${item.hint}`}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}
