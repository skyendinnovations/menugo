export { R2StorageProvider } from "./r2";
export type { R2Config } from "./r2";
export type { IStorageProvider, UploadParams } from "./interface";

import type { R2Config } from "./r2";
import { R2StorageProvider } from "./r2";
import type { IStorageProvider } from "./interface";

export function createR2Storage(config: R2Config): IStorageProvider {
    return new R2StorageProvider(config);
}
