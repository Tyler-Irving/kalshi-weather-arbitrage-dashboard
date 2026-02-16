/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Development proxy settings
  readonly VITE_DEV_BACKEND_URL?: string
  readonly VITE_DEV_BACKEND_WS_URL?: string
  
  // Production runtime settings (optional)
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_BASE_PATH?: string
  
  // App customization
  readonly VITE_APP_TITLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
