import { ValidationError } from 'class-validator';

const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  name: 'Nome',
  email: 'E-mail',
  password: 'Senha',
  phone: 'Telefone',
  description: 'Descrição',
  cnpj: 'CNPJ',
  clientId: 'Cliente',
  leadId: 'Lead',
  status: 'Status',
  priority: 'Prioridade',
  content: 'Conteúdo',
  dueDate: 'Data',
  startAt: 'Data e hora',
  guestName: 'Nome do participante',
  guestEmails: 'E-mails dos convidados',
};

type MessageBuilder = (label: string, original: string) => string;

// O limite (255, 10...) só existe no texto original em inglês; o último número dele é o limite.
function lastNumber(original: string): string {
  const matches = original.match(/-?\d+(?:\.\d+)?/g);
  return matches ? matches[matches.length - 1] : '';
}

const CONSTRAINT_MESSAGES: Record<string, MessageBuilder> = {
  isNotEmpty: (label) => `${label}: preencha este campo.`,
  isDefined: (label) => `${label}: preencha este campo.`,
  isString: (label) => `${label}: deve ser um texto.`,
  isEmail: (label) => `${label}: informe um e-mail válido.`,
  isInt: (label) => `${label}: informe um número inteiro.`,
  isNumber: (label) => `${label}: informe um número válido.`,
  min: (label, original) =>
    `${label}: o valor mínimo é ${lastNumber(original)}.`,
  max: (label, original) =>
    `${label}: o valor máximo é ${lastNumber(original)}.`,
  minLength: (label, original) =>
    `${label}: use pelo menos ${lastNumber(original)} caracteres.`,
  maxLength: (label, original) =>
    `${label}: use no máximo ${lastNumber(original)} caracteres.`,
  isEnum: (label) => `${label}: escolha uma das opções disponíveis.`,
  isUUID: (label) => `${label}: identificador inválido.`,
  isBoolean: (label) => `${label}: deve ser sim ou não.`,
  isArray: (label) => `${label}: deve ser uma lista.`,
  arrayNotEmpty: (label) => `${label}: inclua pelo menos um item.`,
  arrayMaxSize: (label, original) =>
    `${label}: no máximo ${lastNumber(original)} itens.`,
  isDateString: (label) => `${label}: informe uma data válida.`,
  isDate: (label) => `${label}: informe uma data válida.`,
  isUrl: (label) => `${label}: informe um link válido.`,
  matches: (label) => `${label}: formato inválido.`,
  whitelistValidation: (label) => `${label}: campo não aceito.`,
};

function labelFor(path: string[]): string {
  return path
    .map((segment) =>
      /^\d+$/.test(segment)
        ? `item ${Number(segment) + 1}`
        : (FIELD_LABELS[segment] ?? segment),
    )
    .join(' › ');
}

function collect(
  errors: ValidationError[],
  parents: string[],
  messages: string[],
): void {
  for (const error of errors) {
    const path = [...parents, error.property];
    const label = labelFor(path);

    for (const [constraint, original] of Object.entries(
      error.constraints ?? {},
    )) {
      const build = CONSTRAINT_MESSAGES[constraint];
      messages.push(
        build ? build(label, original) : `${label}: valor inválido.`,
      );
    }

    if (error.children?.length) collect(error.children, path, messages);
  }
}

export function translateValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  collect(errors, [], messages);
  return messages;
}
