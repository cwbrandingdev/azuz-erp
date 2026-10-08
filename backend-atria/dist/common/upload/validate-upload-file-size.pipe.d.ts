import { PipeTransform } from '@nestjs/common';
export declare class ValidateUploadFileSizePipe implements PipeTransform {
    transform(file: Express.Multer.File | undefined): Express.Multer.File | undefined;
}
