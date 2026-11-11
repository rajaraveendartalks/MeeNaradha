import StudioShell from "./studio/StudioShell";
import "./studio/studio.css";
import './studio/editorial-tools.css';
import './studio/publishing-requests.css';
import './studio/advertising.css';
import './studio/reactions.css';
import './studio/home-presets.css';
export const metadata={title:"Content Studio | Mee Narada",robots:{index:false,follow:false}};
export default function AdminLayout({children}:{children:React.ReactNode}){return <StudioShell>{children}</StudioShell>}
