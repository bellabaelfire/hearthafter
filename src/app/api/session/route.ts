import {NextResponse} from 'next/server'
import {authenticateReviewer,corsHeaders} from '@/lib/hearth/sanity/auth'
import {getHearthMode} from '@/lib/hearth/sanity/client'
import {errorResponse,preflightResponse} from '@/lib/hearth/sanity/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const mode=getHearthMode()
    if(mode==='offline') return NextResponse.json({mode,canEdit:false,user:null},{headers:corsHeaders(request)})
    const session=await authenticateReviewer(request)
    return NextResponse.json({mode,canEdit:session.canEdit,user:session.user},{headers:corsHeaders(request)})
  } catch(error) {return errorResponse(error,request)}
}
export const POST=GET
export const OPTIONS=preflightResponse
