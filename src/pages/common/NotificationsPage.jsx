import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, Calendar, Send, MessageCircle, Users } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import FormModal from '../../components/FormModal';

const ROLE_LABELS = {
  admin: 'مدير النظام',
  supervisor_arab: 'مشرف عام',
  supervisor_local: 'مشرف منطقة',
  teacher: 'معلم',
  student: 'طالب',
  unassigned: 'غير معين',
};

const NotificationsPage = ({ user }) => {
  const actorId = user?.uid || user?.id;
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
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
  const [loading, setLoading] = useState(true);
  const [sharedSupervisorIds, setSharedSupervisorIds] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!actorId) return;
      setLoading(true);
      const api = FirestoreApi.Api;
      try {
        const [notiDocs, userDocs] = await Promise.all([
          api.getDocuments(api.getNotificationsCollection(), { whereField: 'toUserId', isEqualTo: actorId }),
          api.getDocuments(api.getUsersCollection()),
        ]);
        const convDocs = await api.getDocuments(api.getConversationsCollection());
        const rows = notiDocs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setNotifications(rows);
        const convRows = convDocs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => Array.isArray(c.participants) && c.participants.includes(actorId))
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        setConversations(convRows);
        const users = userDocs.map((d) => ({ id: d.id, ...d.data() }));
        setAllUsers(users);

        if (user?.role === 'student') {
          const myMirrors = await api.getDocuments(api.getUserMembershipMirrorCollection(actorId));
          const myGroupIds = new Set(
            myMirrors
              .map((m) => {
                const data = m.data() || {};
                return data.schoolId || data.regionId || '';
              })
              .filter(Boolean)
          );

          const supervisors = users.filter((u) => u.role?.includes('supervisor'));
          const allowed = [];
          for (const sup of supervisors) {
            const supMirrors = await api.getDocuments(api.getUserMembershipMirrorCollection(sup.id));
            const hasShared = supMirrors.some((m) => {
              const data = m.data() || {};
              const gid = data.schoolId || data.regionId || '';
              return gid && myGroupIds.has(gid);
            });
            if (hasShared) allowed.push(sup.id);
          }
          setSharedSupervisorIds(allowed);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [actorId, user?.role]);

  const recipients = useMemo(() => {
    if (!user?.role) return [];
    const isAdmin = user.role === 'admin';
    if (isAdmin) {
      return allUsers.filter((u) => u.id !== actorId);
    }
    if (user.role === 'student') {
      return allUsers.filter(
        (u) => u.id !== actorId && (u.role === 'admin' || (u.role?.includes('supervisor') && sharedSupervisorIds.includes(u.id)))
      );
    }
    return allUsers.filter((u) => u.id !== actorId && u.role === 'admin');
  }, [allUsers, user?.role, actorId, sharedSupervisorIds]);

  const recipientsMap = useMemo(() => Object.fromEntries(recipients.map((r) => [r.id, r])), [recipients]);

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={20} color="#f59e0b" />;
      case 'success': return <CheckCircle size={20} color="var(--success-color)" />;
      default: return <Info size={20} color="var(--md-primary)" />;
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const api = FirestoreApi.Api;
    notifications.forEach((n) => {
      if (!n.isRead) {
        api.updateData({ docRef: api.getNotificationDoc(n.id), data: { isRead: true } });
      }
    });
  };

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

  const loadMessages = async (conversationId) => {
    const api = FirestoreApi.Api;
    const msgDocs = await api.getDocuments(api.getConversationMessagesCollection(conversationId));
    const rows = msgDocs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    setMessages(rows);
  };

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);
  };

  const createConversation = async (e) => {
    e.preventDefault();
    if (newChatUsers.length === 0 || !actorId) return;
    const api = FirestoreApi.Api;
    const participants = [actorId, ...newChatUsers.filter((id) => id !== actorId)];
    const uniqueParticipants = Array.from(new Set(participants));
    let conversationId = '';

    if (uniqueParticipants.length === 2) {
      const allConvDocs = await api.getDocuments(api.getConversationsCollection());
      const existing = allConvDocs
        .map((d) => ({ id: d.id, ...d.data() }))
        .find((c) => Array.isArray(c.participants) && c.participants.length === 2 && uniqueParticipants.every((id) => c.participants.includes(id)));
      if (existing) {
        conversationId = existing.id;
      }
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
    const convDoc = await api.getData(api.getConversationDoc(conversationId));
    if (convDoc) {
      const conversation = { id: conversationId, ...convDoc };
      setConversations((prev) => {
        const rest = prev.filter((c) => c.id !== conversationId);
        return [conversation, ...rest];
      });
      await openConversation(conversation);
      setActiveTab('chats');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedConversation?.id || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      const api = FirestoreApi.Api;
      const msgId = api.getNewId('messages');
      await api.setData({
        docRef: api.getConversationMessageDoc(selectedConversation.id, msgId),
        data: {
          senderId: actorId,
          senderName: user?.displayName || '',
          senderPhotoURL: user?.photoURL || '',
          senderRole: user?.role || '',
          text: messageText.trim(),
          createdAt: new Date().toISOString(),
        },
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
      await loadMessages(selectedConversation.id);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <PageHeader
        icon={Bell}
        iconBox
        title="مركز الإشعارات والتنبيهات"
        subtitle="استقبال وإرسال الإشعارات حسب الصلاحيات"
      >
        <button type="button" className={`btn-md ${activeTab === 'notifications' ? 'btn-md--primary' : 'btn-md--outline'}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={16} /> الإشعارات
        </button>
        <button type="button" className={`btn-md ${activeTab === 'chats' ? 'btn-md--primary' : 'btn-md--outline'}`} onClick={() => setActiveTab('chats')}>
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
        {notifications.some(n => !n.isRead) && (
          <button type="button" onClick={markAllRead} className="btn-md btn-md--outline">
            تعليم الكل كمقروء
          </button>
        )}
      </PageHeader>

      {activeTab === 'notifications' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.length === 0 ? (
          <div className="surface-card surface-card--lg" style={{ textAlign: 'center', padding: '5rem' }}>
             <Bell size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
             <p style={{ color: 'var(--text-secondary)' }}>لا توجد إشعارات جديدة بانتظارك.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-card ${n.isRead ? 'notif-card--read' : 'notif-card--unread'}`}
            >
              <div className="notif-card__icon" aria-hidden>
                {getIcon(n.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: n.isRead ? 'var(--text-primary)' : 'var(--md-primary)' }}>
                    {n.title}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <Calendar size={14} /> {n.createdAt ? new Date(n.createdAt).toLocaleString('ar-EG') : '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <img
                    src={n.fromUserPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.fromUserName || 'User')}`}
                    alt=""
                    style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border-color)' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    {n.fromUserName || 'مرسل غير معروف'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                    {ROLE_LABELS[n.fromUserRole] || n.fromUserRole || 'بدون دور'}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    {n.body}
                </p>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-md btn-md--outline"
                    style={{ minHeight: 32, fontSize: '0.8rem' }}
                    onClick={() => openReply(n)}
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
      </div>) : (
      <div className="surface-card" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', minHeight: '500px' }}>
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>لا توجد محادثات بعد.</div>
          ) : (
            conversations.map((c) => {
              const active = selectedConversation?.id === c.id;
              const partnerNames = (c.participants || [])
                .filter((id) => id !== actorId)
                .map((id) => allUsers.find((u) => u.id === id)?.displayName || id)
                .join('، ');
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openConversation(c)}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    border: 'none',
                    borderBottom: '1px solid var(--border-color)',
                    padding: '0.8rem',
                    background: active ? 'var(--accent-muted)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.isGroup ? c.title || 'مجموعة' : partnerNames || 'محادثة'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.lastMessage || 'لا توجد رسائل بعد'}</div>
                </button>
              );
            })
          )}
        </div>
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', flexDirection: 'column' }}>
          {!selectedConversation ? (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>اختر محادثة من القائمة.</div>
          ) : (
            <>
              <div style={{ padding: '0.8rem', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>
                {selectedConversation.isGroup ? selectedConversation.title || 'مجموعة' : 'محادثة ثنائية'}
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.senderId === actorId ? 'flex-end' : 'flex-start',
                      background: m.senderId === actorId ? 'var(--accent-muted)' : 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '0.5rem 0.7rem',
                      maxWidth: '75%',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      {m.senderName} - {ROLE_LABELS[m.senderRole] || m.senderRole || ''}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{m.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem', padding: '0.8rem', borderTop: '1px solid var(--border-color)' }}>
                <input
                  className="app-input"
                  placeholder="اكتب رسالة..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <button type="submit" className="btn-md btn-md--primary" disabled={sendingMessage}>
                  {sendingMessage ? '...' : 'إرسال'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      )}

      <FormModal open={isComposeOpen} title="إرسال إشعار جديد" onClose={() => setIsComposeOpen(false)}>
        <form onSubmit={handleSend}>
          <label className="app-label">المستلمون</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button type="button" className="btn-md btn-md--outline" style={{ minHeight: 32, fontSize: '0.8rem' }} onClick={() => setSelectedRecipientIds(recipients.map((u) => u.id))}>
              تحديد الكل
            </button>
            <button type="button" className="btn-md btn-md--outline" style={{ minHeight: 32, fontSize: '0.8rem' }} onClick={() => setSelectedRecipientIds([])}>
              إلغاء التحديد
            </button>
          </div>
          <div className="modal-scroll-box" style={{ maxHeight: 180, marginBottom: '0.75rem' }}>
            {recipients.map((u) => (
              <label key={u.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px' }}>
                <input
                  type="checkbox"
                  checked={selectedRecipientIds.includes(u.id)}
                  onChange={(e) => {
                    setSelectedRecipientIds((prev) =>
                      e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                    );
                  }}
                />
                <span>{u.displayName || u.email || u.id}</span>
              </label>
            ))}
          </div>
          <label className="app-label">نوع الرسالة</label>
          <select className="app-select" value={type} onChange={(e) => setType(e.target.value)} style={{ marginBottom: '0.75rem' }}>
            <option value="info">معلومة</option>
            <option value="success">نجاح</option>
            <option value="warning">تنبيه</option>
          </select>
          <label className="app-label">العنوان</label>
          <input className="app-input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: '0.75rem' }} />
          <label className="app-label">المحتوى</label>
          <textarea className="app-textarea" value={body} onChange={(e) => setBody(e.target.value)} style={{ marginBottom: '1rem' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => setIsComposeOpen(false)}>إلغاء</button>
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
            <button type="button" className="btn-md btn-md--outline" style={{ minHeight: 32, fontSize: '0.8rem' }} onClick={() => setNewChatUsers(recipients.map((u) => u.id))}>
              تحديد الكل
            </button>
            <button type="button" className="btn-md btn-md--outline" style={{ minHeight: 32, fontSize: '0.8rem' }} onClick={() => setNewChatUsers([])}>
              إلغاء التحديد
            </button>
          </div>
          <div className="modal-scroll-box" style={{ maxHeight: 180, marginBottom: '1rem' }}>
            {recipients.map((u) => (
              <label key={u.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px' }}>
                <input
                  type="checkbox"
                  checked={newChatUsers.includes(u.id)}
                  onChange={(e) => {
                    setNewChatUsers((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)));
                  }}
                />
                <span>{u.displayName || u.email || u.id}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="google-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => setIsNewChatOpen(false)}>إلغاء</button>
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
