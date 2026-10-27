import { Hono } from 'hono'
import type { ApiList, Rayon } from '../../shared/types'
import type { AppEnv } from '../types'

const rayons = new Hono<AppEnv>()

rayons.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, description, coordinator_name FROM rayons ORDER BY id',
  ).all<Rayon>()
  return c.json<ApiList<Rayon>>({ data: results })
})

export default rayons
