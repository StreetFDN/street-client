import cron from 'node-cron';
import { syncAllReposDaily } from '../services/sync';

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

  console.log('Scheduler started - daily sync scheduled for 2 AM UTC');
}
