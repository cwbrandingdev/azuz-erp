export type WhatsAppBotNodeType =
  | 'message'
  | 'menu'
  | 'question'
  | 'ai'
  | 'handoff';

export type WhatsAppBotOption = {
  key: string;
  label: string;
  nextId?: string | null;
};

export type WhatsAppBotNode = {
  id: string;
  type: WhatsAppBotNodeType;
  text?: string;
  field?: string;
  options?: WhatsAppBotOption[];
  nextId?: string | null;
};

export type WhatsAppBotDefinition = {
  startId: string;
  nodes: WhatsAppBotNode[];
};

const NODE_TYPES = new Set<WhatsAppBotNodeType>([
  'message',
  'menu',
  'question',
  'ai',
  'handoff',
]);

export function defaultWhatsAppBotDefinition(): WhatsAppBotDefinition {
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

export function parseBotDefinition(raw: unknown): WhatsAppBotDefinition {
  if (!raw || typeof raw !== 'object') {
    return defaultWhatsAppBotDefinition();
  }
  const value = raw as Record<string, unknown>;
  const nodesRaw = Array.isArray(value.nodes) ? value.nodes : [];
  const nodes: WhatsAppBotNode[] = nodesRaw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => {
      const type = NODE_TYPES.has(item.type as WhatsAppBotNodeType)
        ? (item.type as WhatsAppBotNodeType)
        : 'message';
      const options = Array.isArray(item.options)
        ? item.options
            .filter(
              (option): option is Record<string, unknown> =>
                Boolean(option && typeof option === 'object'),
            )
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
  const startId =
    typeof value.startId === 'string' && nodes.some((node) => node.id === value.startId)
      ? value.startId
      : nodes[0].id;
  return { startId, nodes };
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? '';
  });
}

export function extractPlaceholders(
  template: string,
  vars: Record<string, string>,
): string[] {
  const keys = [...template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(
    (match) => match[1],
  );
  return [...new Set(keys)].map((key) => vars[key] ?? '');
}

export function wantsHumanHandoff(text: string): boolean {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return /(humano|atendente|pessoa|operador|falar com alguem)/.test(
    normalized,
  );
}
