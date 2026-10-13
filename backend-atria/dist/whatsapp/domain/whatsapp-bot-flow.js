"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultWhatsAppBotDefinition = defaultWhatsAppBotDefinition;
exports.parseBotDefinition = parseBotDefinition;
exports.interpolateTemplate = interpolateTemplate;
exports.extractPlaceholders = extractPlaceholders;
exports.wantsHumanHandoff = wantsHumanHandoff;
const NODE_TYPES = new Set([
    'message',
    'menu',
    'question',
    'ai',
    'handoff',
]);
function defaultWhatsAppBotDefinition() {
    return {
        startId: 'welcome',
        nodes: [
            {
                id: 'welcome',
                type: 'message',
                text: 'Olá{{primeiro_nome}}! Sou o assistente virtual. Como posso ajudar?',
                nextId: 'menu',
            },
            {
                id: 'menu',
                type: 'menu',
                text: 'Escolha uma opção:',
                options: [
                    { key: '1', label: 'Quero saber mais', nextId: 'ask_name' },
                    { key: '2', label: 'Já sou cliente', nextId: 'handoff' },
                    { key: '3', label: 'Falar com atendente', nextId: 'handoff' },
                ],
            },
            {
                id: 'ask_name',
                type: 'question',
                text: 'Qual o seu nome?',
                field: 'nome',
                nextId: 'ask_need',
            },
            {
                id: 'ask_need',
                type: 'question',
                text: 'O que você precisa hoje?',
                field: 'necessidade',
                nextId: 'ai',
            },
            {
                id: 'ai',
                type: 'ai',
                text: 'Vou analisar seu pedido e já te respondo.',
                nextId: 'handoff',
            },
            {
                id: 'handoff',
                type: 'handoff',
                text: 'Vou te transferir para um atendente. Um momento!',
            },
        ],
    };
}
function parseBotDefinition(raw) {
    if (!raw || typeof raw !== 'object') {
        return defaultWhatsAppBotDefinition();
    }
    const value = raw;
    const nodesRaw = Array.isArray(value.nodes) ? value.nodes : [];
    const nodes = nodesRaw
        .filter((item) => Boolean(item && typeof item === 'object'))
        .map((item, index) => {
        const type = NODE_TYPES.has(item.type)
            ? item.type
            : 'message';
        const options = Array.isArray(item.options)
            ? item.options
                .filter((option) => Boolean(option && typeof option === 'object'))
                .map((option, optionIndex) => ({
                key: String(option.key ?? optionIndex + 1),
                label: String(option.label ?? option.key ?? optionIndex + 1),
                nextId: option.nextId ? String(option.nextId) : null,
            }))
            : [];
        return {
            id: String(item.id ?? `step_${index + 1}`),
            type,
            text: item.text != null ? String(item.text) : '',
            field: item.field ? String(item.field) : undefined,
            options,
            nextId: item.nextId ? String(item.nextId) : null,
        };
    });
    if (nodes.length === 0) {
        return defaultWhatsAppBotDefinition();
    }
    const startId = typeof value.startId === 'string' && nodes.some((node) => node.id === value.startId)
        ? value.startId
        : nodes[0].id;
    return { startId, nodes };
}
function interpolateTemplate(template, vars) {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
        return vars[key] ?? '';
    });
}
function extractPlaceholders(template, vars) {
    const keys = [...template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((match) => match[1]);
    return [...new Set(keys)].map((key) => vars[key] ?? '');
}
function wantsHumanHandoff(text) {
    const normalized = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    return /(humano|atendente|pessoa|operador|falar com alguem)/.test(normalized);
}
//# sourceMappingURL=whatsapp-bot-flow.js.map