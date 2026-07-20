import { Router, Request, Response } from 'express'
import { pool } from '../db'
import type { Submission, ApiResponse } from '../types'

const router = Router()

// GET /api/submissions?siteId=... — joins sites + forms (replaces getMySubmissions)
router.get('/', async (req: Request, res: Response<ApiResponse<any[]>>) => {
  try {
    const siteId = req.query.siteId as string | undefined
    const params: unknown[] = []
    let query = `
      SELECT s.*,
        json_build_object('name', sites.name, 'code', sites.code) AS sites,
        json_build_object('title', forms.title) AS forms
      FROM submissions s
      JOIN sites ON sites.id = s.site_id
      JOIN forms ON forms.id = s.form_id
    `
    if (siteId) {
      params.push(siteId)
      query += ` WHERE s.site_id = $${params.length}`
    }
    query += ' ORDER BY s.reporting_month DESC'

    const result = await pool.query(query, params)
    res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/submissions/by-month?reportingMonth=...&siteId=...&userId=...
router.get('/by-month', async (req: Request, res: Response<ApiResponse<Submission[]>>) => {
  try {
    const reportingMonth = req.query.reportingMonth as string
    const siteId = req.query.siteId as string | undefined
    const userId = req.query.userId as string | undefined
    const params: unknown[] = [reportingMonth]
    let query = 'SELECT * FROM submissions WHERE reporting_month = $1'
    if (siteId) {
      params.push(siteId)
      query += ` AND site_id = $${params.length}`
    }
    if (userId) {
      params.push(userId)
      query += ` AND user_id = $${params.length}`
    }
    const result = await pool.query<Submission>(query, params)
    res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/submissions/lookup?formId=&siteId=&reportingMonth=&submittedByRole=
router.get('/lookup', async (req: Request, res: Response<ApiResponse<Submission>>) => {
  try {
    const { formId, siteId, reportingMonth, submittedByRole, userId } = req.query as Record<string, string>
    const conditions = ['form_id = $1', 'site_id = $2', 'reporting_month = $3']
    const params: unknown[] = [formId, siteId, reportingMonth]

    if (submittedByRole) {
      params.push(submittedByRole)
      conditions.push(`submitted_by_role = $${params.length}`)
    }
    if (userId) {
      params.push(userId)
      conditions.push(`user_id = $${params.length}`)
    }

    const result = await pool.query<Submission>(
      `SELECT * FROM submissions WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params
    )
    res.json({ data: result.rows[0] || null, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// POST /api/submissions — upsert (replaces createSubmission)
router.post('/', async (req: Request, res: Response<ApiResponse<Submission>>) => {
  try {
    const { form_id, site_id, user_id, reporting_month, data, status, submitted_by_role, submitted_at } = req.body
    const result = await pool.query<Submission>(
      `INSERT INTO submissions (form_id, site_id, user_id, reporting_month, data, status, submitted_by_role, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (form_id, site_id, reporting_month, user_id)
       DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status,
                      submitted_by_role = EXCLUDED.submitted_by_role,
                      submitted_at = EXCLUDED.submitted_at, updated_at = now()
       RETURNING *`,
      [form_id, site_id, user_id, reporting_month, data, status ?? 'draft', submitted_by_role, submitted_at ?? null]
    )
    res.json({ data: result.rows[0], error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// PUT /api/submissions/:id — partial update (replaces updateSubmission / submitForApproval)
router.put('/:id', async (req: Request, res: Response<ApiResponse<Submission>>) => {
  try {
    const allowedFields = ['data', 'status', 'submitted_at', 'approved_by', 'approved_at', 'edit_unlocked', 'edit_unlocked_by', 'edit_unlocked_at']
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
    const result = await pool.query<Submission>(
      `UPDATE submissions SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Submission not found' })
    }
    res.json({ data: result.rows[0], error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// POST /api/submissions/save-or-submit — replaces saveOrSubmit
router.post('/save-or-submit', async (req: Request, res: Response<ApiResponse<Submission>>) => {
  try {
    const { formId, siteId, userId, reportingMonth, data, submit, submittedByRole } = req.body
    const status = submit ? 'submitted' : 'draft'
    const submittedAt = submit ? new Date().toISOString() : null
    const role = submittedByRole || 'site'

    const result = await pool.query<Submission>(
      `INSERT INTO submissions (form_id, site_id, user_id, reporting_month, data, status, submitted_by_role, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (form_id, site_id, reporting_month, user_id)
       DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status,
                      submitted_by_role = EXCLUDED.submitted_by_role,
                      submitted_at = EXCLUDED.submitted_at,
                      edit_unlocked = CASE WHEN EXCLUDED.status = 'submitted' THEN false ELSE submissions.edit_unlocked END,
                      edit_unlocked_by = CASE WHEN EXCLUDED.status = 'submitted' THEN NULL ELSE submissions.edit_unlocked_by END,
                      edit_unlocked_at = CASE WHEN EXCLUDED.status = 'submitted' THEN NULL ELSE submissions.edit_unlocked_at END,
                      updated_at = now()
       RETURNING *`,
      [formId, siteId, userId, reportingMonth, data, status, role, submittedAt]
    )
    res.json({ data: result.rows[0], error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/submissions/admin?reportingMonth=...&status=... (app.tsx admin view)
router.get('/admin', async (req: Request, res: Response<ApiResponse<any[]>>) => {
  try {
    const reportingMonth = req.query.reportingMonth as string
    const status = req.query.status as string | undefined
    const params: unknown[] = [reportingMonth]
    let query = `
      SELECT s.id, s.status, s.submitted_at, s.updated_at, s.form_id, s.site_id, s.user_id, s.data, s.submitted_by_role,
        s.edit_unlocked, s.edit_unlocked_by, s.edit_unlocked_at,
        json_build_object('id', f.id, 'title', f.title, 'schema', f.schema) AS forms,
        json_build_object('id', st.id, 'name', st.name, 'code', st.code) AS sites
      FROM submissions s
      JOIN forms f ON f.id = s.form_id
      JOIN sites st ON st.id = s.site_id
      WHERE s.reporting_month = $1
    `
    if (status) {
      params.push(status)
      query += ` AND s.status = $${params.length}`
    }
    query += ' ORDER BY s.updated_at DESC'

    const result = await pool.query(query, params)
    res.json({ data: result.rows, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

// GET /api/submissions/:id — single submission with joined forms+sites
// (replaces both the route loader and component query in _submissionId.tsx)
router.get('/:id', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.status, s.data, s.submitted_at, s.updated_at, s.reporting_month,
              s.user_id, s.form_id, s.site_id, s.submitted_by_role,
              u.full_name AS submitted_by_name,
              json_build_object('id', f.id, 'title', f.title, 'description', f.description, 'schema', f.schema) AS forms,
              json_build_object('id', st.id, 'name', st.name, 'code', st.code) AS sites
       FROM submissions s
       JOIN forms f ON f.id = s.form_id
       JOIN sites st ON st.id = s.site_id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Submission not found' })
    }
    res.json({ data: result.rows[0], error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

export default router