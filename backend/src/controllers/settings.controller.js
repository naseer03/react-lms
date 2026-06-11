const Settings = require('../models/Settings');
const { success } = require('../utils/apiResponse');
const path = require('path');
const fs = require('fs');

const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ key: 'global' });
    if (!settings) settings = await Settings.create({ key: 'global' });
    return success(res, { settings }, 'Settings fetched');
  } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: req.body },
      { new: true, upsert: true }
    );
    return success(res, { settings }, 'Settings updated');
  } catch (err) { next(err); }
};

const uploadAsset = (field) => async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const relativePath = `images/${req.file.filename}`;
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: { [field]: relativePath } },
      { new: true, upsert: true }
    );
    return success(res, { settings, url: `/uploads/${relativePath}` }, `${field} updated`);
  } catch (err) { next(err); }
};

const uploadCertAsset = (field) => async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    // Store cert assets separately
    const dir = path.join(__dirname, '../../uploads/cert-assets');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const relativePath = `cert-assets/${req.file.filename}`;
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: { [field]: relativePath } },
      { new: true, upsert: true }
    );
    return success(res, { settings, url: `/uploads/${relativePath}` }, `${field} updated`);
  } catch (err) { next(err); }
};

module.exports = { getSettings, updateSettings, uploadAsset, uploadCertAsset };
