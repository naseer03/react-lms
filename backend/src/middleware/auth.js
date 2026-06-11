const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const { error } = require('../utils/apiResponse');

const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header first, then cookie
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return error(res, 'Access token required', 401);
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('enrolledCourses.course', 'title thumbnail instructor level status');

    if (!user) return error(res, 'User not found', 401);
    if (user.status === 'blocked') return error(res, 'Account has been blocked. Contact admin.', 403);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return error(res, 'Access token expired', 401);
    if (err.name === 'JsonWebTokenError') return error(res, 'Invalid access token', 401);
    return error(res, 'Authentication failed', 401);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return error(res, 'You do not have permission to perform this action', 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
