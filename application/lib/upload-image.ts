import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ApiError, errorMessage } from './api-client/client';
import { uploadsApi } from './api-client/resources';

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function contentTypeOf(asset: ImagePickerAsset) {
  if (asset.mimeType) return asset.mimeType;
  const extension = (asset.fileName ?? asset.uri).split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return TYPE_BY_EXTENSION[extension] ?? 'image/jpeg';
}

/** Uploads a picked photo straight to S3 and returns its public URL, ready to save on a product. */
export async function uploadProductImage(asset: ImagePickerAsset): Promise<string> {
  const contentType = contentTypeOf(asset);
  const { url, fields, publicUrl } = await uploadsApi.presignProductImage(contentType);

  // S3 requires the policy fields before the file in the multipart body.
  const form = new FormData();
  Object.entries(fields).forEach(([name, value]) => form.append(name, value));
  if (Platform.OS === 'web' && asset.file) form.append('file', asset.file);
  else form.append('file', { uri: asset.uri, name: asset.fileName ?? 'photo', type: contentType } as unknown as Blob);

  const { status, body } = await postForm(url, form);
  if (status < 200 || status >= 300) {
    if (body.includes('EntityTooLarge')) throw new Error('Photos must be under 10 MB');
    // S3 explains rejections in an XML <Code> (e.g. AccessDenied); surface it so failures are diagnosable.
    if (__DEV__) console.warn('S3 upload failed', status, body);
    const code = body.match(/<Code>(.*?)<\/Code>/)?.[1] ?? `HTTP ${status}`;
    throw new Error(`Could not upload the photo (${code}). Please try again.`);
  }
  return publicUrl;
}

// XMLHttpRequest rather than fetch: Expo replaces the global fetch with expo/fetch, which
// rejects React Native's `{ uri, name, type }` file parts ("Unsupported FormDataPart
// implementation"). RN's XHR still streams those parts from disk.
function postForm(url: string, form: FormData) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText ?? '' });
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.send(form);
  });
}

export function uploadErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof TypeError) return errorMessage(error);
  return error instanceof Error ? error.message : errorMessage(error);
}
