import 'dotenv/config'
import { pool } from '../src/db'
import fs from 'fs'
import path from 'path'

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'attachments')

interface FileRef {
  url: string
  name: string
  storagePath?: string
}

function deriveStoragePath(fileRef: FileRef): string {
  if (fileRef.storagePath) return fileRef.storagePath
  const marker = '/storage/v1/object/public/attachments/'
  const idx = fileRef.url.indexOf(marker)
  if (idx !== -1) return decodeURIComponent(fileRef.url.slice(idx + marker.length))
  const parts = fileRef.url.split('/attachments/')
  return decodeURIComponent(parts[parts.length - 1])
}

async function main() {
  const result = await pool.query<{ id: string; data: Record<string, any> }>(
    'SELECT id, data FROM submissions'
  )

  let total = 0
  let succeeded = 0
  let failed = 0

  for (const row of result.rows) {
    for (const key of Object.keys(row.data || {})) {
      if (!key.endsWith('_files')) continue
      const files = row.data[key]
      if (!Array.isArray(files)) continue

      for (const fileRef of files as FileRef[]) {
        if (!fileRef?.url) continue
        total++
        const relativePath = deriveStoragePath(fileRef)
        const destPath = path.join(UPLOAD_ROOT, relativePath)

        if (fs.existsSync(destPath)) {
          console.log(`SKIP (already exists): ${relativePath}`)
          succeeded++
          continue
        }

        try {
          const res = await fetch(fileRef.url)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const buffer = Buffer.from(await res.arrayBuffer())
          fs.mkdirSync(path.dirname(destPath), { recursive: true })
          fs.writeFileSync(destPath, buffer)
          console.log(`OK: ${relativePath}`)
          succeeded++
        } catch (err) {
          console.error(`FAILED: submission ${row.id}, field ${key}, url ${fileRef.url} -> ${(err as Error).message}`)
          failed++
        }
      }
    }
  }

  console.log(`\nDone. Total files found: ${total}, succeeded: ${succeeded}, failed: ${failed}`)
  await pool.end()
}

main().catch((err) => {
  console.error('Script crashed:', err)
  process.exit(1)
})