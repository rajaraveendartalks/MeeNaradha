"use client";
import {useEffect,useId,useRef,type ReactNode} from "react";
export function StudioDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null),id=useId(),callback=useRef(onClose);callback.current=onClose;
  useEffect(()=>{const dialog=ref.current;if(dialog&&!dialog.open)dialog.showModal();return()=>dialog?.close()},[]);
  return <dialog ref={ref} className="studio-dialog" aria-labelledby={id} onCancel={event=>{event.preventDefault();callback.current()}}><div className="studio-dialog-heading"><h2 id={id}>{title}</h2><button type="button" className="studio-button" onClick={onClose} autoFocus>Close</button></div>{children}</dialog>;
}
