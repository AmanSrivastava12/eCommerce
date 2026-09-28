import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'crypto';

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const UPLOAD_WINDOW_SECONDS = 5 * 60;

export interface PresignedImageUpload {
  /** POST target for a multipart form: every `fields` entry first, then the file as `file`. */
  url: string;
  fields: Record<string, string>;
  /** Where the image is served from once the upload succeeds — store this on the product. */
  publicUrl: string;
}

@Injectable()
export class UploadsService {
  private readonly s3: S3Client | null;
  private readonly bucket?: string;
  private readonly publicUrl?: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET');
    this.publicUrl = config.get<string>('S3_PUBLIC_URL')?.replace(/\/+$/, '');
    const region = config.get<string>('AWS_REGION');
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.s3 =
      this.bucket && this.publicUrl && region && accessKeyId && secretAccessKey
        ? new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
        : null;
  }

  // A presigned POST (rather than PUT) lets S3 itself enforce the size cap and content type.
  async presignProductImage(sellerId: string, contentType: string): Promise<PresignedImageUpload> {
    if (!this.s3) throw new ServiceUnavailableException('Image uploads are not configured');
    const extension = EXTENSION_BY_TYPE[contentType];
    if (!extension) throw new BadRequestException('Upload a JPEG, PNG, WebP or HEIC image');

    // The bucket policy only makes `products/*` public, so keys must stay under that prefix.
    const key = `products/${sellerId}/${randomUUID()}.${extension}`;
    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: this.bucket!,
      Key: key,
      Conditions: [
        ['content-length-range', 1, MAX_IMAGE_BYTES],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: UPLOAD_WINDOW_SECONDS,
    });
    return { url, fields, publicUrl: `${this.publicUrl}/${key}` };
  }
}
