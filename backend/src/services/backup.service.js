const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const BackupLog = require('../models/BackupLog');
const { uploadToDrive, pruneOldBackups } = require('../utils/googleDrive');
const logger = require('../utils/logger');

const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// ── Helpers ───────────────────────────────────────────

const execCommand = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });

const zipDirectory = (sourceDir, outPath) =>
  new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });

const zipFiles = (files, outPath) =>
  new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    files.forEach(({ src, name }) => {
      if (fs.existsSync(src)) archive.directory(src, name);
    });
    archive.finalize();
  });

const getMB = (filePath) => {
  try { return Math.round(fs.statSync(filePath).size / 1024 / 1024 * 10) / 10; }
  catch { return 0; }
};

// ── Database Backup ───────────────────────────────────

const runDatabaseBackup = async (triggeredBy = 'cron') => {
  const log = await BackupLog.create({ type: 'database', status: 'running', triggeredBy });
  const startTime = Date.now();
  const ts = timestamp();
  const dumpDir = path.join(BACKUP_DIR, `db-dump-${ts}`);
  const zipPath = path.join(BACKUP_DIR, `db-backup-${ts}.zip`);

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lms_db';
    const dbName = mongoUri.split('/').pop().split('?')[0];

    logger.info(`[Backup] Starting MongoDB backup: ${dbName}`);

    // mongodump
    await execCommand(`mongodump --uri="${mongoUri}" --out="${dumpDir}" --quiet`);

    // Zip the dump
    await zipDirectory(dumpDir, zipPath);

    // Remove unzipped dump
    fs.rmSync(dumpDir, { recursive: true, force: true });

    const sizeMB = getMB(zipPath);
    const filename = `db-backup-${ts}.zip`;

    logger.info(`[Backup] DB dump complete: ${sizeMB}MB`);

    // Upload to Google Drive
    let driveFileId, driveLink;
    try {
      const driveRes = await uploadToDrive(zipPath, filename, 'application/zip');
      driveFileId = driveRes.id;
      driveLink = driveRes.webViewLink;
      await pruneOldBackups('db-backup-', 7);
      logger.info(`[Backup] Uploaded to Drive: ${driveFileId}`);
    } catch (driveErr) {
      logger.warn(`[Backup] Drive upload failed: ${driveErr.message}. Backup kept locally.`);
    }

    await BackupLog.findByIdAndUpdate(log._id, {
      status: 'success',
      filename,
      sizeMB,
      driveFileId,
      driveLink,
      duration: Math.round((Date.now() - startTime) / 1000),
    });

    return { success: true, filename, sizeMB, driveFileId };
  } catch (err) {
    logger.error(`[Backup] Database backup failed: ${err.message}`);
    fs.rmSync(dumpDir, { recursive: true, force: true });
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    await BackupLog.findByIdAndUpdate(log._id, {
      status: 'failed',
      error: err.message,
      duration: Math.round((Date.now() - startTime) / 1000),
    });
    throw err;
  }
};

// ── Media Backup ──────────────────────────────────────

const runMediaBackup = async (triggeredBy = 'cron') => {
  const log = await BackupLog.create({ type: 'media', status: 'running', triggeredBy });
  const startTime = Date.now();
  const ts = timestamp();
  const zipPath = path.join(BACKUP_DIR, `media-backup-${ts}.zip`);

  try {
    const uploadsBase = path.join(__dirname, '../../uploads');

    const mediaFolders = [
      { src: path.join(uploadsBase, 'videos/hls'), name: 'videos' },
      { src: path.join(uploadsBase, 'pdfs'), name: 'pdfs' },
      { src: path.join(uploadsBase, 'certificates'), name: 'certificates' },
      { src: path.join(uploadsBase, 'images'), name: 'images' },
    ];

    logger.info('[Backup] Starting media backup...');
    await zipFiles(mediaFolders, zipPath);

    const sizeMB = getMB(zipPath);
    const filename = `media-backup-${ts}.zip`;

    logger.info(`[Backup] Media zip complete: ${sizeMB}MB`);

    let driveFileId, driveLink;
    try {
      const driveRes = await uploadToDrive(zipPath, filename, 'application/zip');
      driveFileId = driveRes.id;
      driveLink = driveRes.webViewLink;
      await pruneOldBackups('media-backup-', 4); // keep 4 weekly backups
    } catch (driveErr) {
      logger.warn(`[Backup] Drive upload skipped: ${driveErr.message}`);
    }

    await BackupLog.findByIdAndUpdate(log._id, {
      status: 'success',
      filename,
      sizeMB,
      driveFileId,
      driveLink,
      duration: Math.round((Date.now() - startTime) / 1000),
    });

    return { success: true, filename, sizeMB, driveFileId };
  } catch (err) {
    logger.error(`[Backup] Media backup failed: ${err.message}`);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    await BackupLog.findByIdAndUpdate(log._id, {
      status: 'failed',
      error: err.message,
      duration: Math.round((Date.now() - startTime) / 1000),
    });
    throw err;
  }
};

const getBackupLogs = async ({ page = 1, limit = 20, type } = {}) => {
  const query = type ? { type } : {};
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [logs, total] = await Promise.all([
    BackupLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    BackupLog.countDocuments(query),
  ]);
  return { logs, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } };
};

module.exports = { runDatabaseBackup, runMediaBackup, getBackupLogs };
