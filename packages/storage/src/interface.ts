import type { Readable } from "stream";

export interface UploadParams {
    key: string;
    body: Buffer;
    contentType: string;
}

export interface IStorageProvider {
    upload(params: UploadParams): Promise<void>;
    delete(key: string): Promise<void>;
    getPublicUrl(key: string): string;
    getStream(
        key: string
    ): Promise<{ stream: Readable; contentType: string; contentLength: number }>;
}
