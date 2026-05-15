import {
  task,
  string,
  require,
} from '@fabster/core';

export const createOpenApiSpec = task({
  name: 'create-openapi-spec',
  purpose: 'Create an OpenAPI 3.0 YAML specification file for a REST API',
  reasoning: 'medium',
  requirements: [
    require('agent.skill', { name: 'openapi' }),
  ],
  inputs: {
    outputPath: string('File path for the generated OpenAPI spec'),
    apiName: string('Name of the API'),
    endpoints: string('Description of the API endpoints to define'),
    schemaDescription: string('Description of the data models/schemas'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: [],
  },
  gates: [],
});
