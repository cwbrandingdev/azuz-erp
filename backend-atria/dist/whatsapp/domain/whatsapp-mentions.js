"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mentionSlug = mentionSlug;
exports.extractMentionTokens = extractMentionTokens;
exports.resolveMentionedUsers = resolveMentionedUsers;
function mentionSlug(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]+/g, '')
        .toLowerCase();
}
function extractMentionTokens(body) {
    return [...body.matchAll(/@([\p{L}\p{N}._-]+)/gu)].map((match) => match[1]);
}
function resolveMentionedUsers(body, members, actorId) {
    const hits = [];
    for (const token of extractMentionTokens(body)) {
        const needle = mentionSlug(token);
        if (!needle)
            continue;
        const matches = members.filter((member) => {
            const full = mentionSlug(member.name);
            const first = mentionSlug(member.name.split(/\s+/)[0] ?? '');
            return full === needle || first === needle;
        });
        const chosen = matches.find((member) => mentionSlug(member.name) === needle) ??
            (matches.length === 1 ? matches[0] : undefined);
        if (chosen && chosen.id !== actorId) {
            hits.push(chosen);
        }
    }
    return [...new Map(hits.map((item) => [item.id, item])).values()];
}
//# sourceMappingURL=whatsapp-mentions.js.map