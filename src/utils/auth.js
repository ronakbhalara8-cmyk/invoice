import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request) {
  const token = request.cookies.get('token')?.value;
  return token;
}

export function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
