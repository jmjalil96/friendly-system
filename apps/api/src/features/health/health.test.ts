import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createServer } from '../../server.js'

const app = createServer()

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('GET /nonexistent', () => {
  it('returns 404', async () => {
    const res = await request(app).get('/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('Not found')
  })
})
