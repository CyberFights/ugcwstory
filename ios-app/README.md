# UGCW Story — iOS app (iPhone / iPad)

The same offline game as the Android build (v1.0), packaged with Capacitor
for iOS. It bundles the game locally (`www/index.html` + `www/assets/`):
the 5 ruin-city maps, Naicul sprites, battle art, the repo's terrain and
battle rules, and saves on the device. No server, no account, no key.

## What is in this folder

- `www/index.html` + `www/assets/` — the v1.0 game, identical to Android.
- `capacitor.config.ts` — app ID `com.cyberfights.ugcwstory`, local web app
  (no `server.url`).
- `ios/` — the generated Xcode project (`ios/App/App.xcworkspace`), ready
  to open in Xcode. Bundle ID and icon are set. No camera/mic/photo
  permissions — the game needs none. Minimum iOS 14.0.
- `resources/icon-1024.png` — icon source.
- `.github/workflows/build-ios-ugcw.yml` — the GitHub Actions workflow
  that builds the IPA on a macOS runner (also delivered separately as
  `build-ios-ugcw.yml` next to this folder).

## The honest limit: no signed IPA from a Linux box

iOS apps can only be compiled with Xcode on a Mac, and a real iPhone will
only install a signed app. This sandbox is Linux, so there is no IPA file
in this delivery — the project and the workflow are the deliverable, and
the IPA comes out of the macOS runner.

## Getting the IPA (free, no Apple Developer account)

1. Copy this whole `ios-app/` folder into the repo root
   (CyberFights/ugcwstory).
2. Add `build-ios-ugcw.yml` as `.github/workflows/build-ios-ugcw.yml`
   in the repo.
3. Run the workflow manually from the Actions tab — it builds both files
   AND publishes them to a GitHub Release under the tag you type
   (default `ios-v1.0.0`). Pushing a tag like `ios-v1.0.0` does the same
   thing automatically.
4. Download `UGCWStory-ios.ipa` from that release (it is also in the
   run's artifacts).

The IPA is unsigned. Install it on a real iPhone with AltStore (or
Sideloadly) using a free Apple ID — it re-signs the app with your Apple
ID. Free Apple IDs get a 7-day certificate, so the app needs refreshing
weekly through AltStore. The simulator zip in the same run is for testing
in the iOS Simulator on a Mac.

## TestFlight / App Store (paid route)

That needs the Apple Developer Program ($99/year), the App ID
`com.cyberfights.ugcwstory` registered, a distribution certificate and a
provisioning profile stored as GitHub secrets, and the archive step run
with signing enabled instead of `CODE_SIGNING_ALLOWED=NO`.

## Local development (needs a Mac)

- `npm install` then `npx cap sync ios` and open `ios/App/App.xcworkspace`
  in Xcode to run on a simulator or a plugged-in iPhone.
