import { createTRPCReact, type CreateTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@fabster/server';

// Explicit annotation: without it TS tries to name tRPC's internal getQueryKey
// type in the emitted declarations, which isn't portable (TS2742).
export const trpc: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>();
