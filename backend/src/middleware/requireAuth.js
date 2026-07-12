import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Missing or malformed token.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Invalid token payload.'
      });
    }

    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error('[requireAuth] JWT Verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Access denied. Invalid or expired token.'
    });
  }
};
