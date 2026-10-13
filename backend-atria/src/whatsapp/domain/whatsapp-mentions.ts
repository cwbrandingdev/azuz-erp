export function mentionSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, '')
    .toLowerCase();
}

export function extractMentionTokens(body: string): string[] {
  return [...body.matchAll(/@([\p{L}\p{N}._-]+)/gu)].map((match) => match[1]);
}

export function resolveMentionedUsers<T extends { id: string; name: string }>(
  body: string,
  members: T[],
  actorId?: string,
): T[] {
  const hits: T[] = [];
  for (const token of extractMentionTokens(body)) {
    const needle = mentionSlug(token);
    if (!needle) continue;
    const matches = members.filter((member) => {
      const full = mentionSlug(member.name);
      const first = mentionSlug(member.name.split(/\s+/)[0] ?? '');
      return full === needle || first === needle;
    });
    const chosen =
      matches.find((member) => mentionSlug(member.name) === needle) ??
      (matches.length === 1 ? matches[0] : undefined);
    if (chosen && chosen.id !== actorId) {
      hits.push(chosen);
    }
  }
  return [...new Map(hits.map((item) => [item.id, item])).values()];
}
