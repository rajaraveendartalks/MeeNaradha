# Mee Narada Android app

The approved red-and-gold mobile design, connected to the existing production CMS. Publishing remains in Content Studio; readers refresh the app to retrieve published articles, curated homepage stories, galleries, videos and reviews.

## Reader features

- Telugu search, category navigation and full article/review reader.
- Gallery albums, trailer links, native Android sharing and website share links.
- Device-local bookmarks, recently opened saved articles for offline reading, Telugu fonts, text size and dark mode.
- Existing shared article reactions with durable operation IDs and safe retry after interrupted requests.
- Existing article analytics on native Android only, respecting usage opt-out, Do Not Track and Global Privacy Control. Browser previews do not generate article analytics.
- Explicit loading, offline, retry, withdrawn-article and unavailable-content states.

## Build

Run from this directory in the complete monorepo. Node 22+, Java 21 and an Android SDK with platform 36 and build-tools 35 or newer are required. The build reuses the public site's tracked logo, fonts and rich-content renderer.

```sh
npm ci
npm test
npm run build
npm run android:debug
```

Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` to your SDK path. Optionally set `MNR_GRADLE_BIN` to an installed Gradle executable; otherwise the generated Android wrapper is used. The generated project is in `android/`, and the test APK is `android/app/build/outputs/apk/debug/app-debug.apk`.

`android:init` regenerates the native project, branding and custom edge-to-edge Activity. The debug application ID is `com.meenarada.app.test`, the installed label is **Mee Narada Test**, and version 0.1.0 is a test build. Keep the same debug signing key when distributing updates to an installed test app. Release signing and store publication are separate work.

## Configuration and data

`web/config.js` contains the public CMS endpoint and publishable client key. It contains no service-role credentials. Database RLS controls public reads. Native assets are bundled locally, using the HTTPS WebView origin `https://mobile.meenarada.com`; the app does not load a private preview website. Cleartext traffic and Android backup are disabled.

The existing reaction and analytics Edge functions allow the exact native origin and existing private design-preview origin. Existing auth, validation, rate limits and all other allowed origins are preserved. No database migrations are required.

Bookmarks/preferences persist locally on this device; there is no reader account synchronization. Offline feed data expires after 24 hours. Cached article bodies are used only for network/server failures, never to bypass a successful withdrawal or access denial. Notification delivery and advertising SDKs are not included in this build.

## Verification for 0.1.0-test

- 9 mobile tests passed: live-content mapping, search, gallery access, safe rich content, withdrawal handling, interrupted reaction retries and exact-origin CORS.
- 65 existing application tests and Edge TypeScript checks passed.
- Production CMS reads confirmed published stories, galleries, videos, reviews and curated homepage ordering.
- Gradle Android debug compilation passed; final APK alignment, v2/v3 signature and bundled-asset checks passed.
- Physical-device installation and behavior still require a Samsung S24 test. Browser checks do not verify native device APIs.

