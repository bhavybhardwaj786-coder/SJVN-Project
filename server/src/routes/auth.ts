import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { requireAuth, AuthedRequest } from '../middleware/auth'
import type { User, CurrentUser } from '../types'

const router = Router()

function toCurrentUser(u: User): CurrentUser {
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    site_id: u.site_id ?? undefined,
    designation: u.designation ?? undefined,
  }
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const result = await pool.query<User>('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]

    if (!user || !user.is_active) {
      return res.status(401).json({ data: null, error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ data: null, error: 'Invalid email or password' })
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role })
    const refreshToken = signRefreshToken({ id: user.id })

    res.json({ data: { accessToken, refreshToken, user: toCurrentUser(user) }, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const result = await pool.query<User>('SELECT * FROM users WHERE id = $1', [req.user!.id])
    const user = result.rows[0]
    if (!user || !user.is_active) {
      return res.status(401).json({ data: null, error: 'User not found or inactive' })
    }
    res.json({ data: toCurrentUser(user), error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(401).json({ data: null, error: 'Missing refresh token' })
    }

    let payload: { id: string }
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      return res.status(401).json({ data: null, error: 'Invalid or expired refresh token' })
    }

    const result = await pool.query<User>('SELECT * FROM users WHERE id = $1', [payload.id])
    const user = result.rows[0]
    if (!user || !user.is_active) {
      return res.status(401).json({ data: null, error: 'User not found or inactive' })
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role })
    res.json({ data: { accessToken }, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

export default router