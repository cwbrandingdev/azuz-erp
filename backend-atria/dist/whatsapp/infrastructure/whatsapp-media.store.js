"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppMediaStore = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const MIME_EXT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/amr': '.amr',
    'video/mp4': '.mp4',
    'application/pdf': '.pdf',
};
let WhatsAppMediaStore = class WhatsAppMediaStore {
    dir = (0, path_1.join)(process.cwd(), 'uploads', 'whatsapp');
    constructor() {
        if (!(0, fs_1.existsSync)(this.dir)) {
            (0, fs_1.mkdirSync)(this.dir, { recursive: true });
        }
    }
    save(buffer, filename, mimeType) {
        const ext = (filename ? (0, path_1.extname)(filename) : '') ||
            (mimeType ? MIME_EXT[mimeType.split(';')[0].trim()] : '') ||
            '';
        const stored = `${(0, crypto_1.randomUUID)()}${ext}`;
        (0, fs_1.writeFileSync)((0, path_1.join)(this.dir, stored), buffer);
        return {
            url: `/uploads/whatsapp/${stored}`,
            absolutePath: (0, path_1.join)(this.dir, stored),
            filename: filename?.trim() || stored,
            mimeType: mimeType ?? null,
        };
    }
    resolvePath(url) {
        if (!url.startsWith('/uploads/whatsapp/'))
            return null;
        const name = url.slice('/uploads/whatsapp/'.length);
        if (!name || name.includes('..') || name.includes('/'))
            return null;
        return (0, path_1.join)(this.dir, name);
    }
};
exports.WhatsAppMediaStore = WhatsAppMediaStore;
exports.WhatsAppMediaStore = WhatsAppMediaStore = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WhatsAppMediaStore);
//# sourceMappingURL=whatsapp-media.store.js.map