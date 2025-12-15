import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { supabase } from '../lib/supabase.js'

const projectsRouter = new Hono()

// Schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sourceVersion: z.string(),
  targetVersion: z.string(),
  settings: z.record(z.unknown()).optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  sourceVersion: z.string().optional(),
  targetVersion: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
})

// GET /api/projects - List all projects
projectsRouter.get('/', async (c) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error

    return c.json({
      success: true,
      data: data || [],
    })
  } catch (err) {
    console.error('Failed to list projects:', err)
    return c.json(
      { success: false, error: 'Failed to list projects' },
      500
    )
  }
})

// GET /api/projects/:id - Get a single project
projectsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ success: false, error: 'Project not found' }, 404)
      }
      throw error
    }

    return c.json({
      success: true,
      data,
    })
  } catch (err) {
    console.error('Failed to get project:', err)
    return c.json(
      { success: false, error: 'Failed to get project' },
      500
    )
  }
})

// POST /api/projects - Create a new project
projectsRouter.post(
  '/',
  zValidator('json', createProjectSchema),
  async (c) => {
    const body = c.req.valid('json')

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: body.name,
          description: body.description || null,
          source_version: body.sourceVersion,
          target_version: body.targetVersion,
          settings: body.settings || {},
        })
        .select()
        .single()

      if (error) throw error

      return c.json(
        {
          success: true,
          data: {
            id: data.id,
            name: data.name,
            description: data.description,
            sourceVersion: data.source_version,
            targetVersion: data.target_version,
            settings: data.settings,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
        },
        201
      )
    } catch (err) {
      console.error('Failed to create project:', err)
      return c.json(
        { success: false, error: 'Failed to create project' },
        500
      )
    }
  }
)

// PUT /api/projects/:id - Update a project
projectsRouter.put(
  '/:id',
  zValidator('json', updateProjectSchema),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (body.name !== undefined) updateData.name = body.name
      if (body.description !== undefined) updateData.description = body.description
      if (body.sourceVersion !== undefined) updateData.source_version = body.sourceVersion
      if (body.targetVersion !== undefined) updateData.target_version = body.targetVersion
      if (body.settings !== undefined) updateData.settings = body.settings

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return c.json({ success: false, error: 'Project not found' }, 404)
        }
        throw error
      }

      return c.json({
        success: true,
        data: {
          id: data.id,
          name: data.name,
          description: data.description,
          sourceVersion: data.source_version,
          targetVersion: data.target_version,
          settings: data.settings,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      })
    } catch (err) {
      console.error('Failed to update project:', err)
      return c.json(
        { success: false, error: 'Failed to update project' },
        500
      )
    }
  }
)

// DELETE /api/projects/:id - Delete a project
projectsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error

    return c.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (err) {
    console.error('Failed to delete project:', err)
    return c.json(
      { success: false, error: 'Failed to delete project' },
      500
    )
  }
})

// GET /api/projects/:id/documents - Get documents for a project
projectsRouter.get('/:id/documents', async (c) => {
  const id = c.req.param('id')

  try {
    const { data, error } = await supabase
      .from('generated_docs')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return c.json({
      success: true,
      data: data || [],
    })
  } catch (err) {
    console.error('Failed to list project documents:', err)
    return c.json(
      { success: false, error: 'Failed to list project documents' },
      500
    )
  }
})

export { projectsRouter }
