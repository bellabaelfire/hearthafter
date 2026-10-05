import HearthStudio from '@/sanity/HearthStudio'
import {OfflineHearthDesk} from '@/sanity/HearthDesk'
import {getHearthMode} from '@/lib/hearth/sanity/client'
import {privatePageMetadata} from '../../seo'
export const metadata=privatePageMetadata('Placement & review desk','The staff placement and review desk for the fictional Hearthafter registry.')
export const dynamic='force-dynamic'
export default function DeskPage(){
  if(getHearthMode()==='offline') return <OfflineHearthDesk/>
  if(!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return <main style={{padding:48}}><h1>Connect the live review desk</h1><p>Set the Sanity project ID and dataset, then reload. This page will use your Sanity sign-in.</p><a href="/">Back to Hearthafter</a></main>
  return <HearthStudio/>
}
