import { notFound } from "next/navigation";
import { getCmsModule } from "../../../../lib/cms";
import { requireCmsAccess } from "../../../../lib/cms-auth";
import { EditorForm } from "../editor-form";

export default async function NewPage({params}:{params:Promise<{module:string}>}){
 const {module:slug}=await params; const module=getCmsModule(slug); if(!module) notFound();
 await requireCmsAccess();
 return <EditorForm module={module}/>;
}
