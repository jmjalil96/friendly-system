import type { AppConfig } from '@friendly-system/shared'
import { API_ROUTES } from '@friendly-system/shared'

const config: AppConfig = { name: 'web' }
console.log(config.name, API_ROUTES.health)
