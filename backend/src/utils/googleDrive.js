const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const getAuthClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
};

const getDriveClient = () => {
  const auth = getAuthClient();
  return google.drive({ version: 'v3', auth });
};

/**
 * Upload a file to Google Drive.
 * @param {string} filePath - absolute path to file on disk
 * @param {string} fileName - name to use on Drive
 * @param {string} mimeType - MIME type of the file
 * @param {string} [folderId] - Drive folder ID (defaults to env var)
 * @returns {Promise<{id, name, webViewLink}>}
 */
const uploadToDrive = async (filePath, fileName, mimeType = 'application/zip', folderId = null) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google Drive credentials not configured');
  }

  const drive = getDriveClient();
  const targetFolder = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const fileMetadata = {
    name: fileName,
    ...(targetFolder ? { parents: [targetFolder] } : {}),
  };

  const media = {
    mimeType,
    body: fs.createReadStream(filePath),
  };

  logger.info(`Uploading ${fileName} to Google Drive...`);
  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink',
  });

  logger.info(`Uploaded to Drive: ${res.data.name} (${res.data.id})`);
  return res.data;
};

/**
 * List backup files in the Drive folder.
 */
const listBackups = async (folderId = null) => {
  const drive = getDriveClient();
  const targetFolder = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  const res = await drive.files.list({
    q: targetFolder ? `'${targetFolder}' in parents and trashed = false` : 'trashed = false',
    fields: 'files(id, name, size, createdTime, webViewLink)',
    orderBy: 'createdTime desc',
    pageSize: 50,
  });

  return res.data.files;
};

/**
 * Delete old backup files — keep only the last N per type.
 */
const pruneOldBackups = async (prefix, keepCount = 7, folderId = null) => {
  try {
    const files = await listBackups(folderId);
    const matching = files.filter(f => f.name.startsWith(prefix));
    const toDelete = matching.slice(keepCount);

    const drive = getDriveClient();
    for (const file of toDelete) {
      await drive.files.delete({ fileId: file.id });
      logger.info(`Pruned old backup from Drive: ${file.name}`);
    }
  } catch (err) {
    logger.warn(`Backup pruning failed: ${err.message}`);
  }
};

module.exports = { uploadToDrive, listBackups, pruneOldBackups };
