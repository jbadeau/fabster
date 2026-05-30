# Keeping Your Sanity While Reviewing AI-Generated Code

_A design sketch for making agent-written code land as small, validated, reviewable merge requests._

## The Problem: Landing Generated Code Well

AI can generate useful code now. For many teams, generation is no longer the only hard part.

The harder problem is making sure that code lands well: in the right order, in the right shape, in a way that does not overwhelm the person reviewing it or the colleague who inherits it six months from now.

When you ask an AI agent to build a full-stack feature, it can produce hundreds of lines across dozens of files. Drop all of that into a single merge request and you have created a wall of code that nobody wants to review. Reviewers skim it, approve it, and move on. Bugs hide. Design problems slip through. Technical debt accrues silently.

The cognitive load does not just fall on reviewers. It falls on you. You have to mentally track which pieces depend on which, what order things need to happen in, and whether the agent actually did what you asked. You are managing an assembly line in your head.

Fabster is an idea for tackling this. It would let you define multi-step workflows for fabricating code, where each step can produce its own branch, its own merge request, and its own quality gates. The goal is for code to land incrementally, in reviewable pieces, and in the right order.

This is a design sketch, not a claim that the model is proven. I am writing it down to pressure-test the idea: what breaks, what is overcomplicated, and what would actually help teams review AI-generated code?

## The Core Idea: Workflows That Produce Stacked Merge Requests

The central concept is simple: break a large generated-code task into a sequence of nodes. Each node does its work and commits the result. You choose the granularity. A node can simply commit to the current branch, or it can create its own branch and merge request. When you opt for MRs, they stack on top of each other: MR #2 branches off MR #1, MR #3 branches off MR #2, and so on.

![Every workflow step can produce its own branch and merge request.](assets/blog/every-step-mr-stack.svg)

_Every workflow step can produce its own branch and merge request._

Maybe you group related scaffolding into commits on a single branch and only split at the implementation boundary.

![Related mechanical work can be grouped while creative implementation remains separate.](assets/blog/grouped-mr-stack.svg)

_Related mechanical work can be grouped while creative implementation remains separate._

Either way, each MR is small, focused, and independently reviewable. A reviewer can look at "scaffold the tokens library" in isolation, approve it, then move on to "implement the token values." The cognitive load per review drops dramatically.

This resembles how experienced engineers often work when they tackle large features manually: they break the work into a stack of commits and MRs. The question is whether that discipline can be made explicit enough for generated code without adding too much process.

## The MVP: Keep the First Version Small

The first useful version of Fabster does not need every idea in this post. The implementation target for v0 is:

- A workflow DAG that describes nodes and dependencies
- Sequential execution in topological order
- Command nodes with scripted steps
- Task nodes resolved to native or external agents
- A repository workspace mounted at `/repo`
- Per-node permissions for filesystem access, tools, network, and secrets
- Git branch and worktree creation for each MR-producing node
- Commits and stacked merge requests
- Validation gates such as build, lint, format, and tests
- Optional blocking review gates before continuing to the next node
- A structured event stream that a CLI can render

That is enough to prove the core value: fabricated code lands as small, validated, reviewable increments instead of one oversized diff.

Everything else is deliberately out of scope for v0: parallel or speculative execution, nested workflow runs, plugins, durable agent memory, reputation, self-improving skills, typed resource adapters, remote execution, and workflow dashboards. Those ideas may matter later, but Fabster should be useful before it becomes a platform.

## Two Kinds of Work: Commands and Tasks

Every node in a workflow runs either a command or a task. The distinction matters.

A command is scripted work: one or more predefined operations executed in order. It might run a shell command, a package-manager command, a code generator, or a small script. The important property is that the execution path is explicit ahead of time.

Commands are not magically deterministic. A generator can change behavior when tool versions change. A dependency install can change when the registry changes. Fabster makes commands reproducible by controlling the inputs that matter: command steps, arguments, tool versions, working directory, environment, lockfiles, and declared network access.

```typescript
const createReactLibrary = command({
  name: 'create-react-library',
  purpose: 'Create a React library in the monorepo',
  steps: [
    run('nx generate @nx/react:library --name={name} --scope={scope}'),
    run('nx format:write'),
    run('nx run {scope}-{name}:lint'),
  ],
  inputs: {
    name: string(),
    scope: string(),
  },
  gates: [successfulBuild(), formatted(), linted()],
});
```

A task describes what needs to happen but not how or by whom. Some tasks are fully agentic: an AI agent picks them up and runs autonomously. Others require a human in the loop, or a human and an AI working together. The task does not prescribe the execution model.

A task can declare the resources and capabilities it needs:

- Skills: the capabilities required, such as code generation, testing, or TypeScript
- Mounts: the workspace resources it needs access to. In the MVP, this can just be the repo
- Services: optional external integrations. Later versions might include a design system API, a ticket tracker, a notification channel, or a CI pipeline

The execution engine uses all of this to assign the right worker, provision the right environment, and grant the right access.

```typescript
const implementComponent = task({
  name: 'implement-component',
  purpose: 'Implement a React component with tests',

  requirements: [
    require('agent.skill', { name: 'code-generation', language: 'typescript' }),
    require('agent.skill', { name: 'testing' }),
  ],

  instructions: [
    'Use functional components with hooks',
  ],

  rules: [
    'Co-locate test files next to source files',
  ],

  inputs: {
    componentName: string(),
    library: string(),
  },
  outputs: {
    componentPath: string(),
  },

  mounts: ['/repo'],
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/packages/ui/**'] },
    tools: ['node@22', 'npm'],
    network: 'restricted',
    secrets: [],
  },

  sandbox: 'bubblewrap',
  gates: [successfulBuild(), humanApproved()],
});
```

A task definition is a complete description of a unit of work:

- Name and purpose: what it is called and what it does
- Requirements: the skills needed, used to match an agent
- Instructions: guidance for the worker. These shape the implementation but do not, by themselves, prove correctness
- Rules: expected properties of the output. Some rules can be checked automatically. Others may become review checklist items until a verifier exists
- Inputs and outputs: typed data flowing in and out, chainable across nodes
- Mounts and services: repo resources and optional external integrations
- Permissions: filesystem access, tool constraints, network access, and secrets
- Gates: executable pass/fail checks that decide whether the node can advance

Both commands and tasks declare inputs and outputs. Outputs from one node can be chained as inputs to the next, and the execution engine wires them together.

```typescript
graph: (ctx) => {
  const uiLib = ctx.run('create-ui-lib', createLibrary, {
    name: 'ui',
    scope: 'shared',
  });

  const button = ctx.run('impl-button', implementComponent, {
    library: uiLib.output('importPath'),
    componentName: 'button',
  }, { dependsOn: [uiLib] });

  ctx.run('impl-app', implementApp, {
    uiLibrary: uiLib.output('importPath'),
    entryComponent: button.output('componentName'),
  }, { dependsOn: [button] });
};
```

The key insight: scaffolding and generation usually have an explicit execution path, so use commands. Implementation and creative decisions do not, so use tasks. Commands require controlled inputs. Tasks require judgment.

## Agents and Capability Matching

Tasks do not reference agents directly. Instead, they advertise requirements, and agents declare what they provide. The execution engine matches them automatically.

This is inspired by OSGi's service resolution model: consumers declare what they need, providers declare what they offer, and the framework wires them together. You never manually assign an agent to a task. You describe the work, agents describe their skills, and the best match gets picked.

```typescript
const myTask = task({
  requirements: [
    require('agent.skill', { name: 'code-generation', language: 'typescript' }),
    require('agent.skill', { name: 'testing' }),
  ],
});

const myAgent = agent('coder', {
  capabilities: [
    provide('agent.skill', { name: 'code-generation', language: 'typescript' }),
    provide('agent.skill', { name: 'testing' }),
  ],
  instructions: 'You are a TypeScript code fabrication agent.',
  tools: { /* read files, write files, run commands, etc. */ },
});
```

Why decouple? Because the same task definition can be fulfilled by different agents depending on context. During development you might have an agent backed by a local model. In CI you might swap in a cloud-hosted agent. The task does not change, only the agent pool does.

For the MVP, this is enough: agents are ephemeral workers matched to tasks by capability. They spin up for a task, do the work, and disappear.

Agents come in two flavors:

- Native agents run in-process with standard AI SDK tools
- External agents spawn a subprocess, for example a CLI-based coding agent

In principle, this means any AI coding tool can become a Fabster agent. If it can accept a prompt and modify files, it can participate in a workflow.

## Planning Workflows

For the MVP, workflows can be written directly. A developer defines the graph, chooses which nodes are commands or tasks, adds gates, and decides where MRs should be created.

A workflow planner can help draft that workflow, but it is not required. You describe what you want to build, and the planner proposes a graph: which nodes, what order, which tasks need agents, which steps are scripted commands, and which gates should apply.

You review, adjust, and approve the workflow before execution. Maybe you split a node, reorder steps, add a gate, or swap a command for a task. Execution then follows the approved workflow definition, not an open-ended plan hidden inside an agent prompt.

## The Execution Model

Once the workflow is approved, it defines a graph of nodes with explicit dependencies. The graph is a planning model, not a promise of parallel execution. At runtime, the engine chooses a topological order and executes nodes sequentially.

That distinction matters. A DAG lets you describe what depends on what. Sequential execution lets Fabster produce one clean, linear MR stack. Each node branches from the previous node's branch, so even if the workflow has independent branches conceptually, the code lands as an ordered sequence of reviewable changes.

For each node, the engine executes the same basic lifecycle:

1. Create a git branch and worktree
2. Run the command or resolve an agent and execute the task
3. Commit the changes
4. Run validation gates
5. Create a merge request if the node is configured to produce one
6. Wait for review gates if configured
7. Clean up the worktree

If a node fails, all downstream nodes are skipped. The MR stack stops at the point of failure.

## Git and MR Lifecycle

For each MR-producing node:

1. Fabster creates a branch named `fabster/<workflow>/<node>`.
2. The first node branches from the workflow's base branch, usually `main`.
3. Each later node branches from the previous completed node's branch, producing a linear stack even when the workflow graph has independent branches.
4. Fabster creates a git worktree for the node branch.
5. The command or task runs inside that worktree.
6. Fabster commits the resulting changes with a node-specific commit message.
7. If there are no changes, the node can be marked complete without opening an MR.
8. Validation gates run against the worktree.
9. If validation passes, Fabster opens an MR targeting the previous branch in the stack.
10. If review gates are configured, Fabster waits before continuing to the next node.
11. The worktree is removed after the node is complete, failed, or gated.

If validation gates fail, the node enters the fix loop. If the worker cannot satisfy the gates, the node fails and downstream nodes are skipped. If human review requests changes, the node stays gated until those changes are addressed and the review gate passes.

### Blocking vs Speculative Execution

In the MVP, review gates are blocking. If a node requires human approval, Fabster does not execute downstream nodes until that approval is present. This keeps the branch stack simple: every downstream branch is based on reviewed work.

A future speculative mode could allow downstream nodes to run after validation gates pass but before review gates pass. That would improve throughput, but it introduces rebase and invalidation complexity when review changes an earlier node.

## Instructions, Rules, and Gates

Fabster separates three concepts that are easy to blur:

- Instructions shape how the worker approaches the task
- Rules describe expected properties of the output
- Gates are executable pass/fail checks that decide whether the node can advance

Instructions can be subjective or stylistic: "prefer functional components" or "keep the implementation simple." Rules should be more concrete: "component has a corresponding test file" or "no inline styles." Gates are the actual blockers: build, lint, format, tests, security scans, or human approval.

This separation keeps the system honest. A worker can follow instructions and satisfy rules, but a node is not complete until its gates pass.

Validation gates run automatically after execution:

- `successfulBuild()`: does it compile?
- `linted()`: does it pass linting?
- `formatted()`: is the code formatted?
- `testsPass()`: do the tests pass?

Review gates require human action:

- `humanApproved()`: the merge request must be approved by a reviewer before downstream work continues

Gates work hand-in-hand with rules. An agent or human can declare they are done, but the gates do not take their word for it. They check the evidence: build logs, test reports, security scan results.

## Repository Workspace

The MVP only needs one workspace resource: the repository being changed. A workflow runs against a repo checkout, usually mounted at `/repo`. Each node can get its own git worktree so changes stay isolated until the node commits.

That is enough for the core loop: read code, write code, run commands, commit changes, run gates, and open the next MR in the stack.

```typescript
workspace: workspace({
  '/repo': new DiskResource({ root: '/path/to/repo' }),
}),
```

Later, workflows can add typed resource adapters for things outside the repo: document folders, object stores, issue trackers, databases, design systems, or chat systems. File-like resources can expose file operations. Non-file resources should expose explicit resource operations instead of pretending to be ordinary files.

## Sandboxing

When you let an agent loose on your codebase, you need to control what it can touch and what it can talk to. Sandboxing is a policy boundary, not just a filesystem boundary. A node declares what it can read, what it can write, which tools it can run, whether it can access the network, and which secrets or service credentials it can receive.

For the MVP, this policy can stay simple:

```typescript
permissions: {
  fs: { read: ['/repo/**'], write: ['/repo/packages/ui/**'] },
  tools: ['node@22', 'npm', 'git'],
  network: 'restricted',
  secrets: [],
},
```

That policy covers the main risks:

- Filesystem access
- Tool access
- Network access
- Secrets and credentials
- Auditability

The enforcement mechanism can vary. A simple git worktree gives each node a separate working copy. A local sandbox such as bubblewrap can restrict filesystem and network access on the host. A remote container can provide stronger isolation for untrusted work. These are implementation choices; the workflow model should describe the policy first, then let the runtime choose how to enforce it.

## Workflow Composition

Workflows can call other workflows. For the MVP, composition is graph expansion: calling another workflow inserts that workflow's nodes into the parent graph with namespaced node IDs. The resulting combined graph still executes sequentially and produces one linear MR stack.

More advanced versions could support nested workflow runs or nested MR stacks, but that is not required for the core model.

## Observability

When a workflow is running, you need to see what is happening. For the MVP, observability can be a structured event stream: node started, command run, tool called, file changed, gate passed, MR opened, node gated, node failed. A CLI can render that stream directly.

A dashboard can come later, reading the same event stream. Remote execution can also come later for long-running jobs or CI-triggered pipelines. Neither is required for the core model.

## A Concrete Example: Full-Stack TodoMVC

Here is what a real workflow might look like. This one creates a complete TodoMVC application: React frontend, Express backend, OpenAPI spec, generated API client, in an Nx monorepo.

![The workflow is a DAG, but Fabster executes it sequentially in a topological order to produce one linear MR stack.](assets/blog/todomvc-workflow-dag.svg)

_The workflow is a DAG, but Fabster executes it sequentially in a topological order to produce one linear MR stack._

Fabster can execute this DAG in a topological order such as:

```text
init-workspace
add-react-plugin
add-node-plugin
generate-frontend
write-openapi-spec
generate-backend
generate-client-lib
generate-api-client
implement-backend
implement-frontend
```

That order determines the linear MR stack. In this case, it produces 10 stacked merge requests:

1. Empty Nx workspace initialized
2. React plugin added
3. Node plugin added
4. Frontend app scaffolded
5. OpenAPI spec written by an AI agent
6. Backend app scaffolded
7. Client library scaffolded
8. API client generated from spec
9. Backend implemented by an AI agent
10. Frontend implemented by an AI agent

Each MR is focused. The scaffolding MRs are trivial to review. The implementation MRs contain only the creative work. The reviewer is never looking at scaffolding and implementation mixed together.

## The Ergonomics of Fabrication

The appeal of this model is not only smaller MRs. It is the possibility of reducing the coordination burden around generated code.

A large agent run forces you to plan, prompt, inspect, debug, split commits, check CI, prepare reviews, and explain what happened. A Fabster-style workflow would make that coordination explicit: dependencies are visible, state is tracked, failures are local, and each unit has its own gates.

If the model works, the result should be less context switching for the workflow author, less review fatigue for reviewers, and lower agent cost because routine scripted work does not need to be rediscovered by an agent every time.

## Why This Might Matter

The potential value is not in the framework mechanics. It is in what it might do to the shape of fabricated code as it enters your codebase.

Without structure, fabricated code arrives as a blob. With Fabster-style workflows, it arrives as a sequence of small, validated, reviewable increments: the same way a thoughtful engineer would submit it.

This could reduce cognitive load at every stage:

- For the workflow author: define the dependency graph once and let the framework handle ordering, branch creation, gates, and MR sequencing
- For reviewers: review one concern at a time
- For future colleagues: read a git history that tells a coherent story

The core ideas here are not exotic. Stacked MRs, capability-based agent matching, and validation gates are all established patterns. The interesting question is whether composing them this way creates a useful workflow for generated code, or whether it just moves the complexity somewhere else.

If AI agents are going to fabricate more and more of our code, we need better ways to make that code land in the right order and the right shape. This is one possible shape for that conversation.

I am especially interested in feedback on:

- Whether sequential DAG execution is practical
- Whether review gates should block downstream work
- Whether this reduces cognitive load or just moves it around
- What would make the Git/MR lifecycle painful in real teams
