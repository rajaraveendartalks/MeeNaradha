import "./style.css";
import AuthLinkRedirect from './components/AuthLinkRedirect';
export const metadata={title:"Mee Narada Beta | తెలుగు సినిమా వార్తలు",description:"తెలుగు సినిమా వార్తలు, ఫోటో గ్యాలరీలు మరియు OTT అప్‌డేట్స్"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="te"><body><AuthLinkRedirect/>{children}</body></html>}
