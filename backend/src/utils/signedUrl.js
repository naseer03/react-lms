const crypto = require('crypto');

const SECRET = process.env.JWT_ACCESS_SECRET || 'signed-url-secret';
const DEFAULT_EXPIRY = 4 * 60 * 60; // 4 hours in seconds

/**
 * Generate a signed token for video streaming access.
 * Token = HMAC-SHA256(videoId + studentId + expires) encoded as hex
 */
const generateSignedToken = (videoId, studentId, expiresInSeconds = DEFAULT_EXPIRY) => {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${videoId}:${studentId}:${expires}`;
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  // Return base64url-encoded token
  const token = Buffer.from(JSON.stringify({ videoId, studentId, expires, signature })).toString('base64url');
  return { token, expires };
};

/**
 * Verify a signed token. Returns decoded payload or throws.
 */
const verifySignedToken = (token) => {
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid token format');
  }

  const { videoId, studentId, expires, signature } = decoded;

  if (!videoId || !studentId || !expires || !signature) {
    throw new Error('Malformed token');
  }

  if (Math.floor(Date.now() / 1000) > expires) {
    throw new Error('Token expired');
  }

  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(`${videoId}:${studentId}:${expires}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
    throw new Error('Invalid signature');
  }

  return { videoId, studentId, expires };
};

module.exports = { generateSignedToken, verifySignedToken };
