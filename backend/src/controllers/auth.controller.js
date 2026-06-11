const authService = require('../services/auth.service');
const { success, error } = require('../utils/apiResponse');

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const result = await authService.login({ identifier, password }, req, res);
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    await authService.logout(refreshToken, req.user._id, req, res);
    return success(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) return error(res, 'Refresh token required', 401);
    const result = await authService.refreshAccessToken(oldRefreshToken, req, res);
    return success(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    return success(res, { user: req.user }, 'User profile fetched');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user._id, req.body, req);
    return success(res, {}, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email, req);
    return success(res, {}, 'If your email is registered, you will receive a reset link shortly.');
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    await authService.resetPassword(token, req.body.password, req);
    return success(res, {}, 'Password reset successful. You can now log in.');
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user._id, req.body);
    return success(res, { user }, 'Profile updated successfully');
  } catch (err) { next(err); }
};

module.exports = { login, logout, refreshToken, getMe, changePassword, forgotPassword, resetPassword, updateProfile };
