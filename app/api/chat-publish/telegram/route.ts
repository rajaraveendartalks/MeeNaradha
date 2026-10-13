import {NextRequest,NextResponse} from "next/server";
import {normalizeTelegram} from "../../../../lib/chat-publish/types";
import {ingestMessages} from "../../../../lib/chat-publish/ingest";

const menu={inline_keyboard:[
 [{text:"📰 Create News",callback_data:"news"},{text:"🎬 Movie Review",callback_data:"review"}],
 [{text:"🖼 Photo Gallery",callback_data:"gallery"},{text:"🔗 Analyze Links",callback_data:"links"}],
 [{text:"📝 My Drafts",callback_data:"drafts"},{text:"⏳ Approval Status",callback_data:"status"}]
]};
async function sendTelegram(method:string,payload:Record<string,unknown>){
 const token=process.env.TELEGRAM_BOT_TOKEN;
 if(!token)throw new Error("Telegram bot token missing");
 const res=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 if(!res.ok)throw new Error(`Telegram API returned ${res.status}`);
}
export async function POST(req:NextRequest){
 const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
 if(!secret)return NextResponse.json({error:"Not configured"},{status:503});
 if(req.headers.get("x-telegram-bot-api-secret-token")!==secret)return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const body=await req.json();
  const m=body.message;
  if(m?.chat?.id&&/^\\/start(?:\\s|$)/.test(String(m.text||""))){
   await sendTelegram("sendMessage",{chat_id:m.chat.id,text:"నమస్కారం! MeeNarada AI Publishing Studio కి స్వాగతం.\\n\\nChoose what you would like to prepare. All content requires editorial approval before publishing.",reply_markup:menu});
   return NextResponse.json({ok:true});
  }
  const cb=body.callback_query;
  if(cb?.id){
   await sendTelegram("answerCallbackQuery",{callback_query_id:cb.id});
   if(cb.message?.chat?.id){
    const prompts:Record<string,string>={news:"📰 Send your news text and source links. Editorial ingestion is being activated.",review:"🎬 Send a movie name and 5–10 review links. AI analysis is coming soon.",gallery:"🖼 Send gallery photos and captions. Album processing is coming soon.",links:"🔗 Send 5–10 reference links. Source comparison is coming soon.",drafts:"📝 Draft listing will be available after CMS integration.",status:"⏳ Approval tracking will be available after CMS integration."};
    await sendTelegram("sendMessage",{chat_id:cb.message.chat.id,text:prompts[String(cb.data)]||"Please choose a menu option."});
   }
   return NextResponse.json({ok:true});
  }
  const msg=normalizeTelegram(body);
  if(msg)await ingestMessages([msg]);
  return NextResponse.json({ok:true});
 }catch(e){console.error("Telegram ingestion failed",e);return NextResponse.json({error:"Ingestion failed"},{status:500})}
}
