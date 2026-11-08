import {cache} from 'react';
import {db} from '../../lib/db';
import {defaultNavigation,loadPublishedNavigation} from '../../lib/site-management';
import {SiteHeaderView,SiteFooterView} from './SiteNavigationView';
const navigation=cache(async()=>db?loadPublishedNavigation(db):defaultNavigation());
export async function PublicSiteHeader(){return <SiteHeaderView navigation={await navigation()}/>}
export async function PublicSiteFooter(){return <SiteFooterView navigation={await navigation()}/>}
