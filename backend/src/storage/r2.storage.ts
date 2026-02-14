import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import type { IStorageProvider, UploadParams } from "./storage.interface";
import { config } from "../config";

export class R2StorageProvider implements IStorageProvider {
    private client: S3Client;
    private bucket: string;

    constructor() {
        const { accountId, accessKeyId, secretAccessKey, bucketName } = config.storage.r2;

        this.client = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
        this.bucket = bucketName;
    }

    async upload(params: UploadParams): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: params.key,
                Body: params.body,
                ContentType: params.contentType,
            })
        );
    }

    async delete(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            })
        );
    }

    getPublicUrl(key: string): string {
        const publicUrl = config.storage.r2.publicUrl;
        if (publicUrl) {
            return `${publicUrl}/${key}`;
        }
        // Fallback to stream endpoint when no public URL is configured
        return `/api/files/stream`;
    }

    async getStream(key: string): Promise<{ stream: Readable; contentType: string; contentLength: number }> {
        const response = await this.client.send(
            new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            })
        );

        return {
            stream: response.Body as Readable,
            contentType: response.ContentType || "application/octet-stream",
            contentLength: response.ContentLength || 0,
        };
    }
}
