import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { getClientIP, createDeviceFingerprint, isTokenExpired } from './security-utils';

// Error handling middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  // Default error
  let status = 500;
  let message = 'Internal server error';
  let details = undefined;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
    details = err.message;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    status = 404;
    message = 'Not found';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'File too large';
    details = 'Maximum file size is 100MB';
  } else if (err.code === 'ENOENT') {
    status = 404;
    message = 'File not found';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'Something went wrong';
    details = undefined;
  }

  res.status(status).json({
    error: true,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// 404 handler
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: true,
    message: 'Route not found',
    path: req.originalUrl
  });
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ 
      error: true, 
      message: 'Authentication required' 
    });
  }
  next();
}

// Admin authentication middleware
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated via session
  if (!req.session?.userId) {
    return res.status(401).json({
      error: true,
      message: 'Authentication required'
    });
  }

  try {
    // Get user from storage to check admin status
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'User not found'
      });
    }

    if (!user.isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'Admin access required'
      });
    }

    // Add user to request for use in route handlers
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    console.log(`${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`);
  });
  
  next();
}

// Token-based authentication middleware
export async function requireTokenAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let userId = (req.session as any)?.userId;
    let tokenId = (req.session as any)?.tokenId;

    // If no session, check for device-based authentication
    if (!userId) {
      const clientIP = getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers['accept-language'] as string);

      console.log(`[AUTH] Trying device authentication for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
      
      // Check if this device has a valid session (only active sessions)
      const deviceSession = await storage.getDeviceSessionByFingerprint(deviceFingerprint, clientIP, true);

      if (deviceSession) {
        console.log(`[AUTH] Found active device session for user ${deviceSession.userId}`);
      } else {
        console.log(`[AUTH] No active device session found for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
      }

      if (deviceSession) {
        // Restore session for this device
        userId = deviceSession.userId;
        tokenId = deviceSession.tokenId;

        if (req.session) {
          (req.session as any).userId = userId;
          (req.session as any).tokenId = tokenId;
        }

        // Update last access time
        await storage.updateDeviceSessionAccess(deviceSession.id);
      }
    }

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        requiresToken: true
      });
    }

    // Get user to check if they're admin (admins bypass token restrictions)
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'User not found'
      });
    }

    // Admin users bypass token-based restrictions
    if (user.isAdmin) {
      return next();
    }

    // For non-admin users, enforce token-based access
    if (!tokenId) {
      return res.status(401).json({
        error: true,
        message: 'Token-based access required',
        requiresToken: true
      });
    }

    // Validate device/IP binding for token-based users
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers['accept-language'] as string);

    const isValidDevice = await storage.validateDeviceAccess(userId, clientIP, deviceFingerprint);

    if (!isValidDevice) {
      return res.status(403).json({
        error: true,
        message: 'Access denied. This session is bound to a different device or location.'
      });
    }

    // Update last access time
    const deviceSession = await storage.getDeviceSession(userId, tokenId);
    if (deviceSession) {
      await storage.updateDeviceSessionAccess(deviceSession.id);
    }

    next();
  } catch (error) {
    console.error('Token auth middleware error:', error);
    res.status(500).json({
      error: true,
      message: 'Authentication error'
    });
  }
}

// Device binding validation middleware
export async function validateDeviceBinding(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      return next(); // Let other auth middleware handle this
    }

    // Get user to check if they're admin
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'User not found'
      });
    }

    // Admin users bypass device binding
    if (user.isAdmin) {
      return next();
    }

    // For non-admin users, validate device binding
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers['accept-language'] as string);

    const isValidDevice = await storage.validateDeviceAccess(userId, clientIP, deviceFingerprint);

    if (!isValidDevice) {
      return res.status(403).json({
        error: true,
        message: 'Access denied from this device or location.'
      });
    }

    next();
  } catch (error) {
    console.error('Device binding middleware error:', error);
    res.status(500).json({
      error: true,
      message: 'Device validation error'
    });
  }
}

// Cleanup expired tokens and OTPs middleware (run periodically)
export async function cleanupExpiredData(req: Request, res: Response, next: NextFunction) {
  try {
    // Run cleanup every 100 requests (approximately)
    if (Math.random() < 0.01) {
      await storage.cleanupExpiredTokens();
      await storage.cleanupExpiredOTPs();
    }
    next();
  } catch (error) {
    console.error('Cleanup middleware error:', error);
    next(); // Don't block requests if cleanup fails
  }
}

// Rate limiting for token generation
const tokenGenerationAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function rateLimitTokenGeneration(req: Request, res: Response, next: NextFunction) {
  const clientIP = getClientIP(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5; // Max 5 token generation attempts per 15 minutes

  const attempts = tokenGenerationAttempts.get(clientIP);

  if (attempts) {
    // Reset if window has passed
    if (now - attempts.lastAttempt > windowMs) {
      tokenGenerationAttempts.set(clientIP, { count: 1, lastAttempt: now });
    } else if (attempts.count >= maxAttempts) {
      return res.status(429).json({
        error: true,
        message: 'Too many token generation attempts. Please try again later.',
        retryAfter: Math.ceil((windowMs - (now - attempts.lastAttempt)) / 1000)
      });
    } else {
      attempts.count++;
      attempts.lastAttempt = now;
    }
  } else {
    tokenGenerationAttempts.set(clientIP, { count: 1, lastAttempt: now });
  }

  next();
}

// CORS middleware (if needed)
export function corsHandler(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}
