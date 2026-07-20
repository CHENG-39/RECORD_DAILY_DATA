import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.recorddailydata.diettracker',
  appName: '饮食追踪',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
