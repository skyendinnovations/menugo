import type { IStorageProvider } from "./storage.interface";
import { R2StorageProvider } from "./r2.storage";

let storageProvider: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
    if (!storageProvider) {
        storageProvider = new R2StorageProvider();
    }
    return storageProvider;
}

export type { IStorageProvider, UploadParams } from "./storage.interface";
