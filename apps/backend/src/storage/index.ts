import { createR2Storage, type IStorageProvider } from "@menugo/storage";
import { config } from "../config";

let storageProvider: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (!storageProvider) {
    storageProvider = createR2Storage(config.storage.r2);
  }
  return storageProvider;
}

export type { IStorageProvider, UploadParams } from "@menugo/storage";
