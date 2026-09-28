import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/** Presigned S3 uploads, so image bytes go straight from the seller app to the bucket. */
@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
