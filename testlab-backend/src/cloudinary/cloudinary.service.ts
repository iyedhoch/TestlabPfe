import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadBufferToCloudinary(
    buffer: Buffer,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
        },
        (error, result) => {
          if (error) return reject(error);
          if (result) {
            resolve(result);
          } else {
            reject(new Error('UploadApiResponse is undefined'));
          }
        },
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(stream);
    });
  }

  async extractPublicIdFromUrl(url: string): Promise<string | null> {
    try {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.indexOf('upload');

      if (uploadIndex === -1) {
        return null;
      }

      let pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

      return pathAfterUpload.replace(/\.[^.]+$/, '');
    } catch (error) {
      console.error('Error extracting public_id from URL:', error);
      return null;
    }
  }

  async deleteFromCloudinary(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error: any, result: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }
}
