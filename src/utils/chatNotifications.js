/**
 * عنوان المحادثة للعرض — إنشاء الإشعارات يتم عبر Cloud Functions.
 */
import translate from '../i18n/translate';

export function conversationPartnerTitle(conversation, actorId, getUser, t = translate) {
  if (!conversation) return '';
  if (conversation.isGroup) {
    return conversation.title || t('utils.chatNotifications.مجموعة', 'مجموعة');
  }
  const names = (conversation.participants || [])
    .filter((id) => id !== actorId)
    .map((id) => getUser(id)?.displayName || id);
  return names.join('، ') || t('utils.chatNotifications.محادثة', 'محادثة');
}
