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
var InstagramPublishSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramPublishSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const instagram_publishing_service_1 = require("./instagram-publishing.service");
const SAO_PAULO_TZ = 'America/Sao_Paulo';
let InstagramPublishSchedulerService = InstagramPublishSchedulerService_1 = class InstagramPublishSchedulerService {
    publishing;
    logger = new common_1.Logger(InstagramPublishSchedulerService_1.name);
    constructor(publishing) {
        this.publishing = publishing;
    }
    async handleScheduledInstagramPosts() {
        try {
            await this.publishing.processDuePosts();
        }
        catch (error) {
            this.logger.warn(`Instagram publish scheduler error: ${String(error)}`);
        }
    }
};
exports.InstagramPublishSchedulerService = InstagramPublishSchedulerService;
__decorate([
    (0, schedule_1.Cron)('* * * * *', { timeZone: SAO_PAULO_TZ }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InstagramPublishSchedulerService.prototype, "handleScheduledInstagramPosts", null);
exports.InstagramPublishSchedulerService = InstagramPublishSchedulerService = InstagramPublishSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [instagram_publishing_service_1.InstagramPublishingService])
], InstagramPublishSchedulerService);
//# sourceMappingURL=instagram-publish-scheduler.service.js.map