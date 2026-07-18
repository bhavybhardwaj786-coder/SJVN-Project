import { Router, Request, Response } from 'express'
import { pool } from '../db'
import type { Form, ApiResponse } from '../types'

const router = Router()

// GET /api/forms — ALL forms, active or not (admin management view — app.tsx)
router.get('/', async (req: Request, res: Response<ApiResponse<Form[]>>) => {
  try {
    const result = await pool.query<Form>('SELECT * FROM forms ORDER BY created_at DESC')
    res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/forms/active?role=site_user|contractor&siteId=...
// (replaces the .or('site_ids.is.null,site_ids.cs.{siteId}') Supabase query builder call)
router.get('/active', async (req: Request, res: Response<ApiResponse<Form[]>>) => {
  try {
    const role = req.query.role as string
    const siteId = req.query.siteId as string | undefined

    if (role !== 'site_user' && role !== 'contractor') {
      return res.status(400).json({ data: null, error: 'role must be site_user or contractor' })
    }

    const visibilityColumn = role === 'site_user' ? 'visible_to_site_users' : 'visible_to_contractors'
    const params: unknown[] = []
    let query = `SELECT * FROM forms WHERE is_active = true AND ${visibilityColumn} = true`

    if (siteId) {
      params.push(siteId)
      query += ` AND (site_ids IS NULL OR $${params.length} = ANY(site_ids))`
    }

    query += ' ORDER BY title'

    const result = await pool.query<Form>(query, params)
    res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/forms/:id (used by new.tsx edit mode, contractor/site form-fill pages)
router.get('/:id', async (req: Request, res: Response<ApiResponse<Form>>) => {
  try {
    const result = await pool.query<Form>('SELECT * FROM forms WHERE id = $1', [req.params.id])
    res.json({ data: result.rows[0] || null, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// POST /api/forms (new.tsx create mode)
// TEMPORARY: no auth check yet — requireRole('super_admin') added in Step 6.
router.post('/', async (req: Request, res: Response<ApiResponse<Form>>) => {
  try {
    const {
      title, description, schema, frequency, site_ids,
      visible_to_site_users, visible_to_contractors, is_active,
    } = req.body

    const result = await pool.query<Form>(
      `INSERT INTO forms (title, description, schema, frequency, site_ids, visible_to_site_users, visible_to_contractors, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description ?? null, schema, frequency, site_ids ?? null, visible_to_site_users, visible_to_contractors, is_active ?? true]
    )
    res.json({ data: result.rows[0], error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// PATCH /api/forms/:id (new.tsx edit mode, and deactivateForm)
router.patch('/:id', async (req: Request, res: Response<ApiResponse<Form>>) => {
  try {
    const allowedFields = [
      'title', 'description', 'schema', 'frequency', 'site_ids',
      'visible_to_site_users', 'visible_to_contractors', 'is_active',
    ]
    const updates = req.body as Record<string, unknown>
    const setClauses: string[] = []
    const values: unknown[] = []

    for (const field of allowedFields) {
      if (field in updates) {
        values.push(updates[field])
        setClauses.push(`${field} = $${values.length}`)
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ data: null, error: 'No valid fields to update' })
    }

    values.push(req.params.id)
    const result = await pool.query<Form>(
      `UPDATE forms SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Form not found' })
    }
    res.json({ data: result.rows[0], error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// DELETE /api/forms/:id (app.tsx delete button)
router.delete('/:id', async (req: Request, res: Response<{ success: boolean; error: string | null }>) => {
  try {
    await pool.query('DELETE FROM forms WHERE id = $1', [req.params.id])
    res.json({ success: true, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router