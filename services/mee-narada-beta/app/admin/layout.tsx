import StudioShell from "./studio/StudioShell";
import "./studio/studio.css";
export const metadata={title:"Content Studio | Mee Narada",robots:{index:false,follow:false}};
export default function AdminLayout({children}:{children:React.ReactNode}){return <StudioShell>{children}</StudioShell>}
