import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    claims?: Record<string, any>;
  };
}

/**
 * Clerk authentication middleware
 * Verifies JWT token from Authorization header
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    

    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  

    // Verify token with Clerk
    
    const sessionClaims = await clerkClient.verifyToken(token);

    if (!sessionClaims || !sessionClaims.sub) {
      console.log('❌ Auth failed: Invalid or expired token');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }


    // Attach user info to request
    req.auth = {
      userId: sessionClaims.sub,
      sessionId: sessionClaims.sid as string,
      claims: sessionClaims,
    };

    next();
  } catch (err) {
    console.error('❌ Authentication error:', err);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token verification failed',
      details: process.env.NODE_ENV === 'development' ? (err as Error).message : undefined,
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without auth
      next();
      return;
    }

    const token = authHeader.substring(7);
    const sessionClaims = await clerkClient.verifyToken(token);

    if (sessionClaims && sessionClaims.sub) {
      req.auth = {
        userId: sessionClaims.sub,
        sessionId: sessionClaims.sid as string,
        claims: sessionClaims,
      };
    }

    next();
  } catch (err) {
    // Token invalid, but continue without auth
    next();
  }
}

/**
 * Get user information from Clerk
 */
export async function getUserInfo(userId: string) {
  try {
    const user = await clerkClient.users.getUser(userId);

    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || null,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      metadata: user.publicMetadata,
    };
  } catch (err) {
    console.error('Failed to get user info:', err);
    return null;
  }
}

/**
 * Verify user has access to resource
 */
export function createResourceOwnershipMiddleware(
  getOwnerId: (req: AuthRequest) => string | null
) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const ownerId = getOwnerId(req);

    if (!ownerId) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    if (ownerId !== req.auth.userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
}
