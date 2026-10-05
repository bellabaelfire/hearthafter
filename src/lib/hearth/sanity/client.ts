import 'server-only'
import {createClient} from '@sanity/client'
import {HEARTH_API_VERSION} from './config'
export type HearthMode = 'offline' | 'sanity'
export class HearthServiceError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) { super(message); this.name = 'HearthServiceError' }
}
export function getHearthMode(): HearthMode {
  const mode = process.env.HEARTH_DATA_MODE || 'offline'
  if (mode !== 'offline' && mode !== 'sanity') throw new HearthServiceError('CONFIGURATION_REQUIRED', 503, 'HEARTH_DATA_MODE must be offline or sanity.')
  return mode
}
export function getHearthClient(token?: string) {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim()
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || 'production'
  if (!projectId || !/^[a-z0-9]+$/.test(projectId)) throw new HearthServiceError('CONFIGURATION_REQUIRED', 503, 'Configure a Sanity project before connecting live content.')
  if (!/^[a-z0-9_-]+$/.test(dataset)) throw new HearthServiceError('CONFIGURATION_REQUIRED', 503, 'The configured Sanity dataset name is invalid.')
  return createClient({projectId,dataset,apiVersion:HEARTH_API_VERSION,useCdn:false,perspective:'published',token,maxRetries:0,timeout:15_000})
}
