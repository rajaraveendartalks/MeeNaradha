'use client';
import {useEffect} from 'react';
import {authLinkRedirect} from '../../lib/site-management';
export default function AuthLinkRedirect(){useEffect(()=>{const path=authLinkRedirect(window.location.pathname,window.location.hash);if(path)window.location.replace(path)},[]);return null}
