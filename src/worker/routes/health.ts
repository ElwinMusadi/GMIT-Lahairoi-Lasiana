import { Hono } from 'hono'
import type { HealthStatus } from '../../shared/types'
import type { AppEnv } from '../types'

const health = new Hono<AppEnv>()

health.get('/', async (c) => {
  let database: HealthStatus['database'] = 'ok'
  try {
    await c.env.DB.prepare('SELECT 1').first()
  } catch (err) {
    console.error('D1 health check failed', err)
    database = 'error'
  }

  const body: HealthStatus = {
    status: database === 'ok' ? 'ok' : 'degraded',
    database,
    timestamp: new Date().toISOString(),
  }
  return c.json(body, database === 'ok' ? 200 : 503)
})

export default health
