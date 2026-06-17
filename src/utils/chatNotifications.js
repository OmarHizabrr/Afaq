/**
 * عنوان المحادثة للعرض — إنشاء الإشعارات يتم عبر Cloud Functions.
 */
export function conversationPartnerTitle(conversation, actorId, getUser) {
  if (!conversation) return '';
  if (conversation.isGroup) return conversation.title || 'مجموعة';
  const names = (conversation.participants || [])
    .filter((id) => id !== actorId)
    .map((id) => getUser(id)?.displayName || id);
  return names.join('، ') || 'محادثة';
}
