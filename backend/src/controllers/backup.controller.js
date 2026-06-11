const backupService = require('../services/backup.service');
const { success, error } = require('../utils/apiResponse');

const triggerDBBackup = async (req, res, next) => {
  try {
    const result = await backupService.runDatabaseBackup('manual');
    return success(res, result, 'Database backup completed');
  } catch (err) { next(err); }
};

const triggerMediaBackup = async (req, res, next) => {
  try {
    const result = await backupService.runMediaBackup('manual');
    return success(res, result, 'Media backup completed');
  } catch (err) { next(err); }
};

const getLogs = async (req, res, next) => {
  try {
    const result = await backupService.getBackupLogs(req.query);
    return success(res, result, 'Backup logs fetched');
  } catch (err) { next(err); }
};

module.exports = { triggerDBBackup, triggerMediaBackup, getLogs };
