import {NextResponse} from 'next/server'
import {HearthServiceError} from './client'
import {corsHeaders} from './auth'
export function errorResponse(error: unknown, request: Request) {
  const known = error instanceof HearthServiceError || (error instanceof Error && 'status' in error && 'code' in error)
  if (known) {
    const e = error as Error & {status:number;code:string}
    return NextResponse.json({error:e.message,code:e.code},{status:e.status,headers:corsHeaders(request)})
  }
  if (error instanceof SyntaxError) return NextResponse.json({error:'Send a valid JSON request.',code:'INVALID_JSON'},{status:400,headers:corsHeaders(request)})
  const status = error && typeof error === 'object' && 'statusCode' in error ? (error as {statusCode:unknown}).statusCode : null
  if (status === 409) return NextResponse.json({error:'This review changed. Reload and review the current evidence before trying again.',code:'STALE_REVISION'},{status:409,headers:corsHeaders(request)})
  if (status === 401 || status === 403) return NextResponse.json({error:'Sanity did not authorize this operation.',code:'SANITY_ACCESS_DENIED'},{status:403,headers:corsHeaders(request)})
  return NextResponse.json({error:'Live Sanity content is unavailable. Please retry; your preview data has not replaced it.',code:'SANITY_UNAVAILABLE'},{status:502,headers:corsHeaders(request)})
}
export function preflightResponse(request: Request) {
  return new NextResponse(null,{status:204,headers:{...corsHeaders(request),'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}})
}
