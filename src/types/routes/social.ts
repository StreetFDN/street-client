import { z } from 'zod';

const DEFAULT_WINDOW_DAYS = 7;

export const SocialWindowSchema = z
  .object({
    start_time: z.iso
      .datetime({ offset: true })
      .default(() =>
        new Date(
          new Date().getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString(),
      ),
    end_time: z.iso
      .datetime({ offset: true })
      .default(() => new Date().toISOString()),
  })
  .strict()
  .refine(
    (value) => {
      return new Date(value.start_time) <= new Date(value.end_time);
    },
    {
      message: 'start_time must be before end_time',
    },
  );
