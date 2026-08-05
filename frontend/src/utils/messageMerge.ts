import type { Message } from "../api/outreachApi";

export function mergeMessagesById(prev: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of prev) {
    if (m._id) byId.set(m._id, m);
  }
  for (const m of incoming) {
    if (m._id) byId.set(m._id, m);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
