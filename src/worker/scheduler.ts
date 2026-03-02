import cron from 'node-cron';
import { syncXAccounts } from '../services/xApi';
import { config } from '../config';
import {
  generateDailySummaries,
  generateWeeklyAggregateSummaries,
} from '../services/summarizer';

/**
 * Sets up the daily sync scheduler
 * Runs once per day at 2 AM UTC
 */
export function startScheduler(): void {
  // Run daily at 2 AM UTC
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting scheduled daily summarizer...');
    try {
      await generateDailySummaries();
      console.log('Daily summaries completed');

      await generateWeeklyAggregateSummaries();
      console.log('Weekly aggregates completed');
    } catch (error) {
      console.error('Error in daily sync:', error);
    }
  });

  if (config.xApi.enabled) {
    cron.schedule(config.xApi.syncCron, async () => {
      console.log('Starting scheduled X API sync...');
      try {
        await syncXAccounts();
        console.log('X API sync completed');
      } catch (error) {
        console.error('Error in X API sync:', error);
      }
    });
  }

  console.log(
    `Scheduler started - daily sync at 2 AM UTC; X API sync ${config.xApi.enabled ? `at ${config.xApi.syncCron}` : 'disabled'}`,
  );
}
