import {NextResponse} from 'next/server'
import {createInitialHearthState} from '@/lib/hearth/fixtures'
import {getHearthMode} from '@/lib/hearth/sanity/client'
import {readPublicHearthContent} from '@/lib/hearth/sanity/content'
import {corsHeaders} from '@/lib/hearth/sanity/auth'
import {errorResponse,preflightResponse} from '@/lib/hearth/sanity/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request) {
  try {
    const mode=getHearthMode()
    const state=mode==='offline'?createInitialHearthState():await readPublicHearthContent()
    return NextResponse.json({mode,state,canEdit:false,notice:mode==='offline'?'Offline preview: fictional content; changes stay in this browser.':undefined},{headers:corsHeaders(request)})
  } catch(error) {return errorResponse(error,request)}
}
export const OPTIONS=preflightResponse
