import { registry } from 'docs/registry';
import z from 'zod';

export const XFollowerMetricResponseSchema = z.object({
  xAccount: z.object({
    id: z.string(),
    userId: z.string(),
    username: z.string().nullable(),
    profileUrl: z.string().nullable(),
  }),
  window: z.object({
    startTime: z.string(),
    endTime: z.string(),
  }),
  snapshots: z.array(
    z.object({
      followers: z.number(),
      createdAt: z.string(),
    }),
  ),
});

registry.register(
  'XFollowerMetricResponseSchema',
  XFollowerMetricResponseSchema,
);
