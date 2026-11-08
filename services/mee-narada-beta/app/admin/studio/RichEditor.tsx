"use client";
import {useEffect,useRef,useState} from "react";
import {EditorContent,useEditor,useEditorState} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import {TextStyle,Color} from "@tiptap/extension-text-style";
import {articleDocument,encodeDocument,safeHttpUrl,youtubeId} from "../../../lib/rich-content";
import {MediaPicker} from "./MediaLibrary";
import {StudioDialog} from "./StudioDialog";

export function RichEditor({value,onChange,label,disabled=false}:{value:string;onChange:(value:string)=>void;label:string;disabled?:boolean}){
  const [media,setMedia]=useState(false),[urlMode,setUrlMode]=useState<"link"|"youtube"|null>(null),[url,setUrl]=useState(""),[error,setError]=useState("");
  const changeRef=useRef(onChange);changeRef.current=onChange;
  const editor=useEditor({
    extensions:[StarterKit.configure({heading:{levels:[2,3]},link:{openOnClick:false,protocols:["http","https"]}}),Image.configure({allowBase64:false}),Youtube.configure({nocookie:true}),TextStyle,Color],
    immediatelyRender:false,editable:!disabled,content:articleDocument(value),
    editorProps:{attributes:{class:"studio-prose",role:"textbox","aria-label":label,"aria-multiline":"true"}},
    onUpdate:({editor})=>changeRef.current(encodeDocument(editor.getJSON()))
  });
  useEffect(()=>{if(!editor)return;const incoming=articleDocument(value);if(encodeDocument(editor.getJSON())!==encodeDocument(incoming))editor.commands.setContent(incoming,{emitUpdate:false})},[value,editor]);
  useEffect(()=>{editor?.setEditable(!disabled)},[disabled,editor]);
  const state=useEditorState({editor,selector:({editor})=>editor?{bold:editor.isActive("bold"),italic:editor.isActive("italic"),underline:editor.isActive("underline"),heading:editor.isActive("heading"),bullet:editor.isActive("bulletList"),ordered:editor.isActive("orderedList"),undo:editor.can().undo(),redo:editor.can().redo(),color:String(editor.getAttributes("textStyle").color||"")}:null});
  function insertUrl(){
    if(!editor)return;
    if(urlMode==="youtube"){if(!youtubeId(url)){setError("Paste a valid YouTube link.");return}editor.chain().focus().setYoutubeVideo({src:url}).run()}
    else{const href=safeHttpUrl(url);if(!href){setError("Enter a link starting with https:// or http://.");return}editor.chain().focus().extendMarkRange("link").setLink({href}).run()}
    setUrlMode(null);setError("");setUrl("");
  }
  return <div className="studio-rich-editor"><div className="studio-rich-toolbar" aria-label={label+" formatting"}>
    <button type="button" disabled={!editor||disabled} onClick={()=>setMedia(true)}>＋ Add Media</button>
    <button type="button" aria-label="Bold" aria-pressed={state?.bold||false} disabled={!editor||disabled} onClick={()=>editor?.chain().focus().toggleBold().run()}><strong>B</strong></button>
    <button type="button" aria-label="Italic" aria-pressed={state?.italic||false} disabled={!editor||disabled} onClick={()=>editor?.chain().focus().toggleItalic().run()}><em>I</em></button>
    <button type="button" aria-label="Underline" aria-pressed={state?.underline||false} disabled={!editor||disabled} onClick={()=>editor?.chain().focus().toggleUnderline().run()}><u>U</u></button>
    <button type="button" aria-label="Heading" aria-pressed={state?.heading||false} disabled={!editor||disabled} onClick={()=>editor?.chain().focus().toggleHeading({level:2}).run()}>H2</button>
    <button type="button" aria-label="Bulleted list" aria-pressed={state?.bullet||false} disabled={!editor||disabled} onClick={()=>editor?.chain().focus().toggleBulletList().run()}>• List</button>
    <button type="button" aria-label="Numbered list" aria-pressed={state?.ordered||false} disabled={!editor||disabled} onClick={()=>editor?.chain().focus().toggleOrderedList().run()}>1. List</button>
    <button type="button" disabled={!editor||disabled} onClick={()=>{setUrlMode("link");setUrl(String(editor?.getAttributes("link").href||""));setError("")}}>Link</button>
    <button type="button" disabled={!editor||disabled} onClick={()=>{setUrlMode("youtube");setUrl("");setError("")}}>▶ YouTube</button>
    <select aria-label="Text color" disabled={!editor||disabled} value={state?.color||""} onChange={event=>event.target.value?editor?.chain().focus().setColor(event.target.value).run():editor?.chain().focus().unsetColor().run()}><option value="">Text color</option><option value="#cf233d">Red</option><option value="#2164c4">Blue</option><option value="#18794e">Green</option><option value="#ba6100">Orange</option><option value="#793cb5">Purple</option></select>
    <button type="button" aria-label="Undo" disabled={!state?.undo||disabled} onClick={()=>editor?.chain().focus().undo().run()}>↶</button><button type="button" aria-label="Redo" disabled={!state?.redo||disabled} onClick={()=>editor?.chain().focus().redo().run()}>↷</button>
  </div>{!editor&&<p className="studio-editor-loading">Loading editor…</p>}<EditorContent editor={editor}/>
  {media&&<MediaPicker onClose={()=>setMedia(false)} onSelect={(item,alt)=>{editor?.chain().focus().setImage({src:item.url,alt}).run();setMedia(false)}}/>}
  {urlMode&&<StudioDialog title={urlMode==="youtube"?"Insert YouTube video":"Insert link"} onClose={()=>setUrlMode(null)}><form className="studio-url-form" onSubmit={event=>{event.preventDefault();insertUrl()}}><label className="studio-field"><span>{urlMode==="youtube"?"YouTube URL":"Link URL"}</span><input type="url" value={url} onChange={event=>setUrl(event.target.value)} required placeholder="https://"/></label>{error&&<p role="alert" className="studio-message studio-error">{error}</p>}<div className="studio-actions">{urlMode==="link"&&<button type="button" className="studio-button" onClick={()=>{editor?.chain().focus().unsetLink().run();setUrlMode(null)}}>Remove link</button>}<button className="studio-button studio-primary">Insert</button></div></form></StudioDialog>}
  </div>;
}
