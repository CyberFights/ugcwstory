import type { CapacitorConfig } from '@capacitor/cli';

// UGCW Story: Ruin City — iOS app (v1.0).
// Same offline game as the Android build: bundles the game locally
// (www/index.html + assets) and saves to the device. No server.url.
const config: CapacitorConfig = {
  appId: 'com.cyberfights.ugcwstory',
  appName: 'UGCW Story',
  webDir: 'www',
  ios: { contentInset: 'automatic' }
};
export default config;
