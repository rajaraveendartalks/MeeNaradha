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
  news:"📰 Please reply to the next message with your news text and source links.",
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
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedEditors = new Set((process.env.TELEGRAM_ALLOWED_USER_IDS || "").split(",").map(x=>x.trim()).filter(Boolean));
function editorAllowed(id) { return id != null && allowedEditors.has(String(id)); }
async function saveIntake(updateId,message,text) {
  if (!supabaseUrl || !supabaseKey) throw new Error("Draft storage not configured");
  const urls = [...new Set(text.match(/https?:\/\/[^\s<>]+/g) || [])];
  const response = await fetch(supabaseUrl.replace(/\/$/,"")+"/rest/v1/telegram_news_intake?on_conflict=telegram_update_id",{
    method:"POST",
    headers:{"apikey":supabaseKey,"authorization":"Bearer "+supabaseKey,"content-type":"application/json","prefer":"resolution=ignore-duplicates,return=representation"},
    body:JSON.stringify({telegram_update_id:updateId,telegram_user_id:message.from.id,telegram_chat_id:message.chat.id,source_message_id:message.message_id,raw_text:text,source_urls:urls})
  });
  if(!response.ok) throw new Error("Draft storage HTTP "+response.status);
  const rows=await response.json();
  return {created:rows.length>0,id:rows[0]?.id||null};
}
const newsMarker = "📰 Mee Narada News Intake";
const maxNewsLength = 10000;
function isNewsReply(message) {
  return typeof message?.reply_to_message?.text === "string" &&
    message.reply_to_message.text.startsWith(newsMarker) &&
    message.reply_to_message.from?.is_bot === true;
}
function previewNews(text) {
  const normalized = text.trim();
  const urls = [...new Set(normalized.match(/https?:\/\/[^\s<>]+/g) || [])];
  const excerpt = normalized.length > 2600 ? normalized.slice(0,2600) + "…" : normalized;
  return `📰 Mee Narada — News Draft Preview\n\n${excerpt}\n\nSource links detected: ${urls.length}\n\n⚠️ PREVIEW ONLY — Not saved to CMS or published. Editorial verification and approval are required.`;
}
function reply(res,code,body) {
  res.writeHead(code,{"content-type":"application/json","cache-control":"no-store"});
  res.end(JSON.stringify(body));
}
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,"http://localhost").pathname;
  if(path==="/health" && req.method==="GET") return reply(res,200,{ok:true,service:"meenarada-telegram-webhook"});
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
    const message = body.message;
    const command = String(message?.text || "").trim().split(" ")[0].split("@")[0];
    if(message?.chat?.id && command === "/start"){
      await telegram("sendMessage",{chat_id:message.chat.id,text:"నమస్కారం! Mee Narada AI Publishing Studio కి స్వాగతం.\n\nChoose what you would like to prepare. All content requires editorial approval before publishing.",reply_markup:menu});
    } else if(message?.chat?.id && command === "/cancel"){
      await telegram("sendMessage",{chat_id:message.chat.id,text:"Cancelled. Send /start to open the menu."});
    } else if(message?.chat?.id && isNewsReply(message)){
      const text = String(message.text || message.caption || "").trim();
      if(!text) {
        await telegram("sendMessage",{chat_id:message.chat.id,text:"Please send your news as text. Media uploads will be supported in a later stage."});
      } else if(text.length > maxNewsLength) {
        await telegram("sendMessage",{chat_id:message.chat.id,text:"News text is too long. Please keep it within 10,000 characters."});
      } else if(!editorAllowed(message.from?.id)) {
        await telegram("sendMessage",{chat_id:message.chat.id,text:"⛔ Draft saving is restricted to authorized Mee Narada editors. Ask an admin to register your Telegram numeric user ID."});
      } else {
        const stored = await saveIntake(body.update_id,message,text);
        if(stored.created) {
          await telegram("sendMessage",{chat_id:message.chat.id,text:previewNews(text)+"\n\n✅ Saved securely as a private editorial draft. Draft ID: "+stored.id,reply_markup:{inline_keyboard:[[{text:"📰 Create Another Draft",callback_data:"news"}],[{text:"🏠 Main Menu",callback_data:"home"}]]}});
        }
      }
    } else if(body.callback_query?.id){
      const callback = body.callback_query;
      await telegram("answerCallbackQuery",{callback_query_id:callback.id});
      const chatId = callback.message?.chat?.id;
      if(chatId) {
        if(callback.data === "news") {
          if(!editorAllowed(callback.from?.id)) { await telegram("sendMessage",{chat_id:chatId,text:"⛔ Create News is restricted to authorized Mee Narada editors."}); return reply(res,200,{ok:true}); }
          await telegram("sendMessage",{chat_id:chatId,text:newsMarker+"\n\nReply to this message with your Telugu or English news text, including source links.\n\nMaximum 10,000 characters. Your submission is saved privately for editorial review; it is not published.",reply_markup:{force_reply:true,selective:true,input_field_placeholder:"Paste news text and source links"}});
        } else if(callback.data === "home") {
          await telegram("sendMessage",{chat_id:chatId,text:"Mee Narada AI Publishing Studio — choose an option:",reply_markup:menu});
        } else {
          await telegram("sendMessage",{chat_id:chatId,text:prompts[String(callback.data)]||"Please choose a menu option."});
        }
      }
    }
    return reply(res,200,{ok:true});
  } catch(e) {
    console.error("Webhook processing failed",e instanceof Error?e.message:"unknown");
    return reply(res,500,{error:"Processing failed"});
  }
});
server.listen(port,()=>console.log(`Telegram webhook listening on ${port}`));
