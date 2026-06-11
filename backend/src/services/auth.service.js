const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const ActivityLog = require('../models/ActivityLog');
const { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } = require('../utils/jwt');
const crypto = require('crypto');
const { sendEmail, passwordResetTemplate } = require('../utils/email');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
};

const logActivity = async (userId, action, description, req, status = 'success', metadata = {}) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      description,
      metadata,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
      status,
    });
  } catch (_) {
    // Non-critical — don't fail request on log error
  }
};

const login = async ({ identifier, password }, req, res) => {
  // identifier = email OR mobile
  const query = identifier.includes('@')
    ? { email: identifier.toLowerCase() }
    : { mobile: identifier };

  const user = await User.findOne(query)
    .select('+password')
    .populate('enrolledCourses.course', 'title thumbnail instructor level status');

  if (!user || !(await user.comparePassword(password))) {
    if (user) {
      await logActivity(user._id, 'FAILED_LOGIN', 'Invalid password attempt', req, 'failure');
    }
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  if (user.status === 'blocked') {
    const err = new Error('Your account has been blocked. Contact admin.');
    err.statusCode = 403;
    throw err;
  }

  // Update last login
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshTokenValue = generateRefreshToken();
  const expiry = getRefreshTokenExpiry();

  await RefreshToken.create({
    token: refreshTokenValue,
    user: user._id,
    expiresAt: expiry,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  });

  setAuthCookies(res, accessToken, refreshTokenValue);
  await logActivity(user._id, 'LOGIN', 'User logged in', req);

  return { user, accessToken, mustChangePassword: user.mustChangePassword };
};

const logout = async (refreshToken, userId, req, res) => {
  if (refreshToken) {
    await RefreshToken.findOneAndUpdate({ token: refreshToken }, { isRevoked: true });
  }
  clearAuthCookies(res);
  await logActivity(userId, 'LOGOUT', 'User logged out', req);
};

const refreshAccessToken = async (oldRefreshToken, req, res) => {
  const tokenDoc = await RefreshToken.findOne({
    token: oldRefreshToken,
    isRevoked: false,
  });

  if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
    clearAuthCookies(res);
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findById(tokenDoc.user);
  if (!user || user.status === 'blocked') {
    clearAuthCookies(res);
    const err = new Error('User not found or blocked');
    err.statusCode = 401;
    throw err;
  }

  const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
  const newRefreshToken = generateRefreshToken();
  const expiry = getRefreshTokenExpiry();

  // Rotate refresh token
  tokenDoc.isRevoked = true;
  tokenDoc.replacedBy = newRefreshToken;
  await tokenDoc.save();

  await RefreshToken.create({
    token: newRefreshToken,
    user: user._id,
    expiresAt: expiry,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
  });

  setAuthCookies(res, newAccessToken, newRefreshToken);

  return { accessToken: newAccessToken, user };
};

const changePassword = async (userId, { currentPassword, newPassword }, req) => {
  const user = await User.findById(userId).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  // Revoke all refresh tokens
  await RefreshToken.updateMany({ user: userId }, { isRevoked: true });
  await logActivity(userId, 'PASSWORD_CHANGE', 'Password changed', req);
};

const forgotPassword = async (email, req) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return; // Silently fail to prevent user enumeration

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const template = passwordResetTemplate({ name: user.name, resetUrl, appName: process.env.APP_NAME });
  await sendEmail({ to: user.email, ...template });
  await logActivity(user._id, 'PASSWORD_RESET', 'Password reset requested', req);
};

const resetPassword = async (token, newPassword, req) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error('Invalid or expired reset token');
    err.statusCode = 400;
    throw err;
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.mustChangePassword = false;
  await user.save();

  await RefreshToken.updateMany({ user: user._id }, { isRevoked: true });
  await logActivity(user._id, 'PASSWORD_RESET', 'Password reset completed', req);
};

const updateProfile = async (userId, { name, mobile }) => {
  const user = await User.findById(userId);
  if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }

  if (name && name.trim()) user.name = name.trim();

  if (mobile !== undefined) {
    if (mobile) {
      const exists = await User.findOne({ mobile, _id: { $ne: userId } });
      if (exists) { const e = new Error('Mobile number already in use'); e.statusCode = 409; throw e; }
      user.mobile = mobile;
    } else {
      user.mobile = undefined;
    }
  }

  await user.save({ validateBeforeSave: false });
  return user;
};

module.exports = { login, logout, refreshAccessToken, changePassword, forgotPassword, resetPassword, updateProfile };
