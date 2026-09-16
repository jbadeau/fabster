import { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import { loadCatalog } from '@fabster/server';
import type {
  CatalogTask,
  CatalogCommand,
  CatalogSkill,
  CatalogRule,
} from '@fabster/server';
import { Banner, Spinner, useKeys } from '../components.js';

type Catalog = {
  tasks: CatalogTask[];
  commands: CatalogCommand[];
  skills: CatalogSkill[];
  rules: CatalogRule[];
};

const TABS = ['tasks', 'commands', 'skills', 'rules'] as const;
type Tab = (typeof TABS)[number];

const PAGE = 12;

export function CatalogView({ onExit }: { onExit?: () => void }) {
  const app = useApp();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState<Tab>('tasks');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadCatalog().then((c) => {
      if (!cancelled) setCatalog(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Non-interactive shell: render one frame, then exit instead of waiting on q.
  useEffect(() => {
    if (catalog && !process.stdin.isTTY) app.exit();
  }, [catalog, app]);

  const rows: string[] = catalog
    ? catalog[tab].map((item) => {
        if (tab === 'tasks') {
          const t = item as CatalogTask;
          return `${t.name}  ·  ${t.category}  ·  ${t.reasoning}`;
        }
        if (tab === 'commands') {
          const c = item as CatalogCommand;
          return `${c.name}  ·  ${c.category}`;
        }
        if (tab === 'skills') {
          const s = item as CatalogSkill;
          return `${s.name}  ·  ${s.category}  ·  ${s.provider}`;
        }
        const r = item as CatalogRule;
        return `${r.name}  ·  ${r.category}  ·  ${r.severity}`;
      })
    : [];

  useKeys((input, key) => {
    if (input === 'q' || key.escape) {
      onExit ? onExit() : app.exit();
      return;
    }
    if (key.leftArrow || input === 'h') {
      setTab(TABS[(TABS.indexOf(tab) - 1 + TABS.length) % TABS.length]);
      setOffset(0);
    } else if (key.rightArrow || input === 'l' || key.tab) {
      setTab(TABS[(TABS.indexOf(tab) + 1) % TABS.length]);
      setOffset(0);
    } else if (key.downArrow || input === 'j') {
      setOffset((o) => Math.min(o + 1, Math.max(0, rows.length - PAGE)));
    } else if (key.upArrow || input === 'k') {
      setOffset((o) => Math.max(0, o - 1));
    }
  });

  if (!catalog) {
    return (
      <Box flexDirection="column">
        <Banner subtitle="catalog" />
        <Text>
          <Spinner /> Loading catalog…
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Banner subtitle="catalog" />
      <Box marginBottom={1}>
        {TABS.map((t) => (
          <Text key={t} color={t === tab ? 'cyan' : undefined} dimColor={t !== tab}>
            {t === tab ? `[${t} ${catalog[t].length}] ` : `${t} ${catalog[t].length}  `}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column">
        {rows.slice(offset, offset + PAGE).map((row, i) => (
          <Text key={offset + i}>{`  ${row}`}</Text>
        ))}
        {rows.length === 0 && <Text dimColor>  (none)</Text>}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>←/→ switch · ↑/↓ scroll · q exit</Text>
      </Box>
    </Box>
  );
}
