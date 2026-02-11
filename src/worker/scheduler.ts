import cron from 'node-cron';
import { syncAllReposDaily } from '../services/sync';
import { syncXAccounts } from '../services/xApi';
import { config } from '../config';

/**
 * Sets up the daily sync scheduler
 * Runs once per day at 2 AM UTC
 */
export function startScheduler(): void {
  // Run daily at 2 AM UTC
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting scheduled daily sync...');
    try {
      await syncAllReposDaily();
      console.log('Daily sync completed');
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
