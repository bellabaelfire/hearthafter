import {NextResponse} from 'next/server'
import {assertTrustedOrigin,authenticateReviewer,corsHeaders,reviewerToken} from '@/lib/hearth/sanity/auth'
import {getHearthMode,HearthServiceError} from '@/lib/hearth/sanity/client'
import {errorResponse,preflightResponse} from '@/lib/hearth/sanity/http'
import {commitPlacementCommand,validatePlacementEnvelope} from '@/lib/hearth/sanity/repository'
import {readPlacementJson} from '@/lib/hearth/sanity/request-limits'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request:Request) {
  try {
    assertTrustedOrigin(request)
    if(getHearthMode()!=='sanity') throw new HearthServiceError('OFFLINE_PREVIEW',409,'This is an offline preview. Connect Sanity before recording a live placement.')
    reviewerToken(request)
    const command=await readPlacementJson(request)
    validatePlacementEnvelope(command)
    const session=await authenticateReviewer(request,true)
    const result=await commitPlacementCommand(session.client,command,session.actor)
    return NextResponse.json({mode:'sanity',canEdit:true,...result},{headers:corsHeaders(request)})
  } catch(error) {return errorResponse(error,request)}
}
export const OPTIONS=preflightResponse
