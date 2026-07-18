import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { requireAuth, AuthedRequest } from '../middleware/auth'

const router = Router()
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'attachments')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

function isSafePath(relativePath: string): boolean {
  const resolved = path.resolve(UPLOAD_ROOT, relativePath)
  return resolved.startsWith(UPLOAD_ROOT)
}

// POST /api/storage/upload — multipart, fields: path (relative storage path), file
router.post('/upload', requireAuth, upload.single('file'), (req: AuthedRequest, res: Response) => {
  try {
    const relativePath = req.body.path as string
    if (!relativePath || !isSafePath(relativePath)) {
      return res.status(400).json({ data: null, error: 'Invalid storage path' })
    }
    if (!req.file) {
      return res.status(400).json({ data: null, error: 'No file provided' })
    }

    const destPath = path.join(UPLOAD_ROOT, relativePath)
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.writeFileSync(destPath, req.file.buffer)

    const apiBase = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}/api`
    res.json({ data: { url: `${apiBase}/storage/attachments/${relativePath}`, storagePath: relativePath }, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ data: null, error: (err as Error).message })
  }
})

router.get(/^\/attachments\/(.+)$/, requireAuth, (req: AuthedRequest, res: Response) => {
  const relativePath = req.params[0]

  if (!isSafePath(relativePath)) {
    return res.status(400).json({ data: null, error: 'Invalid path' })
  }

  const filePath = path.join(UPLOAD_ROOT, relativePath)

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ data: null, error: 'File not found' })
  }

  res.sendFile(filePath)
})

export default router