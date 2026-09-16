import { serve } from '@restatedev/restate-sdk';
import { fabrication, forgeWebhook } from '@fabster/engine';
import { supportCase, webexWebhook } from './service.js';

// Register with a running Restate server:
//   restate deployments register http://localhost:9080
await serve({
  services: [supportCase, webexWebhook, fabrication, forgeWebhook],
  port: 9080,
});
