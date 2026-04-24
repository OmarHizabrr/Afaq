import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Info, AlertTriangle, CheckCircle, Calendar, Send, MessageCircle, Users } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import FormModal from '../../components/FormModal';
import MessengerPanel from '../../components/MessengerPanel';
import RecipientUserCard from '../../components/RecipientUserCard';
import AppSelect from '../../components/AppSelect';
import { getUserProfilePath } from '../../utils/profileLinks';

const ROLE_LABELS = {
  admin: 'مدير النظام',
  supervisor_arab: 'مشرف عام',
  supervisor_local: 'مشرف منطقة',
  teacher: 'معلم',
  student: 'طالب',
  unassigned: 'غير معين',
};

const NotificationsPage = ({ user }) => {
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
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatUsers, setNewChatUsers] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);
  const [chatMobileMode, setChatMobileMode] = useState('list');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const fn = () => setIsNarrow(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

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

  const getIcon = (t) => {
    switch (t) {
      case 'warning':
        return <AlertTriangle size={20} color="#f59e0b" />;
      case 'success':
        return <CheckCircle size={20} color="var(--success-color)" />;
      default:
        return <Info size={20} color="var(--md-primary)" />;
    }
  };

  const markAllRead = useCallback(() => {
    const api = FirestoreApi.Api;
    notifications.forEach((n) => {
      if (!n.isRead) {
        api.updateData({ docRef: api.getNotificationDoc(n.id), data: { isRead: true } });
      }
    });
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

  const createConversation = async (e) => {
    e.preventDefault();
    if (newChatUsers.length === 0 || !actorId) return;
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
          title: uniqueParticipants.length > 2 ? newChatTitle.trim() || 'مجموعة جديدة' : '',
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
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedConversation?.id || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      const api = FirestoreApi.Api;
      const msgId = api.getNewId('messages');
      const payload = {
        senderId: actorId,
        senderName: user?.displayName || '',
        senderPhotoURL: user?.photoURL || '',
        senderRole: user?.role || '',
        text: messageText.trim(),
        createdAt: new Date().toISOString(),
      };
      if (replyTo) {
        payload.replyToId = replyTo.id;
        payload.replyToText = replyTo.text;
        payload.replyToSenderId = replyTo.senderId || '';
        payload.replyToSenderName =
          replyTo.senderId === actorId ? 'أنت' : replyTo.senderName || '';
      }
      await api.setData({
        docRef: api.getConversationMessageDoc(selectedConversation.id, msgId),
        data: payload,
      });
      await api.updateData({
        docRef: api.getConversationDoc(selectedConversation.id),
        data: {
          lastMessage: messageText.trim(),
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
  if (loadingUsers) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;

  return (
    <div className="notifications-page">
      <PageHeader
        icon={Bell}
        iconBox
        title="مركز الإشعارات والتنبيهات"
        subtitle="تحديث فوري للإشعارات والمحادثات"
      >
        <button
          type="button"
          className={`btn-md ${activeTab === 'notifications' ? 'btn-md--primary' : 'btn-md--outline'}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} /> الإشعارات
        </button>
        <button
          type="button"
          className={`btn-md ${activeTab === 'chats' ? 'btn-md--primary' : 'btn-md--outline'}`}
          onClick={() => setActiveTab('chats')}
        >
          <MessageCircle size={16} /> المحادثات
        </button>
        {recipients.length > 0 && (
          <button type="button" className="btn-md btn-md--outline" onClick={() => setIsNewChatOpen(true)}>
            <Users size={16} /> محادثة جديدة
          </button>
        )}
        {recipients.length > 0 && (
          <button type="button" className="btn-md btn-md--primary" onClick={() => setIsComposeOpen(true)}>
            <Send size={16} /> إرسال إشعار
          </button>
        )}
        {notifications.some((n) => !n.isRead) && (
          <button type="button" onClick={markAllRead} className="btn-md btn-md--outline">
            تعليم الكل كمقروء
          </button>
        )}
      </PageHeader>

      {activeTab === 'notifications' ? (
        <div className="notif-list-stack">
          {notifications.length === 0 ? (
            <div className="surface-card surface-card--lg" style={{ textAlign: 'center', padding: '5rem' }}>
              <Bell size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>لا توجد إشعارات جديدة بانتظارك.</p>
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
                <div className="notif-card__icon" aria-hidden>
                  {getIcon(n.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: n.isRead ? 'var(--text-primary)' : 'var(--md-primary)',
                      }}
                    >
                      {n.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={14} /> {n.createdAt ? new Date(n.createdAt).toLocaleString('ar-EG') : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <img
                      src={n.fromUserPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.fromUserName || 'User')}`}
                      alt=""
                      style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border-color)' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{n.fromUserName || 'مرسل غير معروف'}</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-color)',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {ROLE_LABELS[n.fromUserRole] || n.fromUserRole || 'بدون دور'}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>{n.body}</p>
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-md btn-md--outline"
                      style={{ minHeight: 32, fontSize: '0.8rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openReply(n);
                      }}
                      disabled={!n.fromUserId || n.fromUserId === actorId || !recipientsMap[n.fromUserId]}
                    >
                      رد
                    </button>
                  </div>
                </div>

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
          />
        </div>
      )}

      <FormModal open={isComposeOpen} title="إرسال إشعار جديد" onClose={() => setIsComposeOpen(false)}>
        <form onSubmit={handleSend}>
          <label className="app-label">المستلمون</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button
              type="button"
              className="btn-md btn-md--outline"
              style={{ minHeight: 32, fontSize: '0.8rem' }}
              onClick={() => setSelectedRecipientIds(recipients.map((u) => u.id))}
            >
              تحديد الكل
            </button>
            <button
              type="button"
              className="btn-md btn-md--outline"
              style={{ minHeight: 32, fontSize: '0.8rem' }}
              onClick={() => setSelectedRecipientIds([])}
            >
              إلغاء التحديد
            </button>
          </div>
          <div className="modal-scroll-box" style={{ maxHeight: 320, marginBottom: '0.75rem' }}>
            {recipients.map((u) => (
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
          <AppSelect className="app-select" value={type} onChange={(e) => setType(e.target.value)} style={{ marginBottom: '0.75rem' }}>
            <option value="info">معلومة</option>
            <option value="success">نجاح</option>
            <option value="warning">تنبيه</option>
          </AppSelect>
          <label className="app-label">العنوان</label>
          <input className="app-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: '0.75rem' }} />
          <label className="app-label">المحتوى</label>
          <textarea className="app-textarea" value={body} onChange={(e) => setBody(e.target.value)} style={{ marginBottom: '1rem' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => setIsComposeOpen(false)}>
              إلغاء
            </button>
            <button type="submit" className="google-btn google-btn--filled" style={{ width: 'auto', marginTop: 0 }} disabled={sending}>
              {sending ? 'جاري الإرسال...' : 'إرسال'}
            </button>
          </div>
        </form>
      </FormModal>

      <FormModal open={isNewChatOpen} title="إنشاء محادثة" onClose={() => setIsNewChatOpen(false)}>
        <form onSubmit={createConversation}>
          <label className="app-label">العنوان (اختياري للجروب)</label>
          <input className="app-input" value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} style={{ marginBottom: '0.75rem' }} />
          <label className="app-label">الأعضاء</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button
              type="button"
              className="btn-md btn-md--outline"
              style={{ minHeight: 32, fontSize: '0.8rem' }}
              onClick={() => setNewChatUsers(recipients.map((u) => u.id))}
            >
              تحديد الكل
            </button>
            <button
              type="button"
              className="btn-md btn-md--outline"
              style={{ minHeight: 32, fontSize: '0.8rem' }}
              onClick={() => setNewChatUsers([])}
            >
              إلغاء التحديد
            </button>
          </div>
          <div className="modal-scroll-box" style={{ maxHeight: 320, marginBottom: '1rem' }}>
            {recipients.map((u) => (
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => setIsNewChatOpen(false)}>
              إلغاء
            </button>
            <button type="submit" className="google-btn google-btn--filled" style={{ width: 'auto', marginTop: 0 }}>
              بدء المحادثة
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};

export default NotificationsPage;
