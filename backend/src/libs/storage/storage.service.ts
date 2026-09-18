import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.supabaseUrl = this.config.get<string>('SUPABASE_URL', '');
    this.supabaseKey = this.config.get<string>('SUPABASE_ANON_KEY', '');
    this.bucket = this.config.get<string>('STORAGE_BUCKET', 'lumina');
  }

  private get headers() {
    return {
      apikey: this.supabaseKey,
      Authorization: `Bearer ${this.supabaseKey}`,
    };
  }

  async upload(
    folder: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    if (!this.supabaseUrl) {
      throw new BadRequestException('Storage not configured');
    }

    const path = `${folder}/${fileName}`;

    const res = await fetch(
      `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(fileBuffer),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Upload failed (${res.status}): ${err}`);
      throw new BadRequestException('File upload failed');
    }

    return {
      path,
      publicUrl: this.getPublicUrl(path),
    };
  }

  async delete(path: string): Promise<void> {
    if (!this.supabaseUrl) return;

    const res = await fetch(
      `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${path}`,
      {
        method: 'DELETE',
        headers: this.headers,
      },
    );

    if (!res.ok) {
      this.logger.warn(`Delete failed for ${path}: ${res.status}`);
    }
  }

  getPublicUrl(path: string): string {
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${path}`;
  }
}
