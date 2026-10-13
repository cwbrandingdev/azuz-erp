export function mentionSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "")
    .toLowerCase();
}

export function mentionTokenFor(name: string, allNames: string[]) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  const firstSlug = mentionSlug(first);
  const clashes = allNames.filter(
    (item) => mentionSlug(item.trim().split(/\s+/)[0] ?? item) === firstSlug,
  );
  return clashes.length > 1 ? mentionSlug(name) : firstSlug;
}

export function activeMentionQuery(text: string) {
  const match = text.match(/(^|\s)@([\p{L}\p{N}._-]*)$/u);
  if (!match) return null;
  return match[2] ?? "";
}

export function insertMention(
  text: string,
  token: string,
): string {
  return text.replace(/(^|\s)@([\p{L}\p{N}._-]*)$/u, `$1@${token} `);
}
