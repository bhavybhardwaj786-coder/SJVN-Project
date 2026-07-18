import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'

export interface AuthedRequest extends Request {
  user?: { id: string; role: string }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ data: null, error: 'Not authenticated' })
  }
  try {
    req.user = verifyAccessToken(header.slice(7))
    next()
  } catch {
    return res.status(401).json({ data: null, error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ data: null, error: 'Forbidden' })
    }
    next()
  }
}