"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateUploadFileSizePipe = void 0;
const upload_limits_1 = require("./upload-limits");
class ValidateUploadFileSizePipe {
    transform(file) {
        if (file) {
            (0, upload_limits_1.assertUploadFileSize)(file);
        }
        return file;
    }
}
exports.ValidateUploadFileSizePipe = ValidateUploadFileSizePipe;
//# sourceMappingURL=validate-upload-file-size.pipe.js.map