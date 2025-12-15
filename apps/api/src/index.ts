import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import 'dotenv/config'

import { ingestRouter } from './routes/ingest.js'
import { diffRouter } from './routes/diff.js'
import { generateRouter } from './routes/generate.js'
import { projectsRouter } from './routes/projects.js'
import { exportRouter } from './routes/export.js'
import { uploadRouter } from './routes/upload.js'
import { chatRouter } from './routes/chat.js'
import { mindmapRouter } from './routes/mindmap.js'
import { compileRouter } from './routes/compile.js'
import { testRouter } from './routes/test.js'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors())

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Shuguridan API',
    version: '0.1.0',
    status: 'ok',
  })
})

// API routes
app.get('/api/versions', (c) => {
  return c.json({
    versions: ['cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23'],
  })
})

// Mount routers
app.route('/api/ingest', ingestRouter)
app.route('/api/diff', diffRouter)
app.route('/api/generate', generateRouter)
app.route('/api/projects', projectsRouter)
app.route('/api/export', exportRouter)
app.route('/api/upload', uploadRouter)
app.route('/api/chat', chatRouter)
app.route('/api/mindmap', mindmapRouter)
app.route('/api/compile', compileRouter)
app.route('/api/test', testRouter)

const port = parseInt(process.env.PORT || '3001')
const hostname = '0.0.0.0'

serve({
  fetch: app.fetch,
  port,
  hostname,
}, (info) => {
  console.log(`Server running on http://${hostname}:${info.port}`)
})
