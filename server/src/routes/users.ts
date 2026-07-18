import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db'
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth'
import type { User } from '../types'

const router = Router()

router.use(requireAuth, requireRole('admin', 'super_admin'))

// GET /api/users?role=admin|site_user|contractor (replaces listAdmins/listSiteUsers/listContractors)
router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const role = req.query.role as string
    if (!['admin', 'site_user', 'contractor'].includes(role)) {
      return res.status(400).json({ data: null, error: 'role must be admin, site_user, or contractor' })
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.site_id, u.designation, u.department, u.is_active, u.created_at,
              CASE WHEN u.site_id IS NOT NULL THEN json_build_object('id', s.id, 'name', s.name, 'code', s.code) END AS sites
       FROM users u
       LEFT JOIN sites s ON s.id = u.site_id
       WHERE u.role = $1
       ORDER BY u.full_name`,
      [role]
    )
    res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// POST /api/users (replaces the create-user Edge Function)
router.post('/', requireRole('super_admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const { role, email, password, full_name, site_id, designation } = req.body as {
      role: 'super_admin' | 'admin' | 'site_user' | 'contractor'
      email: string
      password: string
      full_name: string
      site_id?: string
      designation?: string
    }

    const existing = await pool.query<User>('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ data: null, error: 'A user with this email already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await pool.query<User>(
      `INSERT INTO users (email, password_hash, full_name, role, site_id, designation)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, full_name, role, site_id, designation, is_active, created_at`,
      [email, passwordHash, full_name, role, site_id ?? null, designation ?? null]
    )
    res.json({ data: result.rows[0], error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// POST /api/users/:id/reset-password (replaces the reset-password Edge Function)
router.post('/:id/reset-password', requireRole('super_admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const { new_password } = req.body
    const passwordHash = await bcrypt.hash(new_password, 10)
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2 RETURNING id',
      [passwordHash, req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'User not found' })
    }
    res.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// PATCH /api/users/:id/active (replaces setActive — note: old signature took a
// table name since admins/site_users were separate tables; now there's only one
// users table, so that parameter becomes unnecessary — handled in the frontend service)
router.patch('/:id/active', async (req: AuthedRequest, res: Response) => {
  try {
    const { is_active } = req.body
    const result = await pool.query(
      'UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING id',
      [is_active, req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'User not found' })
    }
    res.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/users/by-ids?ids=id1,id2,id3 (app.tsx contractor-name resolution)
router.get('/by-ids', async (req: AuthedRequest, res: Response) => {
  try {
    const idsParam = req.query.ids as string
    const ids = idsParam ? idsParam.split(',').filter(Boolean) : []
    if (ids.length === 0) {
      return res.json({ data: [], error: null })
    }
    const result = await pool.query(
      'SELECT id, full_name, email, role FROM users WHERE id = ANY($1)',
      [ids]
    )
    res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

export default router