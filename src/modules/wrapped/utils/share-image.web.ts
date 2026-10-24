import type { RefObject } from 'react';
import type { ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export async function shareViewAsImage(view: RefObject<ViewInstance | null>, fileName: string): Promise<boolean> {
  const dataUri = await captureRef(view, { format: 'png', result: 'data-uri' });
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = `${fileName}.png`;
  link.click();
  return true;
}
