const cron = require('node-cron');
const { runDatabaseBackup, runMediaBackup } = require('../services/backup.service');
const logger = require('../utils/logger');

const initScheduler = () => {
  // ── Daily DB Backup — every day at 02:00 AM ───────────
  cron.schedule('0 2 * * *', async () => {
    logger.info('[Cron] Running daily database backup...');
    try {
      const result = await runDatabaseBackup('cron');
      logger.info(`[Cron] DB backup complete: ${result.filename} (${result.sizeMB}MB)`);
    } catch (err) {
      logger.error(`[Cron] DB backup failed: ${err.message}`);
    }
  }, { timezone: 'Asia/Kolkata' });

  // ── Weekly Media Backup — Sunday at 03:00 AM ──────────
  cron.schedule('0 3 * * 0', async () => {
    logger.info('[Cron] Running weekly media backup...');
    try {
      const result = await runMediaBackup('cron');
      logger.info(`[Cron] Media backup complete: ${result.filename} (${result.sizeMB}MB)`);
    } catch (err) {
      logger.error(`[Cron] Media backup failed: ${err.message}`);
    }
  }, { timezone: 'Asia/Kolkata' });

  logger.info('[Cron] Scheduler initialized — DB backup: 2:00 AM daily | Media backup: 3:00 AM Sunday');
};

module.exports = { initScheduler };
