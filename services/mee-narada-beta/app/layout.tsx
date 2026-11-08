import "./style.css";
import './fonts.css';
import {db} from '../lib/db';
import {defaultTypography,loadTypography,typographyVariables} from '../lib/typography';
import AuthLinkRedirect from './components/AuthLinkRedirect';
export const metadata={title:"Mee Narada Beta | తెలుగు సినిమా వార్తలు",description:"తెలుగు సినిమా వార్తలు, ఫోటో గ్యాలరీలు మరియు OTT అప్‌డేట్స్"};
export default async function Layout({children}:{children:React.ReactNode}){
  let fonts=defaultTypography;
  try{fonts=(await loadTypography(db)).config}catch{console.error('Website typography unavailable; using original settings')}
  return <html lang="te"><body style={typographyVariables(fonts) as React.CSSProperties}><AuthLinkRedirect/>{children}</body></html>
}
