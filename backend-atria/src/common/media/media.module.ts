import { Global, Module } from '@nestjs/common';
import { ImagePreviewService } from './image-preview.service';

@Global()
@Module({
  providers: [ImagePreviewService],
  exports: [ImagePreviewService],
})
export class MediaModule {}
