"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateTaskPublishReadiness = evaluateTaskPublishReadiness;
exports.humanizeMetaPublishError = humanizeMetaPublishError;
const client_1 = require("@prisma/client");
const meta_schedule_1 = require("./meta-schedule");
function evaluateTaskPublishReadiness(input) {
    const blockers = [];
    const warnings = [];
    if (!input.clientId) {
        blockers.push({
            code: 'no_client',
            message: 'Vincule um cliente à tarefa',
        });
    }
    else if (!input.clientHasInstagram) {
        blockers.push({
            code: 'no_instagram_account',
            message: 'Cliente sem Instagram conectado (OAuth ou ID + token em Clientes)',
        });
    }
    else if (!input.clientHasMetaToken) {
        blockers.push({
            code: 'no_meta_token',
            message: 'Token Meta ausente — reconecte o Instagram em Clientes',
        });
    }
    if (input.media.length === 0) {
        blockers.push({
            code: 'no_media',
            message: 'Anexe pelo menos uma imagem ou vídeo nas entregas',
        });
    }
    if (input.format === client_1.ContentPostFormat.CAROUSEL && input.imageCount < 2) {
        blockers.push({
            code: 'carousel_images',
            message: 'Carrossel exige pelo menos 2 imagens',
        });
    }
    if (input.format === client_1.ContentPostFormat.REELS && input.videoCount === 0) {
        blockers.push({
            code: 'video_required',
            message: 'Reels exige um vídeo (MP4/MOV)',
        });
    }
    if (input.format === client_1.ContentPostFormat.STORY &&
        input.videoCount === 0 &&
        input.imageCount === 0 &&
        input.media.length > 0) {
        blockers.push({
            code: 'story_media',
            message: 'Story requer imagem ou vídeo compatível',
        });
    }
    if (!input.publicationDate) {
        blockers.push({
            code: 'no_publication_date',
            message: 'Defina a data de publicação da tarefa',
        });
    }
    else {
        const schedule = (0, meta_schedule_1.resolveMetaPublishAt)(input.publicationDate);
        const isStory = input.format === client_1.ContentPostFormat.STORY;
        if (isStory && schedule.publishAtUnix != null) {
            blockers.push({
                code: 'story_not_schedulable',
                message: 'Stories não podem ser agendados para o futuro — use data imediata ou Publicar agora',
            });
        }
        else if (!isStory && schedule.error) {
            blockers.push({
                code: 'invalid_schedule_window',
                message: schedule.error,
            });
        }
        if (schedule.publishAtUnix == null && input.publicationDate.getTime() < Date.now()) {
            warnings.push({
                code: 'publication_date_past',
                message: 'A data de publicação já passou; após aprovação o post pode ser publicado imediatamente',
            });
        }
    }
    for (const item of input.media) {
        if (!item.url.trim().toLowerCase().startsWith('https://')) {
            warnings.push({
                code: 'media_not_https',
                message: 'A Meta exige URL pública HTTPS para a mídia — confira o upload no storage',
            });
            break;
        }
    }
    if (input.mediaUrlReachable === false) {
        blockers.push({
            code: 'media_unreachable',
            message: 'A Meta não conseguiu acessar a URL da mídia — verifique se o link é público',
        });
    }
    return {
        ready: blockers.length === 0,
        blockers,
        warnings,
    };
}
function humanizeMetaPublishError(message) {
    const lower = message.toLowerCase();
    if (lower.includes('token') &&
        (lower.includes('expir') || lower.includes('invalid') || lower.includes('190'))) {
        return 'Token do Meta expirado ou inválido. Reconecte o Instagram em Clientes.';
    }
    if (lower.includes('oauth') || lower.includes('permission')) {
        return 'Permissão Meta insuficiente. Reconecte o Instagram e confira os escopos do app.';
    }
    return message;
}
//# sourceMappingURL=meta-publish-readiness.js.map