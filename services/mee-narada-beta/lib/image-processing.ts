/** Shared by both CMS uploaders. Processing happens before any network upload. */
export type ImageOptions={mode:'web'|'original';watermark:'none'|'text'|'logo';position:'bottom-right'|'bottom-left'|'top-right'|'top-left';opacity:number};
export const defaultImageOptions:ImageOptions={mode:'web',watermark:'none',position:'bottom-right',opacity:0.7};
export const MAX_SOURCE_BYTES=40*1024*1024,MAX_UPLOAD_BYTES=8*1024*1024;
const allowedTypes=['image/jpeg','image/png','image/webp','image/gif'];
export type PreparedImage={file:File;originalSize:number;width:number;height:number;savedBytes:number;watermarked:boolean;note:string};
type DecodedImage={source:CanvasImageSource;width:number;height:number;close:()=>void};
export type ImageRuntime={decode:(file:File)=>Promise<DecodedImage>;canvas:(width:number,height:number)=>HTMLCanvasElement;logo:()=>Promise<DecodedImage>};
function loadImage(url:string,revoke=false):Promise<DecodedImage>{return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>{if(revoke)URL.revokeObjectURL(url)}});image.onerror=()=>{if(revoke)URL.revokeObjectURL(url);reject(Error('This image could not be opened. Choose a valid JPG, PNG or WebP image.'))};image.src=url})}
const browserRuntime:ImageRuntime={
 async decode(file){if(typeof createImageBitmap==='function'){try{const image=await createImageBitmap(file,{imageOrientation:'from-image'});return {source:image,width:image.width,height:image.height,close:()=>image.close()}}catch{/* Some browsers need the image-element decoder. */}}return loadImage(URL.createObjectURL(file),true)},
 canvas(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas},
 logo:()=>loadImage('/meenarada-logo.webp'),
};
export function imageDimensions(width:number,height:number){if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width*height>40_000_000||width>16000||height>16000)throw Error('Choose an image up to 40 megapixels and 16,000 pixels per side.');const ratio=Math.min(1,2560/Math.max(width,height));return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))}}
function encode(canvas:HTMLCanvasElement):Promise<Blob>{return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image compression failed. Try another image.')),'image/webp',0.9))}
function originalResult(file:File,note:string,width=0,height=0):PreparedImage{if(file.size>MAX_UPLOAD_BYTES)throw Error('The original image exceeds 8 MB. Choose High quality optimisation or a smaller image.');return {file,originalSize:file.size,width,height,savedBytes:0,watermarked:false,note}}
async function imageHeader(file:File){
 const head=new Uint8Array(await file.slice(0,32).arrayBuffer()),text=(start:number,length:number)=>String.fromCharCode(...head.slice(start,start+length));
 const valid=file.type==='image/jpeg'?head[0]===255&&head[1]===216&&head[2]===255:file.type==='image/png'?head[0]===137&&text(1,3)==='PNG':file.type==='image/webp'?text(0,4)==='RIFF'&&text(8,4)==='WEBP':text(0,3)==='GIF';
 if(!valid)throw Error('The file contents do not match a supported image. Choose a valid JPG, PNG, WebP or GIF.');
 // GIFs and animated WebP/PNG retain all frames instead of becoming a still image.
 if(file.type==='image/gif')return true;
 if(file.type==='image/webp'&&text(12,4)==='VP8X'&&(head[20]&2)!==0)return true;
 if(file.type==='image/png'){
  const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);let offset=8;
  while(offset+12<=bytes.length){const size=view.getUint32(offset),kind=String.fromCharCode(...bytes.slice(offset+4,offset+8));if(kind==='acTL')return true;if(kind==='IDAT'||kind==='IEND')break;if(size>bytes.length-offset-12)break;offset+=12+size}
 }
 return false;
}
function corner(width:number,height:number,boxWidth:number,boxHeight:number,position:ImageOptions['position']){const margin=Math.max(1,Math.round(Math.min(width,height)*0.025));return {x:position.endsWith('left')?margin:width-boxWidth-margin,y:position.startsWith('top')?margin:height-boxHeight-margin}}
async function drawWatermark(context:CanvasRenderingContext2D,width:number,height:number,options:ImageOptions,runtime:ImageRuntime){
 context.save();context.globalAlpha=options.opacity;
 try{
  if(options.watermark==='logo'){
   const logo=await runtime.logo();try{if(!logo.width||!logo.height)throw Error('The watermark logo could not be loaded.');const ratio=Math.min(width*0.27/logo.width,height*0.18/logo.height),w=Math.max(1,Math.round(logo.width*ratio)),h=Math.max(1,Math.round(logo.height*ratio)),p=corner(width,height,w,h,options.position);context.drawImage(logo.source,p.x,p.y,w,h)}finally{logo.close()}
  }else{
   const text='MeeNarada.com',padding=Math.max(1,Math.round(Math.min(width,height)*0.009));let fontSize=Math.max(6,Math.min(44,Math.round(width*0.027),Math.round(height*0.11)));
   context.font='600 '+fontSize+'px sans-serif';if(context.measureText(text).width>width*0.42){fontSize*=width*0.42/context.measureText(text).width;context.font='600 '+fontSize+'px sans-serif'}
   const w=Math.ceil(context.measureText(text).width+padding*2),h=Math.ceil(fontSize*1.5+padding*2),p=corner(width,height,w,h,options.position);context.fillStyle='rgba(0,0,0,0.65)';context.fillRect(p.x,p.y,w,h);context.fillStyle='#ffffff';context.textBaseline='middle';context.fillText(text,p.x+padding,p.y+h/2);
  }
 }finally{context.restore()}
}
export async function prepareImage(file:File,options:ImageOptions=defaultImageOptions,runtime:ImageRuntime=browserRuntime):Promise<PreparedImage>{
 if(!allowedTypes.includes(file.type))throw Error('Choose a JPG, PNG, WebP or GIF image.');
 if(!file.size||file.size>MAX_SOURCE_BYTES)throw Error('Each original image must be between 1 byte and 40 MB.');
 if(!['web','original'].includes(options.mode)||!['none','text','logo'].includes(options.watermark)||!['bottom-right','bottom-left','top-right','top-left'].includes(options.position)||!Number.isFinite(options.opacity)||options.opacity<0.2||options.opacity>1)throw Error('Choose valid image upload settings.');
 const animated=await imageHeader(file);
 if(options.mode==='original'){if(options.watermark!=='none')throw Error('Choose High quality optimisation to add a watermark.');return originalResult(file,'Original file retained.')}
 if(animated){if(options.watermark!=='none')throw Error('Animated images keep their original frames. Choose No watermark, or upload a still JPG, PNG or WebP.');return originalResult(file,'Animation retained; original file uploaded.')}
 const image=await runtime.decode(file);let canvas:HTMLCanvasElement|undefined;
 try{
  const size=imageDimensions(image.width,image.height);canvas=runtime.canvas(size.width,size.height);const context=canvas.getContext('2d');if(!context)throw Error('Image processing is unavailable in this browser. Choose Original file or try another browser.');
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image.source,0,0,size.width,size.height);
  if(options.watermark!=='none')await drawWatermark(context,size.width,size.height,options,runtime);
  const blob=await encode(canvas);if(!blob.size||!allowedTypes.includes(blob.type))throw Error('The image could not be encoded in a supported format.');
  if(options.watermark==='none'&&blob.size>=file.size)return originalResult(file,'Original retained because it is already smaller.',image.width,image.height);
  if(blob.size>MAX_UPLOAD_BYTES)throw Error('The processed image is still over 8 MB. Choose a smaller image.');
  const extension=blob.type==='image/webp'?'webp':blob.type==='image/png'?'png':'jpg',stem=file.name.replace(/\.[^.]+$/,'')||'image',output=new File([blob],stem+(options.watermark!=='none'?'-watermarked':'')+'.'+extension,{type:blob.type,lastModified:file.lastModified});
  return {file:output,originalSize:file.size,...size,savedBytes:Math.max(0,file.size-output.size),watermarked:options.watermark!=='none',note:options.watermark!=='none'?'Watermark baked into the uploaded image.':'High quality web image.'};
 }finally{image.close();if(canvas){canvas.width=1;canvas.height=1}}
}
export function imageSize(bytes:number){return bytes>=1024*1024?(bytes/1024/1024).toFixed(2)+' MB':Math.max(1,Math.round(bytes/1024))+' KB'}
