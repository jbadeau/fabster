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
  purpose: 'Create an OpenAPI 3.0 spec for a Todo CRUD API with endpoints: GET /todos, POST /todos, PUT /todos/:id, DELETE /todos/:id. Write it to packages/api-spec/src/openapi.yaml',
  reasoning: 'medium',
  requirements: [
    require('agent.skill', { name: 'code-generation', language: 'typescript' }),
  ],
  inputs: {
    project: string('Library project to write the spec into'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm'],
  },
  gates: [successfulBuild()],
});

const generateApiClient = command({
  name: 'generate-api-client',
  purpose: 'Generate a TypeScript API client from an OpenAPI spec',
  run: [
    'npm install openapi-typescript-codegen --save-dev',
    'npx openapi-typescript-codegen --input {specPath} --output {outputDir} --client fetch',
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
  purpose: 'Implement Express API routes for the Todo CRUD API matching the OpenAPI spec, with in-memory storage and tests',
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
  purpose: 'Implement a TodoMVC React UI that uses the generated API client, with add/complete/delete/filter functionality',
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

    // Step 3: Generate the shared API spec library
    const specLib = ctx.run('generate-spec-lib', generateLibrary, {
      generator: '@nx/js:library',
      name: 'api-spec',
      directory: 'packages/api-spec',
    }, { dependsOn: [addNode] });

    // Step 4: Agent writes the OpenAPI spec
    const spec = ctx.run('write-openapi-spec', generateOpenApiSpec, {
      project: 'api-spec',
    }, { dependsOn: [specLib] });

    // Step 5: Generate the API client library
    const clientLib = ctx.run('generate-client-lib', generateLibrary, {
      generator: '@nx/js:library',
      name: 'api-client',
      directory: 'packages/api-client',
    }, { dependsOn: [spec] });

    // Step 6: Generate API client from spec
    const client = ctx.run('generate-api-client', generateApiClient, {
      specPath: 'packages/api-spec/src/openapi.yaml',
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

