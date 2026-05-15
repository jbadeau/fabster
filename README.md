# Fabster

Workflow automation for fabricating code. Define reusable tasks, commands, and agents, compose them into workflows, and produce stacked merge requests.

## Core Concepts

**Command** -- Reusable deterministic unit. Runs predefined shell commands.

**Task** -- Reusable agentic unit. Declares capability requirements. An AI agent decides how to fulfill them.

**Agent** -- Capability provider. Has instructions, tools (Vercel AI SDK), and declared capabilities. Matched to tasks via require/provide resolution.

**Workflow** -- Composes commands and tasks into a linear stack of nodes. Each node produces a branch and merge request. MRs stack on top of each other for incremental review.

**Workspace** -- Mirage virtual filesystem mount. Workflows execute against a workspace (git repo in v1). Agents and commands interact with files through Mirage.

## Architecture

```
Workflow (defines workspace + linear node stack)
  +-- Node (produces a branch + MR)
       +-- Task/Command (does the work)
            +-- Sandbox (bubblewrap isolation, default)
                 +-- Mirage (virtual filesystem)
                      +-- mise (provisions tools on-the-fly)
```

## Packages

| Package | Description |
|---|---|
| `@fabster/core` | Definition DSL -- types and builders for commands, tasks, agents, workflows |
| `@fabster/runtime` | Execution engine -- graph extraction, agent resolution, command/task execution, git stacking, gate checking |
| `@fabster/tui` | Terminal UI -- Ink-based 3-column dashboard for monitoring workflow execution |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- [mise](https://mise.jdx.dev/) (for tool provisioning)

### Install

```sh
git clone https://github.com/jbadeau/fabster.git
cd fabster
npm install
```

### Build

```sh
npx nx build core
npx nx build runtime
npx nx build tui
```

Or build everything:

```sh
npx nx run-many -t build
```

### Test

```sh
npx nx test core
npx nx test runtime
npx nx test tui
```

Or test everything:

```sh
npx nx run-many -t test
```

### Typecheck

```sh
npx nx run-many -t typecheck
```

## Usage Example

```ts
import { tool } from 'ai';
import { z } from 'zod';
import { RAMResource } from '@struktoai/mirage-core';
import {
  workspace, agent, task, command, workflow,
  string, boolean,
  require, provide,
  successfulBuild, formatted, linted, humanApproved,
} from '@fabster/core';

// Define a reusable command
const createReactLibrary = command({
  name: 'create-react-library',
  purpose: 'Create a React library in the monorepo',
  run: 'nx generate @forge/react:library --name={name} --scope={scope}',
  inputs: {
    name: string(),
    scope: string(),
    publishable: boolean(),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/packages/**'] },
    tools: ['nx@22', 'pnpm@10', 'git'],
  },
  gates: [successfulBuild(), formatted(), linted()],
});

// Define an agent with Vercel AI SDK tools
const forgeAgent = agent('forge-generator', {
  purpose: 'Implements components for the design system',
  capabilities: [
    provide('agent.skill', { name: 'code-generation', language: 'typescript' }),
    provide('agent.skill', { name: 'testing' }),
  ],
  instructions: 'You are a code generation agent for Nx monorepo tooling.',
  tools: {
    readFile: tool({
      description: 'Read a file from the workspace',
      parameters: z.object({ path: z.string() }),
      execute: async ({ path }) => `contents of ${path}`,
    }),
    writeFile: tool({
      description: 'Write a file to the workspace',
      parameters: z.object({ path: z.string(), content: z.string() }),
      execute: async ({ path }) => `wrote ${path}`,
    }),
  },
});

// Define an agentic task
const implementComponent = task({
  name: 'implement-component',
  purpose: 'Implement a React component with tests',
  reasoning: 'medium',
  requirements: [
    require('agent.skill', { name: 'code-generation', language: 'typescript' }),
    require('agent.skill', { name: 'testing' }),
  ],
  inputs: {
    componentName: string(),
    library: string(),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/packages/**'] },
    tools: ['nx@22', 'git'],
  },
  gates: [successfulBuild(), humanApproved()],
});

// Compose a workflow
const createDesignSystem = workflow({
  name: 'create-design-system',
  purpose: 'Create a design system with tokens and components',
  workspace: workspace({
    '/repo': new RAMResource(),
  }),
  graph: (ctx) => {
    const scaffoldTokens = ctx.run('scaffold-tokens', createReactLibrary, {
      name: 'tokens',
      scope: 'design-system',
      publishable: true,
    });

    const scaffoldComponents = ctx.run('scaffold-components', createReactLibrary, {
      name: 'components',
      scope: 'design-system',
      publishable: true,
    }, { dependsOn: [scaffoldTokens] });

    const implTokens = ctx.run('impl-tokens', implementComponent, {
      componentName: 'color-tokens',
      library: 'design-system-tokens',
    }, { dependsOn: [scaffoldComponents] });

    ctx.run('impl-button', implementComponent, {
      componentName: 'button',
      library: 'design-system-components',
    }, { dependsOn: [implTokens] });
  },
});
```

Running the workflow produces stacked MRs:

```
main
  <- MR #1: scaffold-tokens
    <- MR #2: scaffold-components
      <- MR #3: impl-tokens
        <- MR #4: impl-button
```

Each MR is independently reviewable. Gates (build, lint, human approval) run per-MR. MRs merge in order.

## Key Design Decisions

- **Require/Provide** -- Tasks declare capability requirements, agents provide capabilities. OSGi-inspired resolution.
- **Permissions separate from capabilities** -- Requirements match agents. Permissions constrain the sandbox. Tools provisioned by mise.
- **Stacked MRs** -- Every workflow node produces a branch + MR, forming a reviewable stack.
- **Mirage workspace** -- Agents and commands interact with a virtual filesystem. The underlying storage (git, S3, RAM) is abstracted.
- **Vercel AI SDK** -- Agents use Vercel AI SDK tools. Model provider is swapped at runtime, not baked into agent definitions.
- **Reasoning levels** -- Tasks declare `reasoning: 'low' | 'medium' | 'high'` to select the appropriate model tier.

## License

MIT
