/**
 * TodoMVC Workflow
 *
 * Creates a full-stack TodoMVC application in an Nx monorepo:
 * 1. Add React and Node plugins (workspace scaffolded by run.ts via create-nx-workspace)
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

import { fileURLToPath } from 'node:url';
import {
  workspace,
  command,
  workflow,
  string,
  run,
  require,
  task,
  successfulBuild,
  linted,
  mergeRequest,
  gate,
  claudeCodeAgent,
  provide,
} from '@fabster/core';
import {
  addPlugin,
  generateApp,
  generateLibrary,
} from '@fabster/nx';

const patchApiClientTsconfig = fileURLToPath(
  new URL('./patch-api-client-tsconfig.mjs', import.meta.url),
);

// -- Tasks specific to this workflow --

const generateOpenApiSpec = task({
  name: 'generate-openapi-spec',
  purpose: `Create an API spec project with a valid OpenAPI 3.0 YAML file.

You MUST use the writeFile tool to create these two files:

1. /repo/packages/api-spec/project.json — write this exact content:
{"name": "api-spec", "sourceRoot": "packages/api-spec", "projectType": "library"}

2. /repo/packages/api-spec/todo.openapi.yaml — a valid OpenAPI 3.0.0 spec.

IMPORTANT: Use correct OpenAPI structure. Every response and request body must have a "schema" key. Example:
  responses:
    '200':
      description: Success
      content:
        application/json:
          schema:            <-- REQUIRED "schema" key
            type: array
            items:
              $ref: '#/components/schemas/Todo'

Define a Todo schema in components/schemas with: id (string), title (string), completed (boolean), createdAt (string).
Define endpoints: GET /todos, POST /todos, PUT /todos/{id}, DELETE /todos/{id}.

The spec must pass "npx @redocly/cli lint" with the recommended ruleset:
- a servers block (e.g. url: http://localhost:3000)
- info.description and info.license
- every operation has an operationId and a summary
- every path response includes a 4xx error response where applicable
- a top-level "security: []" declaring the API takes no auth (this API is unauthenticated) — the recommended ruleset fails otherwise with "Every operation should have security defined on it or on the root level."

Call writeFile twice — once for each file. Then write specPath to .fabster/outputs.json as instructed below — the run fails without it, even if the spec itself is valid. Start now.`,
  reasoning: 'medium',
  retries: 1,
  requirements: [
    require('agent.skill', { name: 'openapi' }),
  ],
  inputs: {
    project: string('Library project to write the spec into'),
    specPath: string('Output path for the OpenAPI spec file'),
  },
  outputs: {
    specPath: string('Path to the generated OpenAPI spec file'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm'],
  },
  post: [gate('openapi-lint', { description: 'OpenAPI spec lints cleanly', check: 'npx --yes @redocly/cli lint {specPath}' })],
});

const generateApiClient = command({
  name: 'generate-api-client',
  purpose: 'Generate a TypeScript fetch API client from an OpenAPI spec using openapi-generator',
  steps: [
    run('npm install'),
    run('npx @openapitools/openapi-generator-cli generate -i {specPath} -g typescript-fetch -o {outputDir} --skip-validate-spec --additional-properties=typescriptThreePlus=true,supportsES6=true,importFileExtension=.js'),
    run('node {patchScript}'),
  ],
  inputs: {
    specPath: string('Path to the OpenAPI spec file'),
    outputDir: string('Output directory for the generated client'),
    patchScript: string('Path to the script relaxing the generated client tsconfig for nodenext compatibility'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node@22', 'npm', 'java@21'],
  },
  post: [successfulBuild()],
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
    tools: ['node', 'npm'],
  },
  post: [successfulBuild(), linted()],
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
    tools: ['node', 'npm'],
  },
  post: [successfulBuild(), linted()],
});

// -- Workflow --

export default workflow({
  name: 'create-todomvc',
  purpose: 'Create a full-stack TodoMVC application with OpenAPI spec, API client, Express backend, and React frontend',
  workspace: workspace(process.env['FABSTER_DEMO_REPO'] ?? '/tmp/fabster-todomvc-demo'),
  delivery: mergeRequest(),
  graph: (ctx) => {
    // The workspace itself is scaffolded with raw create-nx-workspace
    // (see run.ts) — fabrication starts from adding plugins.
    const addReact = ctx.run('add-react', addPlugin, {
      plugin: '@nx/react',
    });

    const addNode = ctx.run('add-node', addPlugin, {
      plugin: '@nx/node',
    });

    // Left branch: scaffold frontend app (needs react plugin)
    const frontendApp = ctx.run('generate-frontend', generateApp, {
      generator: '@nx/react:app',
      name: 'web',
      directory: 'apps/web',
    }, { dependsOn: [addReact] });

    // Right branch: API spec + backend (needs node plugin)
    const spec = ctx.run('write-openapi-spec', generateOpenApiSpec, {
      project: 'api-spec',
      specPath: 'packages/api-spec/todo.openapi.yaml',
    }, { dependsOn: [addNode] });

    const backendApp = ctx.run('generate-backend', generateApp, {
      generator: '@nx/node:app',
      name: 'api',
      directory: 'apps/api',
    }, { dependsOn: [addNode] });

    // API client chain (needs spec)
    const clientLib = ctx.run('generate-client-lib', generateLibrary, {
      generator: '@nx/js:library',
      name: 'api-client',
      directory: 'packages/api-client',
    }, { dependsOn: [spec] });

    const client = ctx.run('generate-api-client', generateApiClient, {
      specPath: spec.output('specPath'),
      outputDir: 'packages/api-client/src/generated',
      patchScript: patchApiClientTsconfig,
    }, { dependsOn: [clientLib] });

    // Implement backend (needs backend app + spec)
    ctx.run('implement-backend', implementBackend, {
      project: 'api',
      specProject: 'api-spec',
    }, { dependsOn: [backendApp, spec] });

    // Implement frontend (needs frontend app + api client)
    ctx.run('implement-frontend', implementFrontend, {
      project: 'web',
      clientProject: 'api-client',
    }, { dependsOn: [frontendApp, client] });
  },
});

export const agents = [
  claudeCodeAgent('Tank', {
    role: 'Senior full-stack engineer',
    goal: 'Implement robust, tested code that builds and passes conformance on the first try',
    backstory: `You are a meticulous engineer who takes pride in shipping clean code. You always run the build and verify your work before declaring done. You fix issues you find rather than leaving them for others. You work inside an isolated git worktree — make file changes directly, verify them, and do not commit, branch, or open pull requests.`,
    args: ['-p', '{prompt}', '--max-turns', '30', '--dangerously-skip-permissions'],
    capabilities: [
      provide('agent.skill', { name: 'openapi' }),
      provide('agent.skill', {
        name: 'code-generation',
        language: 'typescript',
      }),
      provide('agent.skill', { name: 'react' }),
      provide('agent.skill', { name: 'testing' }),
    ],
  }),
];
