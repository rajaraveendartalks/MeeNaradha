import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";

const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const token = process.env.TELEGRAM_BOT_TOKEN;
const port = Number(process.env.PORT || 3000);
const menu = { inline_keyboard: [
  [{text:"📰 Create News",callback_data:"news"},{text:"🎬 Movie Review",callback_data:"review"}],
  [{text:"🖼 Photo Gallery",callback_data:"gallery"},{text:"🔗 Analyze Links",callback_data:"links"}],
  [{text:"📝 My Drafts",callback_data:"drafts"},{text:"⏳ Approval Status",callback_data:"status"}]
]};
const prompts = {
  news:"📰 Send your news text and source links. Editorial ingestion is being activated.",
  review:"🎬 Send a movie name and 5–10 review links. AI analysis is coming soon.",
  gallery:"🖼 Send gallery photos and captions. Album processing is coming soon.",
  links:"🔗 Send 5–10 reference links. Source comparison is coming soon.",
  drafts:"📝 Draft listing will be available after CMS integration.",
  status:"⏳ Approval tracking will be available after CMS integration."
};
function matches(a,b) {
  if (!a || !b) return false;
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}
async function telegram(method, body) {
  const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)
  });
  if(!r.ok) throw new Error(`Telegram API ${r.status}`);
}
function reply(res,code,body) {
  res.writeHead(code,{"content-type":"application/json","cache-control":"no-store"});
  res.end(JSON.stringify(body));
}
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,"http://localhost").pathname;
  if(path==="/health" && req.method==="GET") return reply(res,200,{ok:true,service:"meenaradha-telegram-webhook"});
  if(path!=="/api/telegram" || req.method!=="POST") return reply(res,404,{error:"Not found"});
  if(!secret || !token) return reply(res,503,{error:"Not configured"});
  if(!matches(req.headers["x-telegram-bot-api-secret-token"],secret)) return reply(res,401,{error:"Unauthorized"});
  try {
    let raw="";
    for await (const chunk of req) {
      raw+=chunk.toString();
      if(raw.length>1048576) return reply(res,413,{error:"Payload too large"});
    }
    const body=JSON.parse(raw);
    if(body.message?.chat?.id && String(body.message.text||"").trim().split(" ")[0].split("@")[0]==="/start"){
      await telegram("sendMessage",{chat_id:body.message.chat.id,text:"నమస్కారం! MeeNaradha AI Publishing Studio కి స్వాగతం.\n\nChoose what you would like to prepare. All content requires editorial approval before publishing.",reply_markup:menu});
    } else if(body.callback_query?.id){
      await telegram("answerCallbackQuery",{callback_query_id:body.callback_query.id});
      if(body.callback_query.message?.chat?.id) await telegram("sendMessage",{chat_id:body.callback_query.message.chat.id,text:prompts[String(body.callback_query.data)]||"Please choose a menu option."});
    }
    return reply(res,200,{ok:true});
  } catch(e) {
    console.error("Webhook processing failed",e instanceof Error?e.message:"unknown");
    return reply(res,500,{error:"Processing failed"});
  }
});
server.listen(port,()=>console.log(`Telegram webhook listening on ${port}`));
