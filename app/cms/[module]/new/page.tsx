import { notFound } from "next/navigation"; import { getCmsModule } from "../../../../lib/cms"; import { EditorForm } from "../editor-form";
export default async function NewPage({params}:{params:Promise<{module:string}>}){const {module:slug}=await params;const module=getCmsModule(slug);if(!module)notFound();return <EditorForm module={module}/>}
