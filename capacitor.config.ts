// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fluxxi.app',
  appName: 'Fluxxi',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    compileOptions: {
      sourceCompatibility: 17,
      targetCompatibility: 17
    },
    kotlinOptions: {
      jvmTarget: '17'
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: false
    },
    NavigationBar: {
      style: 'LIGHT',
      overridesWebView: false
    },
    Camera: {
      saveToGallery: false,
      allowEditing: false,
      quality: 80,
      sourceType: ['camera', 'photos']
    }
  }
};

export default config;
