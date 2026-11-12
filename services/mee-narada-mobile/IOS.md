# Mee Narada for iPhone and iPad

The iOS app uses the approved Mee Narada design and the same live published CMS content as Android. It includes articles, Telugu search and reader settings, galleries, reviews, bookmarks, native sharing and existing audience reactions. Saved stories and preferences belong to the current device.

## Build and open on a Mac

Requirements: Node 22+, macOS and Xcode 26 or newer. iOS/iPadOS 15 or newer is supported. Swift Package Manager is used; CocoaPods is not required.

From `services/mee-narada-mobile` in the complete repository:

```sh
npm ci
npm run sync:ios
npm test
npm run ios:open
```

The generated project is `ios/App/App.xcodeproj`, with scheme **App**, bundle ID `com.meenarada.app`, display name **Mee Narada**, version **0.1.0**, build **1**. Select an iPhone or iPad Simulator in Xcode and run. `ios:init` regenerates branding and metadata; keep custom source in the tracked `native/` and `scripts/` files.

For command-line compilation:

```sh
npm run ios:simulator
npm run ios:device
```

The simulator command produces `build/ios-simulator/Mee-Narada-iOS-simulator-v0.1.0.zip`. The device command verifies an unsigned iPhone/iPad compilation. Neither ZIP is an installable iPhone IPA. Apple signing is deliberately left to the owner's Developer team.

The GitHub workflow **Mee Narada iOS build** compiles simulator and device variants on macOS for this pull request. Its artifacts contain compiled app bundles and installation notes. It never uploads a build to Apple or requires signing secrets.

## Install on real iPhones through TestFlight

1. Open the project on a Mac and select your Apple Developer team under **App → Signing & Capabilities**. Let Xcode manage signing. Confirm that `com.meenarada.app` is registered and available to your team; update the root Capacitor app ID before regenerating if a different identifier is needed.
2. Create the matching iOS app record in App Store Connect. Select a generic iOS device destination, choose **Product → Archive**, then **Distribute App → App Store Connect**.
3. After Apple processes the upload, add the build to an internal TestFlight test group. External testing may require Apple's beta review. Testers install it through Apple's TestFlight app.

Developer-account access, signing and TestFlight distribution are the remaining owner steps. Do not send Apple passwords, certificates or private signing keys in chat. A team identifier can be supplied when connecting an authorized signing workflow.

## iOS-specific behavior

- Bundled content uses `capacitor://mobile.meenarada.com`. Existing CMS Edge functions allow exactly that origin alongside Android and the existing website origins.
- Safe-area padding protects content around the notch and home indicator. The fake prototype status bar, device frame and desktop controls are hidden in the native app.
- Native system sharing uses the iOS share sheet. Android-only back-button and exit APIs are never called on iOS. Status-bar text follows the reader's light/dark preference.
- The app uses HTTPS media and API URLs. No broad App Transport Security exception, background location, microphone, camera or tracking permission is requested.
- `PrivacyInfo.xcprivacy` declares the UserDefaults reason `CA92.1` required for local preference storage. The file is added to the Xcode resource phase. Existing native article-view/share analytics and persistent anonymous visitor identifiers must be reflected accurately in App Store Connect privacy disclosures before distribution. The manifest is not a substitute for those disclosures.
- There is no push notification delivery, reader login or cross-device bookmark synchronization in this version.

References: [Capacitor iOS requirements](https://capacitorjs.com/docs/ios), [Preferences privacy manifest](https://capacitorjs.com/docs/apis/preferences), [Apple TestFlight](https://developer.apple.com/testflight/).
