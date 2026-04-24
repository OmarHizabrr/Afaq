import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Reply, Pencil, Check, X, Send, ChevronRight, Loader2 } from 'lucide-react';
import UnifiedMessageCard from './UnifiedMessageCard';

const ROLE_LABELS = {
  system_admin: 'مدير نظام',
  admin: 'مدير',
  supervisor_arab: 'مشرف عام',
  supervisor_local: 'مشرف منطقة',
  teacher: 'معلم',
  student: 'طالب',
};

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function replySnippetLabel(m, actorId, actorDisplayName) {
  if (m.replyToSenderId === actorId) return 'أنت';
  if (m.replyToSenderName === 'أنت') return 'أنت';
  if (!m.replyToSenderId && actorDisplayName && m.replyToSenderName === actorDisplayName) return 'أنت';
  return m.replyToSenderName || '';
}

const MessengerPanel = ({
  actorId,
  actorPhotoURL,
  actorDisplayName,
  allUsers,
  conversations,
  selectedConversation,
  onSelectConversation,
  onBackList,
  hideListColumnSm,
  hideThreadColumnSm,
  messages,
  messageText,
  setMessageText,
  onSendMessage,
  sendingMessage,
  replyTo,
  setReplyTo,
  onEditMessage,
}) => {
  const bottomRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const touchRef = useRef({ x: 0, y: 0, id: null });

  const getUser = useCallback((id) => allUsers.find((u) => u.id === id), [allUsers]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConversation?.id]);

  const partnerTitle = useCallback(
    (c) => {
      if (!c) return '';
      if (c.isGroup) return c.title || 'مجموعة';
      const names = (c.participants || [])
        .filter((id) => id !== actorId)
        .map((id) => getUser(id)?.displayName || id);
      return names.join('، ') || 'محادثة';
    },
    [actorId, getUser]
  );

  const threadAvatar = useCallback(
    (c) => {
      if (!c) return { letter: '?', src: null };
      if (c.isGroup) {
        const t = c.title || 'مجموعة';
        return { letter: t.charAt(0), src: null };
      }
      const oid = (c.participants || []).find((id) => id !== actorId);
      const u = oid ? getUser(oid) : null;
      const name = u?.displayName || oid || '?';
      if (u?.photoURL) return { letter: name.charAt(0), src: u.photoURL };
      return {
        letter: name.charAt(0),
        src: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a73e8&color=fff`,
      };
    },
    [actorId, getUser]
  );

  const headerAvatar = selectedConversation ? threadAvatar(selectedConversation) : { letter: '?', src: null };

  const messageAvatarSrc = (m, mine) => {
    if (mine) {
      if (actorPhotoURL) return actorPhotoURL;
      const n = encodeURIComponent(actorDisplayName || 'أنا');
      return `https://ui-avatars.com/api/?name=${n}&background=1e8e3e&color=fff`;
    }
    if (m.senderPhotoURL) return m.senderPhotoURL;
    const u = getUser(m.senderId);
    if (u?.photoURL) return u.photoURL;
    const name = m.senderName || m.senderId || '?';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a73e8&color=fff`;
  };

  const handleTouchStart = (e, m) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, id: m.id };
  };

  const handleTouchEnd = (e, m) => {
    const t = e.changedTouches[0];
    const { x, y, id } = touchRef.current;
    if (id !== m.id) return;
    const dx = t.clientX - x;
    const dy = Math.abs(t.clientY - y);
    if (dy < 40 && dx < -48) {
      setReplyTo({
        id: m.id,
        text: m.text,
        senderName: m.senderName || '',
        senderId: m.senderId,
      });
    }
  };

  const pickReply = (m) => {
    setReplyTo({
      id: m.id,
      text: m.text,
      senderName: m.senderName || '',
      senderId: m.senderId,
    });
  };

  const startEdit = (m) => {
    if (m.senderId !== actorId) return;
    setEditingId(m.id);
    setEditingText(m.text || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = () => {
    if (!editingId || !editingText.trim()) return;
    onEditMessage?.(editingId, editingText.trim());
    cancelEdit();
  };

  const replyStripWho =
    replyTo && replyTo.senderId === actorId ? 'أنت' : replyTo?.senderName || 'رسالة';

  const listSection = (
    <div className={`messenger-col messenger-col--list ${hideListColumnSm ? 'messenger-col--hidden-sm' : ''}`}>
      <div className="messenger-col__head">
        <span>المحادثات</span>
      </div>
      <div className="messenger-col__scroll">
        {conversations.length === 0 ? (
          <div className="messenger-empty">لا توجد محادثات بعد.</div>
        ) : (
          conversations.map((c) => {
            const active = selectedConversation?.id === c.id;
            const av = threadAvatar(c);
            return (
              <button
                key={c.id}
                type="button"
                className={`messenger-thread ${active ? 'messenger-thread--active' : ''}`}
                onClick={() => onSelectConversation(c)}
              >
                <div className="messenger-thread__avatar">
                  {av.src ? (
                    <img className="messenger-thread__avatar-img" src={av.src} alt="" />
                  ) : (
                    av.letter
                  )}
                </div>
                <div className="messenger-thread__body">
                  <div className="messenger-thread__title">{partnerTitle(c)}</div>
                  <div className="messenger-thread__preview">{c.lastMessage || '…'}</div>
                </div>
                {c.lastSenderId && c.lastSenderId !== actorId && <span className="messenger-thread__dot" aria-hidden />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const threadSection = (
    <div className={`messenger-col messenger-col--thread ${hideThreadColumnSm ? 'messenger-col--hidden-sm' : ''}`}>
      {!selectedConversation ? (
        <div className="messenger-placeholder">
          <p>اختر محادثة من القائمة</p>
        </div>
      ) : (
        <>
          <div className="messenger-col__head messenger-col__head--thread">
            <button type="button" className="messenger-back-sm" onClick={onBackList} aria-label="العودة للقائمة">
              <ChevronRight size={22} />
            </button>
            <div className="messenger-thread-head">
              <div className="messenger-thread-head__avatar-inner">
                {headerAvatar.src ? <img src={headerAvatar.src} alt="" /> : headerAvatar.letter}
              </div>
              <div>
                <div className="messenger-thread-head__title">{partnerTitle(selectedConversation)}</div>
                <div className="messenger-thread-head__sub">
                  {selectedConversation.isGroup ? 'مجموعة' : 'محادثة مباشرة'}
                </div>
              </div>
            </div>
          </div>

          <div className="messenger-messages">
            {messages.map((m) => {
              const mine = m.senderId === actorId;
              const refLbl = replySnippetLabel(m, actorId, actorDisplayName);
              return (
                <div
                  key={m.id}
                  className={`messenger-msg-row ${mine ? 'messenger-msg-row--mine' : ''}`}
                  onTouchStart={(e) => handleTouchStart(e, m)}
                  onTouchEnd={(e) => handleTouchEnd(e, m)}
                >
                  {!mine && (
                    <div className="messenger-msg__avatar-wrap">
                      <img src={messageAvatarSrc(m, false)} alt="" />
                    </div>
                  )}
                  <div className="messenger-msg__bubble-wrap">
                    <div className={`messenger-msg ${mine ? 'messenger-msg--mine' : ''}`}>
                      <div className="messenger-msg__bubble">
                        {m.replyToText && (
                          <div className="messenger-msg__reply-ref">
                            <Reply size={12} />
                            <span>
                              {refLbl ? `${refLbl}: ` : ''}
                              {m.replyToText}
                            </span>
                          </div>
                        )}
                        <UnifiedMessageCard
                          type="neutral"
                          compact
                          className="unified-msg-card--messenger-bubble"
                          meta={
                            !mine ? (
                              <div className="messenger-msg__meta">
                                {m.senderName}{' '}
                                <span className="messenger-msg__role">{ROLE_LABELS[m.senderRole] || m.senderRole || ''}</span>
                              </div>
                            ) : (
                              <div className="messenger-msg__meta messenger-msg__meta--mine">أنت</div>
                            )
                          }
                          body={
                            editingId === m.id ? (
                              <div className="messenger-msg__edit">
                                <textarea
                                  className="app-textarea"
                                  rows={2}
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                />
                                <div className="messenger-msg__edit-actions">
                                  <button type="button" className="icon-btn" onClick={saveEdit} title="حفظ">
                                    <Check size={18} />
                                  </button>
                                  <button type="button" className="icon-btn" onClick={cancelEdit} title="إلغاء">
                                    <X size={18} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              m.text
                            )
                          }
                          footer={
                            <div className="messenger-msg__foot messenger-msg__foot--in-unified">
                              <span>{formatTime(m.createdAt)}</span>
                              {m.editedAt && <span className="messenger-msg__edited">تم التعديل</span>}
                              <div className="messenger-msg__actions">
                                <button
                                  type="button"
                                  className="messenger-msg__icon-btn"
                                  title="رد (أو اسحب لليسار)"
                                  onClick={() => pickReply(m)}
                                >
                                  <Reply size={14} />
                                </button>
                                {mine && editingId !== m.id && (
                                  <button type="button" className="messenger-msg__icon-btn" title="تعديل" onClick={() => startEdit(m)}>
                                    <Pencil size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          }
                        />
                      </div>
                    </div>
                  </div>
                  {mine && (
                    <div className="messenger-msg__avatar-wrap">
                      <img src={messageAvatarSrc(m, true)} alt="" />
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {replyTo && (
            <div className="messenger-reply-strip">
              <div className="messenger-reply-strip__inner">
                <Reply size={16} />
                <div>
                  <div className="messenger-reply-strip__who">{replyStripWho}</div>
                  <div className="messenger-reply-strip__txt">{replyTo.text}</div>
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setReplyTo(null)} aria-label="إلغاء الرد">
                <X size={18} />
              </button>
            </div>
          )}

          <form className="messenger-composer" onSubmit={onSendMessage}>
            <input
              className="app-input messenger-composer__input"
              placeholder="اكتب رسالة…"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              dir="auto"
            />
            <button
              type="submit"
              className="messenger-composer__send btn-md btn-md--primary"
              disabled={sendingMessage}
              aria-busy={sendingMessage}
              title={sendingMessage ? 'جاري الإرسال…' : 'إرسال'}
            >
              {sendingMessage ? <Loader2 className="busy-btn__spin" size={18} aria-hidden /> : <Send size={18} />}
            </button>
          </form>
        </>
      )}
    </div>
  );

  return (
    <div className="messenger-shell">
      {listSection}
      {threadSection}
    </div>
  );
};

export default MessengerPanel;
