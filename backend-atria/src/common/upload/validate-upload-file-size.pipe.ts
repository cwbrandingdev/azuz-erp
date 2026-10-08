import { PipeTransform } from '@nestjs/common';
import { assertUploadFileSize } from './upload-limits';

export class ValidateUploadFileSizePipe implements PipeTransform {
  transform(file: Express.Multer.File | undefined) {
    if (file) {
      assertUploadFileSize(file);
    }
    return file;
  }
}
