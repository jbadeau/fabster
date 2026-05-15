/**
 * TodoMVC Workflow
 *
 * Creates a full-stack TodoMVC application in an Nx monorepo:
 * 1. Initialize Nx workspace
 * 2. Add React and Node plugins
 * 3. Generate OpenAPI spec library
 * 4. Agent writes the OpenAPI spec
 * 5. Generate API client library
 * 6. Generate API client from spec
 * 7. Generate backend app
 * 8. Agent implements the backend
 * 9. Generate frontend app
 * 10. Agent implements the frontend
 *
 * Run from fabster repo root:
 *   npx tsx examples/todomvc/workflow.ts
 */

import { createOpenAI } from '@ai-sdk/openai';
import { DiskResource } from '@struktoai/mirage-node';
import {
  workspace,
  command,
  workflow,
  string,
  require,
  task,
  successfulBuild,
  linted,
  testsPass,
  humanApproved,
} from '@fabster/core';
import type { ModelMap } from '@fabster/runtime';
import {
  initWorkspace,
  addPlugin,
  generateApp,
  generateLibrary,
  nxDeveloper,
} from '@fabster/nx';

// -- Model configuration (local Ollama via OpenAI-compatible API) --

const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
});

export const models: ModelMap = {
  low: ollama.chat('devstral'),
  medium: ollama.chat('devstral'),
  high: ollama.chat('devstral'),
};

// -- Tasks specific to this workflow --

const generateOpenApiSpec = task({
  name: 'generate-openapi-spec',
  purpose: `Create an API spec project with an OpenAPI 3.0 YAML file.

You MUST use the writeFile tool to create these two files:

1. /repo/packages/api-spec/project.json with content:
{"name": "api-spec", "sourceRoot": "packages/api-spec", "projectType": "library"}

2. /repo/packages/api-spec/todo.openapi.yaml with an OpenAPI 3.0 spec defining:
- GET /todos - list all todos (returns array of Todo)
- POST /todos - create a todo (accepts title, returns Todo)
- PUT /todos/{id} - update a todo (accepts title and completed, returns Todo)
- DELETE /todos/{id} - delete a todo (returns 204)
- Todo schema: { id: string, title: string, completed: boolean, createdAt: string }

Call writeFile twice — once for each file. Start now.`,
  reasoning: 'medium',
  requirements: [
    require('agent.skill', { name: 'openapi' }),
  ],
  inputs: {
    project: string('Library project to write the spec into'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm'],
  },
  gates: [],
});

const generateApiClient = command({
  name: 'generate-api-client',
  purpose: 'Generate a TypeScript fetch API client from an OpenAPI spec using openapi-generator',
  run: [
    'npx @openapitools/openapi-generator-cli generate -i {specPath} -g typescript-fetch -o {outputDir} --additional-properties=typescriptThreePlus=true,supportsES6=true',
  ],
  inputs: {
    specPath: string('Path to the OpenAPI spec file'),
    outputDir: string('Output directory for the generated client'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm', 'npx'],
  },
  gates: [successfulBuild()],
});

const implementBackend = task({
  name: 'implement-backend',
  purpose: `Implement an Express API server for the Todo CRUD API.

You MUST use tools to create files. Start by reading /repo/packages/api-spec/src/openapi.yaml to understand the API contract, then explore /repo/apps/api/src/ to see the project structure.

Create these files using writeFile:
- /repo/apps/api/src/main.ts - Express server with CORS, JSON parsing, listening on port 3000
- /repo/apps/api/src/routes/todos.ts - CRUD route handlers using in-memory array storage
- /repo/apps/api/src/types.ts - Todo interface matching the OpenAPI spec

The server should:
- Use an in-memory array for storage (no database)
- Generate UUIDs for todo IDs
- Return proper HTTP status codes (200, 201, 204, 404)
- Handle JSON request/response

After writing files, run: npx nx build api`,
  reasoning: 'high',
  requirements: [
    require('agent.skill', { name: 'code-generation', language: 'typescript' }),
    require('agent.skill', { name: 'testing' }),
  ],
  inputs: {
    project: string('Nx project name for the backend'),
    specProject: string('Nx project containing the OpenAPI spec'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm', 'npx'],
  },
  gates: [successfulBuild(), testsPass(), linted()],
});

const implementFrontend = task({
  name: 'implement-frontend',
  purpose: `Implement a TodoMVC React frontend application.

You MUST use tools to create files. Start by exploring /repo/apps/web/src/ to understand the project structure.

Create these files using writeFile:
- /repo/apps/web/src/app/app.tsx - Main App component with todo list UI
- /repo/apps/web/src/app/todo-item.tsx - Individual todo item component with checkbox and delete button
- /repo/apps/web/src/app/todo-input.tsx - Input component for adding new todos
- /repo/apps/web/src/app/use-todos.ts - Custom hook that fetches/creates/updates/deletes todos via fetch() to http://localhost:3000

Features: add todos, toggle completion, delete todos, show count of remaining items.
Style with basic CSS (inline styles or a CSS module).

After writing files, run: npx nx build web`,
  reasoning: 'high',
  requirements: [
    require('agent.skill', { name: 'code-generation', language: 'typescript' }),
    require('agent.skill', { name: 'react' }),
    require('agent.skill', { name: 'testing' }),
  ],
  inputs: {
    project: string('Nx project name for the frontend'),
    clientProject: string('Nx project containing the API client'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm', 'npx'],
  },
  gates: [successfulBuild(), testsPass(), linted(), humanApproved()],
});

// -- Workflow --

export default workflow({
  name: 'create-todomvc',
  purpose: 'Create a full-stack TodoMVC application with OpenAPI spec, API client, Express backend, and React frontend',
  workspace: workspace({
    '/repo': new DiskResource({ root: '/Users/jbadeau/git/fabster-demo' }),
  }),
  graph: (ctx) => {
    // Step 1: Initialize Nx workspace
    const init = ctx.run('init-workspace', initWorkspace, {});

    // Step 2: Add Nx plugins
    const addReact = ctx.run('add-react', addPlugin, {
      plugin: '@nx/react',
    }, { dependsOn: [init] });

    const addNode = ctx.run('add-node', addPlugin, {
      plugin: '@nx/node',
    }, { dependsOn: [addReact] });

    // Step 3: Agent creates API spec project with OpenAPI yaml
    const spec = ctx.run('write-openapi-spec', generateOpenApiSpec, {
      project: 'api-spec',
    }, { dependsOn: [addNode] });

    // Step 5: Generate the API client library
    const clientLib = ctx.run('generate-client-lib', generateLibrary, {
      generator: '@nx/js:library',
      name: 'api-client',
      directory: 'packages/api-client',
    }, { dependsOn: [spec] });

    // Step 6: Generate API client from spec
    const client = ctx.run('generate-api-client', generateApiClient, {
      specPath: 'packages/api-spec/todo.openapi.yaml',
      outputDir: 'packages/api-client/src/generated',
    }, { dependsOn: [clientLib] });

    // Step 7: Generate backend app
    const backendApp = ctx.run('generate-backend', generateApp, {
      generator: '@nx/node:app',
      name: 'api',
      directory: 'apps/api',
    }, { dependsOn: [client] });

    // Step 8: Implement backend
    const backend = ctx.run('implement-backend', implementBackend, {
      project: 'api',
      specProject: 'api-spec',
    }, { dependsOn: [backendApp] });

    // Step 9: Generate frontend app
    const frontendApp = ctx.run('generate-frontend', generateApp, {
      generator: '@nx/react:app',
      name: 'web',
      directory: 'apps/web',
    }, { dependsOn: [backend] });

    // Step 10: Implement frontend
    ctx.run('implement-frontend', implementFrontend, {
      project: 'web',
      clientProject: 'api-client',
    }, { dependsOn: [frontendApp] });
  },
});

export const agents = [nxDeveloper];

