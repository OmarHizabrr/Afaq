const DAY_MS = 86400000;

function toDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function sameCalendarDay(a, b) {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return false;
  return startOfDay(da).getTime() === startOfDay(db).getTime();
}

export function formatMessageTime(iso) {
  const d = toDate(iso);
  if (!d) return '';
  return d.toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

export function formatThreadTime(iso) {
  const d = toDate(iso);
  if (!d) return '';
  const now = new Date();
  const diff = startOfDay(now).getTime() - startOfDay(d).getTime();
  if (diff === 0) return formatMessageTime(iso);
  if (diff === DAY_MS) return 'أمس';
  if (diff < 7 * DAY_MS) {
    return d.toLocaleString('ar-EG', { weekday: 'short' });
  }
  return d.toLocaleString('ar-EG', { day: 'numeric', month: 'short' });
}

export function formatDateSeparator(iso) {
  const d = toDate(iso);
  if (!d) return '';
  const now = new Date();
  const diff = startOfDay(now).getTime() - startOfDay(d).getTime();
  if (diff === 0) return 'اليوم';
  if (diff === DAY_MS) return 'أمس';
  return d.toLocaleString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function buildMessageTimeline(messages) {
  const items = [];
  let lastDateKey = '';

  messages.forEach((m, index) => {
    const d = toDate(m.createdAt);
    const dateKey = d ? startOfDay(d).toISOString() : '';
    if (dateKey && dateKey !== lastDateKey) {
      items.push({ kind: 'date', id: `date-${dateKey}`, label: formatDateSeparator(m.createdAt) });
      lastDateKey = dateKey;
    }

    const prev = messages[index - 1];
    const next = messages[index + 1];
    const groupedWithPrev =
      prev &&
      prev.senderId === m.senderId &&
      sameCalendarDay(prev.createdAt, m.createdAt) &&
      toDate(m.createdAt) &&
      toDate(prev.createdAt) &&
      toDate(m.createdAt).getTime() - toDate(prev.createdAt).getTime() < 5 * 60 * 1000;
    const groupedWithNext =
      next &&
      next.senderId === m.senderId &&
      sameCalendarDay(next.createdAt, m.createdAt) &&
      toDate(m.createdAt) &&
      toDate(next.createdAt) &&
      toDate(next.createdAt).getTime() - toDate(m.createdAt).getTime() < 5 * 60 * 1000;

    items.push({
      kind: 'message',
      id: m.id,
      message: m,
      isFirstInGroup: !groupedWithPrev,
      isLastInGroup: !groupedWithNext,
    });
  });

  return items;
}
