import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import {
  API_ROUTES,
  ERROR_CODES,
  errorResponseSchema,
} from '@friendly-system/shared'
import { createServer } from '../../server.js'
import { errorHandler } from '../../shared/middleware/error-handler.js'

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
    const parsed = errorResponseSchema.safeParse(res.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }
    expect(parsed.data.error.message).toBe('Not found')
    expect(parsed.data.error.code).toBe(ERROR_CODES.NOT_FOUND)
  })
})

describe('Error handler fallbacks', () => {
  it('maps malformed JSON to 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .post(API_ROUTES.auth.login)
      .set('Content-Type', 'application/json')
      .send('{"email":')

    expect(res.status).toBe(400)
    const parsed = errorResponseSchema.safeParse(res.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }
    expect(parsed.data.error.code).toBe(ERROR_CODES.BAD_REQUEST)
  })

  it('maps unhandled errors to 500 INTERNAL_ERROR', async () => {
    const boomApp = express()
    boomApp.get('/boom', () => {
      throw new Error('boom')
    })
    boomApp.use(errorHandler)

    const res = await request(boomApp).get('/boom')

    expect(res.status).toBe(500)
    const parsed = errorResponseSchema.safeParse(res.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }
    expect(parsed.data.error.message).toBe('Internal server error')
    expect(parsed.data.error.code).toBe(ERROR_CODES.INTERNAL_ERROR)
  })
})
