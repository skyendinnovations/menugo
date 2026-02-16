import { Platform } from 'react-native';
import BaseAPI from './base';
import type { FileRecord } from '@menugo/dto';

export interface UploadImageParams {
  uri: string;
  entityType: 'restaurant' | 'menu_item' | 'user';
  entityId: string;
  purpose?: string;
}

class FileAPI extends BaseAPI {
  async uploadImage(params: UploadImageParams) {
    const { uri, entityType, entityId, purpose = 'image' } = params;

    const formData = new FormData();

    if (Platform.OS === 'web') {
      // On web, expo-image-picker returns a blob URI — fetch it to get a real Blob
      const response = await fetch(uri);
      const blob = await response.blob();
      // Derive extension from the blob's actual MIME type
      const blobExt =
        blob.type === 'image/png'
          ? 'png'
          : blob.type === 'image/webp'
            ? 'webp'
            : blob.type === 'image/gif'
              ? 'gif'
              : 'jpg';
      formData.append('file', blob, `image.${blobExt}`);
    } else {
      // On native, extract filename from URI
      const uriParts = uri.split('/');
      const fileName = uriParts[uriParts.length - 1] || 'image.jpg';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : ext === 'gif'
              ? 'image/gif'
              : 'image/jpeg';
      formData.append('file', {
        uri,
        name: fileName,
        type: mimeType,
      } as any);
    }

    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    formData.append('purpose', purpose);

    return this.upload<{ success: boolean; data: FileRecord; message: string }>(
      '/api/files/upload',
      formData
    );
  }

  async deleteFile(fileId: number) {
    return this.delete<{ success: boolean; data: FileRecord; message: string }>(
      `/api/files/${fileId}`
    );
  }

  async getEntityFiles(entityType: string, entityId: string) {
    return this.get<{ success: boolean; data: FileRecord[] }>(
      `/api/files/entity/${entityType}/${entityId}`
    );
  }

  /**
   * Get the full URL for a file. If the url is a relative path (stream endpoint),
   * prepend the base API URL so <Image> can load it.
   */
  getFullUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `${this.baseURL}${url}`;
  }
}

export const fileAPI = new FileAPI();
