import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Calendar, Send, MessageCircle, Users } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import FormModal from '../../components/FormModal';
import MessengerPanel from '../../components/MessengerPanel';
import RecipientUserCard from '../../components/RecipientUserCard';
import AppSelect from '../../components/AppSelect';
import BusyButton from '../../components/BusyButton';
import UnifiedMessageCard from '../../components/UnifiedMessageCard';
import useMediaQuery, { MOBILE_QUERY } from '../../hooks/useMediaQuery';
import usePushNotifications from '../../hooks/usePushNotifications';
import { getUserProfilePath } from '../../utils/profileLinks';

const ROLE_LABELS = {
  system_admin: t('pages.RegionDetailsPage.مدير_نظام_وصول_كامل', 'مدير نظام (وصول كامل)'),
  admin: t('pages.RegionDetailsPage.مدير_النظام', 'مدير النظام'),
  supervisor_arab: t('components.MessengerPanel.مشرف_عام', 'مشرف عام'),
  supervisor_local: t('components.MessengerPanel.مشرف_منطقة', 'مشرف منطقة'),
  teacher: t('components.MessengerPanel.معلم', 'معلم'),
  student: t('components.MessengerPanel.طالب', 'طالب'),
  unassigned: t('pages.NotificationsPage.غير_معين', 'غير معين'),
};
const RECIPIENT_ROLE_FILTER_ORDER = [
  'teacher',
  'supervisor_local',
  'supervisor_arab',
  'student',
  'admin',
  'system_admin',
  'unassigned',
  'all',
];

const NotificationsPage = ({ user }) => {
  const { t } = useAppTranslation();
  const location = useLocation();
  const actorId = user?.uid || user?.id;
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeRoleFilter, setComposeRoleFilter] = useState('all');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [chatRoleFilter, setChatRoleFilter] = useState('all');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatUsers, setNewChatUsers] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [markAllBusy, setMarkAllBusy] = useState(false);
  const markAllRunningRef = useRef(false);
  const [createChatBusy, setCreateChatBusy] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const isNarrow = useMediaQuery(MOBILE_QUERY);
  const [chatMobileMode, setChatMobileMode] = useState('list');
  const { needsEnable: needsPushEnable, busy: pushBusy, enable: enablePush } = usePushNotifications(user);

  useEffect(() => {
    const loadUsers = async () => {
      if (!actorId) return;
      setLoadingUsers(true);
      const api = FirestoreApi.Api;
      try {
        const userDocs = await api.getDocuments(api.getUsersCollection());
        setAllUsers(userDocs.map((d) => ({ id: d.id, ...d.data() })));
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, [actorId]);

  useEffect(() => {
    if (!actorId) return undefined;
    const api = FirestoreApi.Api;
    const q = api.getNotificationsInboxQuery(actorId);
    return api.subscribeSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setNotifications(rows);
      },
      (e) => console.error('notifications inbox', e)
    );
  }, [actorId]);

  useEffect(() => {
    if (!actorId) return undefined;
    const api = FirestoreApi.Api;
    const q = api.getConversationsInboxQuery(actorId);
    return api.subscribeSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        setConversations(rows);
      },
      (e) => console.error('conversations inbox', e)
    );
  }, [actorId]);

  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessages([]);
      return undefined;
    }
    const api = FirestoreApi.Api;
    const q = api.getConversationMessagesQuery(selectedConversation.id);
    return api.subscribeSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        setMessages(rows);
      },
      (err) => {
        console.error('messages snapshot', err);
        setMessages([]);
      }
    );
  }, [selectedConversation?.id]);

  /** قائمة المستلمين: جميع المستخدمين ما عدا الحساب الحالي (إشعارات ومحادثات جديدة). */
  const recipients = useMemo(() => {
    if (!actorId) return [];
    return allUsers.filter((u) => u.id !== actorId);
  }, [allUsers, actorId]);

  const recipientsMap = useMemo(() => Object.fromEntries(recipients.map((r) => [r.id, r])), [recipients]);
  const composeRecipients = useMemo(() => {
    if (composeRoleFilter === 'all') return recipients;
    return recipients.filter((u) => (u.role || 'unassigned') === composeRoleFilter);
  }, [recipients, composeRoleFilter]);
  const chatRecipients = useMemo(() => {
    if (chatRoleFilter === 'all') return recipients;
    return recipients.filter((u) => (u.role || 'unassigned') === chatRoleFilter);
  }, [recipients, chatRoleFilter]);
  const recipientRoleCounts = useMemo(() => {
    const counts = { all: recipients.length };
    recipients.forEach((u) => {
      const rid = u.role || 'unassigned';
      counts[rid] = (counts[rid] || 0) + 1;
    });
    return counts;
  }, [recipients]);

  const markAllRead = useCallback(async () => {
    if (markAllRunningRef.current || notifications.length === 0) return;
    const api = FirestoreApi.Api;
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    markAllRunningRef.current = true;
    setMarkAllBusy(true);
    try {
      await Promise.all(
        unread.map((n) => api.updateData({ docRef: api.getNotificationDoc(n.id), data: { isRead: true } }))
      );
    } finally {
      markAllRunningRef.current = false;
      setMarkAllBusy(false);
    }
  }, [notifications]);

  const markOneRead = useCallback((n) => {
    if (n.isRead) return;
    const api = FirestoreApi.Api;
    api.updateData({ docRef: api.getNotificationDoc(n.id), data: { isRead: true } });
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (selectedRecipientIds.length === 0 || !title.trim() || !body.trim() || !actorId) return;
    setSending(true);
    try {
      const api = FirestoreApi.Api;
      for (const recipientId of selectedRecipientIds) {
        const id = api.getNewId('notifications');
        const toUser = recipientsMap[recipientId];
        await api.setData({
          docRef: api.getNotificationDoc(id),
          data: {
            toUserId: recipientId,
            toUserName: toUser?.displayName || '',
            toUserRole: toUser?.role || '',
            toUserPhotoURL: toUser?.photoURL || '',
            fromUserId: actorId,
            fromUserName: user?.displayName || '',
            fromUserRole: user?.role || '',
            fromUserPhotoURL: user?.photoURL || '',
            title: title.trim(),
            body: body.trim(),
            type,
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        });
      }
      setIsComposeOpen(false);
      setSelectedRecipientIds([]);
      setTitle('');
      setBody('');
      setType('info');
    } finally {
      setSending(false);
    }
  };

  const openReply = (n) => {
    if (!n?.fromUserId || n.fromUserId === actorId) return;
    if (!recipientsMap[n.fromUserId]) return;
    setSelectedRecipientIds([n.fromUserId]);
    setTitle(`رد: ${n.title || ''}`);
    setBody('');
    setType('info');
    setIsComposeOpen(true);
  };

  const openConversation = useCallback((conversation) => {
    setSelectedConversation(conversation);
    setChatMobileMode('thread');
    setReplyTo(null);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatId = params.get('chat');
    if (!chatId || !actorId) return;
    setActiveTab('chats');
    const existing = conversations.find((c) => c.id === chatId);
    if (existing) {
      openConversation(existing);
      return;
    }
    const api = FirestoreApi.Api;
    api.getData(api.getConversationDoc(chatId)).then((doc) => {
      if (doc) openConversation({ id: chatId, ...doc });
    });
  }, [location.search, actorId, conversations, openConversation]);

  const openConversationFromNotification = useCallback(
    async (n) => {
      if (!n?.conversationId) return;
      markOneRead(n);
      setActiveTab('chats');
      const existing = conversations.find((c) => c.id === n.conversationId);
      if (existing) {
        openConversation(existing);
        return;
      }
      const api = FirestoreApi.Api;
      const doc = await api.getData(api.getConversationDoc(n.conversationId));
      if (doc) openConversation({ id: n.conversationId, ...doc });
    },
    [conversations, markOneRead, openConversation]
  );

  const createConversation = async (e) => {
    e.preventDefault();
    if (newChatUsers.length === 0 || !actorId || createChatBusy) return;
    setCreateChatBusy(true);
    try {
      const api = FirestoreApi.Api;
      const participants = [actorId, ...newChatUsers.filter((id) => id !== actorId)];
      const uniqueParticipants = Array.from(new Set(participants));
      let conversationId = '';

      if (uniqueParticipants.length === 2) {
        const q = api.getConversationsInboxQuery(actorId);
        const snap = await api.getDocuments(q);
        const existing = snap
          .map((d) => ({ id: d.id, ...d.data() }))
          .find(
            (c) =>
              Array.isArray(c.participants) &&
              c.participants.length === 2 &&
              uniqueParticipants.every((id) => c.participants.includes(id))
          );
        if (existing) conversationId = existing.id;
      }

      if (!conversationId) {
        conversationId = api.getNewId('conversations');
        await api.setData({
          docRef: api.getConversationDoc(conversationId),
          data: {
            participants: uniqueParticipants,
            isGroup: uniqueParticipants.length > 2,
            title: uniqueParticipants.length > 2 ? newChatTitle.trim() || t('pages.NotificationsPage.مجموعة_جديدة', 'مجموعة جديدة') : '',
            createdBy: actorId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }

      setIsNewChatOpen(false);
      setNewChatUsers([]);
      setNewChatTitle('');
      setActiveTab('chats');
      const convDoc = await api.getData(api.getConversationDoc(conversationId));
      if (convDoc) {
        openConversation({ id: conversationId, ...convDoc });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateChatBusy(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedConversation?.id || !messageText.trim()) return;
    setSendingMessage(true);
    const text = messageText.trim();
    try {
      const api = FirestoreApi.Api;
      const msgId = api.getNewId('messages');
      const payload = {
        senderId: actorId,
        senderName: user?.displayName || '',
        senderPhotoURL: user?.photoURL || '',
        senderRole: user?.role || '',
        text,
        createdAt: new Date().toISOString(),
      };
      if (replyTo) {
        payload.replyToId = replyTo.id;
        payload.replyToText = replyTo.text;
        payload.replyToSenderId = replyTo.senderId || '';
        payload.replyToSenderName =
          replyTo.senderId === actorId ? t('components.MessengerPanel.أنت', 'أنت') : replyTo.senderName || '';
      }
      await api.setData({
        docRef: api.getConversationMessageDoc(selectedConversation.id, msgId),
        data: payload,
      });
      await api.updateData({
        docRef: api.getConversationDoc(selectedConversation.id),
        data: {
          lastMessage: text,
          lastSenderId: actorId,
          updatedAt: new Date().toISOString(),
        },
      });
      setMessageText('');
      setReplyTo(null);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEditMessage = async (messageId, text) => {
    if (!selectedConversation?.id) return;
    const api = FirestoreApi.Api;
    await api.updateData({
      docRef: api.getConversationMessageDoc(selectedConversation.id, messageId),
      data: { text, editedAt: new Date().toISOString() },
    });
  };

  if (!actorId) return null;
  if (loadingUsers) return <div className="loading-spinner page-loading-lg" />;

  return (
    <div
      className={`notifications-page${isNarrow ? ' notifications-page--mobile' : ''}${activeTab === 'chats' ? ' notifications-page--chat-focus' : ''}${activeTab === 'chats' && isNarrow && chatMobileMode === 'thread' ? ' notifications-page--chat-thread' : ''}`}
    >
      <PageHeader
        icon={Bell}
        iconBox
        title={t('pages.NotificationsPage.مركز_الإشعارات_والتنبيهات', 'مركز الإشعارات والتنبيهات')}
        subtitle={isNarrow ? undefined : t('pages.NotificationsPage.تحديث_فوري_للإشعارات_والمحادثات', 'تحديث فوري للإشعارات والمحادثات')}
      >
        <div className="notifications-page__tabs">
          <button
            type="button"
            className={`btn-md ${activeTab === 'notifications' ? 'btn-md--primary' : 'btn-md--outline'}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={16} /> {t('config.appNavItems.الإشعارات', 'الإشعارات')}
          </button>
          <button
            type="button"
            className={`btn-md ${activeTab === 'chats' ? 'btn-md--primary' : 'btn-md--outline'}`}
            onClick={() => setActiveTab('chats')}
          >
            <MessageCircle size={16} /> المحادثات
          </button>
        </div>
        <div className="notifications-page__toolbar">
        {recipients.length > 0 && (
          <button type="button" className="btn-md btn-md--outline" onClick={() => { setIsNewChatOpen(true); setChatRoleFilter('all'); }}>
            <Users size={16} /> {t('components.MessengerPanel.محادثة_جديدة', 'محادثة جديدة')}
          </button>
        )}
        {recipients.length > 0 && (
          <button type="button" className="btn-md btn-md--primary" onClick={() => { setIsComposeOpen(true); setComposeRoleFilter('all'); }}>
            <Send size={16} /> إرسال إشعار
          </button>
        )}
        {notifications.some((n) => !n.isRead) && (
          <BusyButton type="button" busy={markAllBusy} onClick={markAllRead} className="btn-md btn-md--outline">
            تعليم الكل كمقروء
          </BusyButton>
        )}
        </div>
      </PageHeader>

      {needsPushEnable && (
        <div className="notifications-push-prompt" role="region" aria-label={t('components.PushNotificationBanner.تفعيل_الإشعارات', 'تفعيل الإشعارات')}>
          <div className="notifications-push-prompt__text">
            <strong>فعّل إشعارات الجهاز</strong>
            <span>لتصلك المحادثات والتنبيهات فوراً حتى عند إغلاق التطبيق</span>
          </div>
          <button
            type="button"
            className="btn-md btn-md--primary"
            onClick={enablePush}
            disabled={pushBusy}
          >
            {pushBusy ? t('pages.NotificationsPage.جاري_التفعيل', 'جاري التفعيل…') : t('pages.NotificationsPage.تفعيل_الآن', 'تفعيل الآن')}
          </button>
        </div>
      )}

      {activeTab === 'notifications' ? (
        <div className="notif-list-stack">
          {notifications.length === 0 ? (
            <div className="surface-card surface-card--lg notifications-page__empty">
              <Bell size={48} className="notifications-page__empty-icon" aria-hidden />
              <p className="notifications-page__empty-text">لا توجد إشعارات جديدة بانتظارك.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => markOneRead(n)}
                onKeyDown={(e) => e.key === 'Enter' && markOneRead(n)}
                className={`notif-card ${n.isRead ? 'notif-card--read' : 'notif-card--unread'}`}
              >
                <UnifiedMessageCard
                  className="unified-msg-card--notif-inline"
                  type={['warning', 'success', 'error'].includes(n.type) ? n.type : 'info'}
                  unread={!n.isRead}
                  title={n.title}
                  meta={
                    <>
                      <img
                        src={n.fromUserPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.fromUserName || 'User')}`}
                        alt=""
                        className="notif-sender-avatar"
                      />
                      <span className="notif-sender-name">{n.fromUserName || t('pages.NotificationsPage.مرسل_غير_معروف', 'مرسل غير معروف')}</span>
                      <span className="notif-sender-role">
                        {ROLE_LABELS[n.fromUserRole] || n.fromUserRole || t('pages.NotificationsPage.بدون_دور', 'بدون دور')}
                      </span>
                    </>
                  }
                  body={n.body}
                  timestamp={
                    <>
                      <Calendar size={14} className="notif-timestamp-icon" aria-hidden /> {n.createdAt ? new Date(n.createdAt).toLocaleString('ar-EG') : '-'}
                    </>
                  }
                  footer={
                    <div className="notif-card__actions">
                      {n.conversationId && (
                        <button
                          type="button"
                          className="btn-md btn-md--primary btn-md--compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            openConversationFromNotification(n);
                          }}
                        >
                          فتح المحادثة
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-md btn-md--outline btn-md--compact"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReply(n);
                        }}
                        disabled={!n.fromUserId || n.fromUserId === actorId || !recipientsMap[n.fromUserId]}
                      >
                        {t('components.MessengerPanel.رد', 'رد')}
                      </button>
                    </div>
                  }
                />

                {!n.isRead && <div className="notif-card__unread-dot" aria-hidden />}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="surface-card messenger-page-card">
          <MessengerPanel
            actorId={actorId}
            actorPhotoURL={user?.photoURL || ''}
            actorDisplayName={user?.displayName || ''}
            allUsers={allUsers}
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={openConversation}
            onBackList={() => setChatMobileMode('list')}
            hideListColumnSm={isNarrow && chatMobileMode === 'thread'}
            hideThreadColumnSm={isNarrow && chatMobileMode === 'list'}
            messages={messages}
            messageText={messageText}
            setMessageText={setMessageText}
            onSendMessage={sendMessage}
            sendingMessage={sendingMessage}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            onEditMessage={handleEditMessage}
            onNewChat={() => {
              setIsNewChatOpen(true);
              setChatRoleFilter('all');
            }}
          />
        </div>
      )}

      <FormModal open={isComposeOpen} title={t('pages.NotificationsPage.إرسال_إشعار_جديد', 'إرسال إشعار جديد')} onClose={() => setIsComposeOpen(false)}>
        <form onSubmit={handleSend} className="notifications-modal-form">
          <label className="app-label">المستلمون</label>
          <div className="notifications-modal__pick-toolbar">
            <button
              type="button"
              className="btn-md btn-md--outline btn-md--compact"
              onClick={() => setSelectedRecipientIds(composeRecipients.map((u) => u.id))}
            >
              تحديد الكل
            </button>
            <button
              type="button"
              className="btn-md btn-md--outline btn-md--compact"
              onClick={() => setSelectedRecipientIds([])}
            >
              إلغاء التحديد
            </button>
          </div>
          <div className="role-filter-bar notifications-modal__filters">
            {RECIPIENT_ROLE_FILTER_ORDER.map((rid) => (
              <button
                key={`compose-${rid}`}
                type="button"
                className={`role-filter-btn ${composeRoleFilter === rid ? 'role-filter-btn--active' : ''}`}
                onClick={() => setComposeRoleFilter(rid)}
              >
                {(rid === 'all' ? t('pages.RegionDetailsPage.الكل', 'الكل') : ROLE_LABELS[rid] || rid)} ({recipientRoleCounts[rid] || 0})
              </button>
            ))}
          </div>
          <div className="modal-scroll-box notifications-modal__scroll">
            {composeRecipients.map((u) => (
              <RecipientUserCard
                key={u.id}
                user={u}
                checked={selectedRecipientIds.includes(u.id)}
                onToggle={(next) =>
                  setSelectedRecipientIds((prev) => {
                    if (next) return prev.includes(u.id) ? prev : [...prev, u.id];
                    return prev.filter((id) => id !== u.id);
                  })
                }
                profileHref={getUserProfilePath(location.pathname, u.id)}
                roleLabel={ROLE_LABELS[u.role] || u.role || ''}
              />
            ))}
          </div>
          <label className="app-label">نوع الرسالة</label>
          <AppSelect className="app-select notifications-modal__field" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="info">معلومة</option>
            <option value="success">نجاح</option>
            <option value="warning">تنبيه</option>
          </AppSelect>
          <label className="app-label">{t('utils.schoolReportExport.العنوان', 'العنوان')}</label>
          <input className="app-input notifications-modal__field" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="app-label">المحتوى</label>
          <textarea className="app-textarea notifications-modal__field notifications-modal__field--last" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="modal-footer-actions">
            <button type="button" className="google-btn modal-footer-actions__btn" onClick={() => setIsComposeOpen(false)}>
              {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
            </button>
            <BusyButton
              type="submit"
              busy={sending}
              className="google-btn google-btn--filled modal-footer-actions__btn"
            >
              {t('components.MessengerPanel.إرسال', 'إرسال')}
            </BusyButton>
          </div>
        </form>
      </FormModal>

      <FormModal open={isNewChatOpen} title={t('pages.NotificationsPage.إنشاء_محادثة', 'إنشاء محادثة')} onClose={() => setIsNewChatOpen(false)}>
        <form onSubmit={createConversation} className="notifications-modal-form">
          <label className="app-label">العنوان (اختياري للجروب)</label>
          <input className="app-input notifications-modal__field" value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} />
          <label className="app-label">الأعضاء</label>
          <div className="notifications-modal__pick-toolbar">
            <button
              type="button"
              className="btn-md btn-md--outline btn-md--compact"
              onClick={() => setNewChatUsers(chatRecipients.map((u) => u.id))}
            >
              تحديد الكل
            </button>
            <button
              type="button"
              className="btn-md btn-md--outline btn-md--compact"
              onClick={() => setNewChatUsers([])}
            >
              إلغاء التحديد
            </button>
          </div>
          <div className="role-filter-bar notifications-modal__filters">
            {RECIPIENT_ROLE_FILTER_ORDER.map((rid) => (
              <button
                key={`chat-${rid}`}
                type="button"
                className={`role-filter-btn ${chatRoleFilter === rid ? 'role-filter-btn--active' : ''}`}
                onClick={() => setChatRoleFilter(rid)}
              >
                {(rid === 'all' ? t('pages.RegionDetailsPage.الكل', 'الكل') : ROLE_LABELS[rid] || rid)} ({recipientRoleCounts[rid] || 0})
              </button>
            ))}
          </div>
          <div className="modal-scroll-box notifications-modal__scroll notifications-modal__scroll--lg">
            {chatRecipients.map((u) => (
              <RecipientUserCard
                key={u.id}
                user={u}
                checked={newChatUsers.includes(u.id)}
                onToggle={(next) =>
                  setNewChatUsers((prev) => {
                    if (next) return prev.includes(u.id) ? prev : [...prev, u.id];
                    return prev.filter((id) => id !== u.id);
                  })
                }
                profileHref={getUserProfilePath(location.pathname, u.id)}
                roleLabel={ROLE_LABELS[u.role] || u.role || ''}
              />
            ))}
          </div>
          <div className="modal-footer-actions">
            <button type="button" className="google-btn modal-footer-actions__btn" onClick={() => setIsNewChatOpen(false)}>
              {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
            </button>
            <BusyButton
              type="submit"
              busy={createChatBusy}
              className="google-btn google-btn--filled modal-footer-actions__btn"
            >
              بدء المحادثة
            </BusyButton>
          </div>
        </form>
      </FormModal>
    </div>
  );
};

export default NotificationsPage;
