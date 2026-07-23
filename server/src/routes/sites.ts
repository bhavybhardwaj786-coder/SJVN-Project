import { Router, Request, Response } from 'express'
import { pool } from '../db'
import type { Site, ApiResponse } from '../types'

const router = Router()

// GET /api/sites — active sites, ordered by name (replaces sitesService.getSites)
router.get('/', async (req: Request, res: Response<ApiResponse<Site[]>>) => {
  try {
    const result = await pool.query<Site>(
      'SELECT * FROM sites WHERE is_active = true ORDER BY name'
    )
    res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/sites/code/:code (replaces sitesService.getSiteByCode)
router.get('/code/:code', async (req: Request, res: Response<ApiResponse<Site>>) => {
  try {
    const result = await pool.query<Site>('SELECT * FROM sites WHERE code = $1', [req.params.code])
    res.json({ data: result.rows[0] || null, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/sites/:id/access — unlocked_months only
// (replaces the direct supabase.from("sites").select("unlocked_months") call —
// NOT wired into contractor.index.tsx/site.index.tsx yet, that's the next step)
router.get('/:id/access', async (req: Request, res: Response<ApiResponse<{ unlocked_months: string[] }>>) => {
  try {
    const result = await pool.query<{ unlocked_months: string[] }>(
      'SELECT unlocked_months FROM sites WHERE id = $1',
      [req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Site not found' })
    }
    res.json({ data: result.rows[0], error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// POST /api/sites (replaces sitesService.createSite)
// TEMPORARY: no auth check yet — requireRole('super_admin') added in Step 6.
router.post('/', async (req: Request, res: Response<ApiResponse<Site>>) => {
  try {
    const { name, code, location, description } = req.body
    const result = await pool.query<Site>(
      `INSERT INTO sites (name, code, location, description) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, code, location, description]
    )
    res.json({ data: result.rows[0], error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/sites/all — ALL sites regardless of active status (admin management view)
router.get('/all', async (req: Request, res: Response<ApiResponse<Site[]>>) => {
  try {
    const result = await pool.query<Site>(
      'SELECT id, name, code, unlocked_months FROM sites ORDER BY name'
    )
    res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// PATCH /api/sites/:id — generic update (used here for unlocked_months toggles)
// TEMPORARY: no auth check yet — requireRole('admin','super_admin') added in Step 6.
router.patch('/:id', async (req: Request, res: Response<ApiResponse<Site[]>>) => {
  try {
    const allowedFields = ['name', 'code', 'location', 'description', 'is_active', 'unlocked_months']
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
    const result = await pool.query<Site>(
      `UPDATE sites SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    )

    // Returned as an array (not a single object) to match the old .select()
    // behavior that app.tsx's mutations check .length on.
     res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// DELETE /api/sites/:id (supadmin.tsx remove-site action)
 // DELETE /api/sites/:id (supadmin.tsx remove-site action)
// Cascades: deletes all users assigned to this site, then the site itself
// (submissions cascade automatically via the FK's ON DELETE CASCADE).
  router.delete('/:id', async (req: Request, res: Response<ApiResponse<any>>) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const deletedUsers = await client.query(
        'DELETE FROM users WHERE site_id = $1 RETURNING id',
        [req.params.id]
      )

      const deletedSite = await client.query(
        'DELETE FROM sites WHERE id = $1 RETURNING id',
        [req.params.id]
      )

      if (deletedSite.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ data: null, error: 'Site not found' })
      }

      await client.query('COMMIT')
      res.json({ data: { success: true, usersRemoved: deletedUsers.rows.length }, error: null })
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(err)
      res.status(500).json({ data: null, error: (err as Error).message })
    } finally {
      client.release()
    }
})

export default router