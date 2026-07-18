import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import sitesRouter from './routes/sites'
import formsRouter from './routes/forms'
import submissionsRouter from './routes/submissions'
import authRouter from './routes/auth'
import usersRouter from './routes/users'
import storageRouter from './routes/storage'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/sites', sitesRouter)
app.use('/api/forms', formsRouter)
app.use('/api/submissions', submissionsRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/storage', storageRouter)

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});