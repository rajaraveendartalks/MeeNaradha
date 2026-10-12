import {NextRequest,NextResponse} from "next/server";
import {normalizeTelegram} from "../../../../lib/chat-publish/types";
import {ingestMessages} from "../../../../lib/chat-publish/ingest";
export async function POST(req:NextRequest){const secret=process.env.TELEGRAM_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:"Not configured"},{status:503});if(req.headers.get("x-telegram-bot-api-secret-token")!==secret)return NextResponse.json({error:"Unauthorized"},{status:401});try{const msg=normalizeTelegram(await req.json());if(msg)await ingestMessages([msg]);return NextResponse.json({ok:true})}catch(e){console.error("Telegram ingestion failed",e);return NextResponse.json({error:"Ingestion failed"},{status:500})}}
