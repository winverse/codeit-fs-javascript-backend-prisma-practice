import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch {
    return false;
  }
}

export function generateAccessToken(user, accessSecret, expiresIn = '15m') {
  return jwt.sign({ userId: user.id, name: user.name }, accessSecret, {
    algorithm: 'HS256',
    expiresIn,
  });
}

export function generateRefreshToken(user, refreshSecret, expiresIn = '7d') {
  return jwt.sign({ userId: user.id }, refreshSecret, {
    algorithm: 'HS256',
    expiresIn,
  });
}

export function generateTokens(user, secrets, expiresIn = {}) {
  return {
    accessToken: generateAccessToken(
      user,
      secrets.access,
      expiresIn.access ?? '15m',
    ),
    refreshToken: generateRefreshToken(
      user,
      secrets.refresh,
      expiresIn.refresh ?? '7d',
    ),
  };
}

export function verifyToken(token, tokenType, secrets) {
  try {
    if (!['access', 'refresh'].includes(tokenType)) return null;
    const secret = tokenType === 'access' ? secrets.access : secrets.refresh;
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

function cookieOptions(secure) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(res, tokens, { secure = false } = {}) {
  const base = cookieOptions(secure);
  res.cookie('accessToken', tokens.accessToken, {
    ...base,
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    ...base,
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(res, { secure = false } = {}) {
  const options = cookieOptions(secure);
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
}

export function authenticate(secrets) {
  return (req, res, next) => {
    const token = req.cookies?.accessToken;
    if (!token) {
      return res
        .status(401)
        .json({ message: 'No authentication token provided' });
    }

    const payload = verifyToken(token, 'access', secrets);
    if (!payload) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = payload;
    return next();
  };
}

export function toPublicUser({ password: _password, ...user }) {
  return user;
}
