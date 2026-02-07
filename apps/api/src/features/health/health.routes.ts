import { Router } from 'express'
import { API_ROUTES } from '@friendly-system/shared'
import { getHealth } from './health.handler.js'

export const healthRoutes = Router()

healthRoutes.get(API_ROUTES.health, getHealth)
