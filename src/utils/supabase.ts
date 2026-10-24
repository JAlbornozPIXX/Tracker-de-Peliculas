import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      // Al prerenderizar la web (web.output "static") el código corre en Node,
      // sin window, y AsyncStorage para web falla al leer la sesión. Ahí
      // Supabase usa un almacenamiento en memoria; en el navegador y en el
      // teléfono (React Native define window) se guarda con AsyncStorage.
      storage: typeof window === 'undefined' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })
