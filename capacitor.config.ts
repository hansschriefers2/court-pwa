import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hansification.court",
  appName: "Court",
  // No bundled web assets: the native shell loads the live production site directly.
  webDir: "www",
  server: {
    url: "https://www.court-app.de",
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
