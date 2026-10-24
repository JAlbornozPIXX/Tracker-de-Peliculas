import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

//Captura la vista como PNG y abre la hoja de compartir del sistema, desde donde también se puede guardar en la galería
//(en iOS requiere NSPhotoLibraryAddUsageDescription, en app.json). El nombre solo se usa en web: con un nombre propio,
//view-shot nunca borra en Android sus archivos temporales.
export async function shareViewAsImage(view: RefObject<View | null>, _fileName: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const uri = await captureRef(view, { format: 'png', result: 'tmpfile' });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Compartir tu Wrapped' });
  return true;
}
