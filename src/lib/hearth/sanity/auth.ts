import 'server-only'
import {getHearthClient, HearthServiceError} from './client'

/** The existing Studio session is used per request; no server-side robot token or copied cookie is persisted. */
export function reviewerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const match = /^Bearer ([A-Za-z0-9._~-]{20,4096})$/.exec(authorization)
  if (!match) throw new HearthServiceError('SIGN_IN_REQUIRED', 401, 'Sign in to Sanity to open the live review desk.')
  return match[1]
}
export async function authenticateReviewer(request: Request, requireWrite = false) {
  const client = getHearthClient(reviewerToken(request))
  let user
  try { user = await client.users.getById('me') }
  catch { throw new HearthServiceError('SIGN_IN_REQUIRED', 401, 'Your Sanity session could not be verified. Sign in again.') }
  if (!user?.id || !user.role) throw new HearthServiceError('SIGN_IN_REQUIRED', 401, 'A project member session is required.')
  const canEdit = user.role === 'administrator'
  if (requireWrite && !canEdit) throw new HearthServiceError('READ_ONLY', 403, 'Only a Sanity project administrator can record placement decisions.')
  return {client,user:{id:user.id,name:user.name,role:user.role},canEdit,actor:`Sanity reviewer ${user.id}`}
}
export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin')
  const headers: Record<string,string> = {'Cache-Control':'no-store','Vary':'Origin'}
  if (origin && origin === process.env.HEARTH_STUDIO_ORIGIN?.trim()) headers['Access-Control-Allow-Origin'] = origin
  return headers
}
export function assertTrustedOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const allowed = [new URL(request.url).origin, process.env.HEARTH_STUDIO_ORIGIN?.trim()].filter(Boolean)
  if (!origin || !allowed.includes(origin)) throw new HearthServiceError('UNTRUSTED_ORIGIN',403,'Open this action from the Hearthafter review desk.')
}
