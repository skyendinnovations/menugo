import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import type { IStorageProvider, UploadParams } from "./interface";

export interface R2Config {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl?: string;
}

export class R2StorageProvider implements IStorageProvider {
    private client: S3Client;
    private bucket: string;
    private publicUrl?: string;

    constructor(private config: R2Config) {
        this.client = new S3Client({
            region: "auto",
            endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
        this.bucket = config.bucketName;
        this.publicUrl = config.publicUrl;
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
        if (this.publicUrl) {
            return `${this.publicUrl}/${key}`;
        }
        return `/api/files/stream`;
    }

    async getStream(
        key: string
    ): Promise<{
        stream: Readable;
        contentType: string;
        contentLength: number;
    }> {
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
