import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'promptforge_secret_key';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getAuthUser(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    return null;
  }
}

export function requireAuth(request, requireSuperAdmin = false) {
  const user = getAuthUser(request);
  
  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (requireSuperAdmin && user.role !== 'super_admin') {
    return { error: 'Forbidden: Super admin access required', status: 403 };
  }

  return { user };
}
