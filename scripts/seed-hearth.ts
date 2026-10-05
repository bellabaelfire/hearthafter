/** Public upload only after approval of the current source manifest and the three supplied original PNGs. */
import {createClient} from '@sanity/client'
import {getCliClient} from 'sanity/cli'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {createInitialHearthState} from '../src/lib/hearth/fixtures'
import {encodeState} from '../src/lib/hearth/sanity/documents'
import {HEARTH_API_VERSION,HEARTH_ARTWORK_ID,HEARTH_PUBLIC_CONTENT_QUERY,hearthDocumentId} from '../src/lib/hearth/sanity/config'

const ARTWORK=[
  {field:'hero',filename:'hearthafter-hero.png',approvedSha256:'f9ec27618f50b148ef2c5632110f54a7a1ba389653ac86295263b51ec9fc22bf'},
  {field:'overlap',filename:'overlap-establishing.png',approvedSha256:'be899fd5f2c0c47c9a97cb8610f6ed0ba24803d73f2f22d17e1fc5762e9c6fa9'},
  {field:'portraitAtlas',filename:'spirit-portraits-atlas.png',approvedSha256:'f722b6b10096ab9006e57d67eb1ae5aa6b181ba217eef5a9f73e8e6c59fb52df'},
] as const
async function main() {
  const documents=encodeState(createInitialHearthState())
  const assets=ARTWORK.map(entry=>{
    const bytes=readFileSync(resolve('public/art',entry.filename))
    if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw new Error(`${entry.filename} is not the approved PNG format.`)
    const sha256=createHash('sha256').update(bytes).digest('hex')
    if(sha256!==entry.approvedSha256) throw new Error(`Approved original artwork changed: ${entry.filename}`)
    return {...entry,bytes,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256}
  })
  if(!process.argv.includes('--write')) {
    console.log(JSON.stringify({sourceDocuments:documents.length,artworkDocuments:1,assets:assets.map(({field,filename,bytes,width,height,sha256})=>({field,filename,bytes:bytes.length,width,height,sha256})),remoteWrites:false},null,2))
    return
  }
  const manifest=readFileSync(resolve('docs/seed-manifest.json'),'utf8')
  if(manifest!==JSON.stringify(documents,null,2)+'\n') throw new Error('The current source documents differ from docs/seed-manifest.json. Regenerate and review the manifest before uploading.')
  const projectId=process.env.NEXT_PUBLIC_SANITY_PROJECT_ID||process.env.SANITY_STUDIO_PROJECT_ID
  const dataset=process.env.NEXT_PUBLIC_SANITY_DATASET||process.env.SANITY_STUDIO_DATASET||'production'
  if(projectId!=='o3jy1zm6'||dataset!=='production') throw new Error('This approved upload targets only Hearthafter project o3jy1zm6, dataset production.')
  const token=process.env.SANITY_AUTH_TOKEN
  const client=token
    ? createClient({projectId,dataset,token,apiVersion:HEARTH_API_VERSION,useCdn:false})
    : getCliClient({apiVersion:HEARTH_API_VERSION}).withConfig({projectId,dataset,useCdn:false})
  if(!client.config().token) throw new Error('Use sanity exec scripts/seed-hearth.ts --with-user-token -- --write with the authorized CLI session. This script never creates or prints tokens.')
  const artwork:Record<string,unknown>={_id:hearthDocumentId('hearthArtwork',HEARTH_ARTWORK_ID),_type:'hearthArtwork',id:HEARTH_ARTWORK_ID,title:'Hearthafter visual world'}
  for(const asset of assets) {
    const uploaded=await client.assets.upload('image',asset.bytes,{filename:asset.filename})
    artwork[asset.field]={_type:'image',asset:{_type:'reference',_ref:uploaded._id}}
    console.log(`Uploaded approved ${asset.field} artwork.`)
  }
  let transaction=client.transaction()
  for(const document of documents) transaction=transaction.createIfNotExists(document)
  transaction=transaction.createIfNotExists(artwork as {_id:string;_type:string})
  await transaction.commit({visibility:'sync',autoGenerateArrayKeys:true})
  const publicClient=createClient({projectId,dataset,apiVersion:HEARTH_API_VERSION,useCdn:false,perspective:'published'})
  const result=await publicClient.fetch<Record<string,unknown>>(HEARTH_PUBLIC_CONTENT_QUERY)
  const art=result.artwork as Record<string,unknown>|null
  if(!art||['heroUrl','overlapUrl','portraitAtlasUrl'].some(key=>typeof art[key]!=='string')) throw new Error('Upload committed, but anonymous artwork verification needs attention.')
  console.log(JSON.stringify({verifiedPublicProject:projectId,dataset,spirits:(result.spirits as unknown[]).length,homes:(result.homes as unknown[]).length,artwork:art,privatePlacements:(result.placements as unknown[]).length,privateEvents:(result.events as unknown[]).length,existingDocumentsPreserved:true},null,2))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Approved seed failed.');process.exitCode=1})