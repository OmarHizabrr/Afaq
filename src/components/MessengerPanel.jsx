import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Reply,
  Pencil,
  Check,
  X,
  Send,
  ChevronRight,
  ChevronDown,
  Loader2,
  Search,
  MessageCircle,
  Plus,
} from 'lucide-react';
import {
  buildMessageTimeline,
  formatMessageTime,
  formatThreadTime,
} from '../utils/messengerFormat';
import useAppTranslation from '../hooks/useAppTranslation';

const getRoleLabels = (t) => ({
  system_admin: t('components.MessengerPanel.مدير_نظام', 'مدير نظام'),
  admin: t('components.MessengerPanel.مدير', 'مدير'),
  supervisor_arab: t('components.MessengerPanel.مشرف_عام', 'مشرف عام'),
  supervisor_local: t('components.MessengerPanel.مشرف_منطقة', 'مشرف منطقة'),
  teacher: t('components.MessengerPanel.معلم', 'معلم'),
  student: t('components.MessengerPanel.طالب', 'طالب'),
});

function replySnippetLabel(m, actorId, actorDisplayName, t) {
  const youLabel = t('components.MessengerPanel.أنت', 'أنت');
  if (m.replyToSenderId === actorId) return youLabel;
  if (m.replyToSenderName === youLabel) return youLabel;
  if (!m.replyToSenderId && actorDisplayName && m.replyToSenderName === actorDisplayName) return youLabel;
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
  onNewChat,
}) => {
  const { t } = useAppTranslation();
  const roleLabels = useMemo(() => getRoleLabels(t), [t]);
  const bottomRef = useRef(null);
  const messagesRef = useRef(null);
  const composerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  const touchRef = useRef({ x: 0, y: 0, id: null });

  const getUser = useCallback((id) => allUsers.find((u) => u.id === id), [allUsers]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    nearBottomRef.current = true;
    scrollToBottom(false);
  }, [selectedConversation?.id, scrollToBottom]);

  useEffect(() => {
    if (nearBottomRef.current) {
      scrollToBottom(messages.length > 2);
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      nearBottomRef.current = dist < 120;
      setShowScrollDown(dist > 120);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [selectedConversation?.id]);

  const resizeComposer = useCallback(() => {
    const ta = composerRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [messageText, resizeComposer, selectedConversation?.id]);

  const partnerTitle = useCallback(
    (c) => {
      if (!c) return '';
      if (c.isGroup) return c.title || t('components.MessengerPanel.مجموعة', 'مجموعة');
      const names = (c.participants || [])
        .filter((id) => id !== actorId)
        .map((id) => getUser(id)?.displayName || id);
      return names.join(t('components.ExplorationDataModal.،', '، ')) || t('components.MessengerPanel.محادثة', 'محادثة');
    },
    [actorId, getUser]
  );

  const threadAvatar = useCallback(
    (c) => {
      if (!c) return { letter: '?', src: null };
      if (c.isGroup) {
        const t = c.title || t('components.MessengerPanel.مجموعة', 'مجموعة');
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
      const n = encodeURIComponent(actorDisplayName || t('components.MessengerPanel.أنا', 'أنا'));
      return `https://ui-avatars.com/api/?name=${n}&background=1e8e3e&color=fff`;
    }
    if (m.senderPhotoURL) return m.senderPhotoURL;
    const u = getUser(m.senderId);
    if (u?.photoURL) return u.photoURL;
    const name = m.senderName || m.senderId || '?';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a73e8&color=fff`;
  };

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const title = partnerTitle(c).toLowerCase();
      const preview = (c.lastMessage || '').toLowerCase();
      return title.includes(q) || preview.includes(q);
    });
  }, [conversations, searchQuery, partnerTitle]);

  const timeline = useMemo(() => buildMessageTimeline(messages), [messages]);

  const threadPreview = useCallback(
    (c) => {
      const raw = c.lastMessage || t('components.MessengerPanel.ابدأ_المحادثة', 'ابدأ المحادثة…');
      if (c.lastSenderId === actorId) return `أنت: ${raw}`;
      return raw;
    },
    [actorId]
  );

  const isUnreadThread = (c) => c.lastSenderId && c.lastSenderId !== actorId;

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
    if (dy >= 40) return;
    const isRtl = document.documentElement.dir === 'rtl';
    const swipeToReply = isRtl ? dx > 48 : dx < -48;
    if (swipeToReply) {
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

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageText.trim() && !sendingMessage) {
        onSendMessage(e);
      }
    }
  };

  const replyStripWho =
    replyTo && replyTo.senderId === actorId ? t('components.MessengerPanel.أنت', 'أنت') : replyTo?.senderName || t('components.MessengerPanel.رسالة', 'رسالة');

  const listSection = (
    <div className={`messenger-col messenger-col--list ${hideListColumnSm ? 'messenger-col--hidden-sm' : ''}`}>
      <div className="messenger-col__head messenger-col__head--list">
        <div className="messenger-col__head-row">
          <span className="messenger-col__head-title">المحادثات</span>
          {onNewChat && (
            <button type="button" className="messenger-new-chat-btn" onClick={onNewChat} title="محادثة جديدة" aria-label="محادثة جديدة">
              <Plus size={20} />
            </button>
          )}
        </div>
        <div className="messenger-search">
          <Search size={16} className="messenger-search__icon" aria-hidden />
          <input
            type="search"
            className="messenger-search__input"
            placeholder="بحث في المحادثات…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            dir="auto"
          />
        </div>
      </div>
      <div className="messenger-col__scroll">
        {filteredConversations.length === 0 ? (
          <div className="messenger-empty">
            <div className="messenger-empty__icon" aria-hidden>
              <MessageCircle size={32} />
            </div>
            <p className="messenger-empty__text">
              {searchQuery.trim() ? 'لا توجد نتائج للبحث.' : 'لا توجد محادثات بعد. ابدأ محادثة جديدة.'}
            </p>
            {!searchQuery.trim() && onNewChat && (
              <button type="button" className="btn-md btn-md--primary" onClick={onNewChat}>
                <Plus size={16} /> محادثة جديدة
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((c) => {
            const active = selectedConversation?.id === c.id;
            const av = threadAvatar(c);
            const unread = isUnreadThread(c);
            return (
              <button
                key={c.id}
                type="button"
                className={`messenger-thread ${active ? 'messenger-thread--active' : ''} ${unread ? 'messenger-thread--unread' : ''}`}
                onClick={() => onSelectConversation(c)}
              >
                <div className="messenger-thread__avatar">
                  {av.src ? <img className="messenger-thread__avatar-img" src={av.src} alt="" /> : av.letter}
                </div>
                <div className="messenger-thread__body">
                  <div className="messenger-thread__top">
                    <div className="messenger-thread__title">{partnerTitle(c)}</div>
                    <span className="messenger-thread__time">{formatThreadTime(c.updatedAt)}</span>
                  </div>
                  <div className="messenger-thread__preview">{threadPreview(c)}</div>
                </div>
                {unread && <span className="messenger-thread__badge" aria-label="رسالة جديدة">1</span>}
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
          <div className="messenger-placeholder__icon" aria-hidden>
            <MessageCircle size={34} />
          </div>
          <p className="messenger-placeholder__title">مرحباً بك في المحادثات</p>
          <p className="messenger-placeholder__sub">اختر محادثة من القائمة أو ابدأ محادثة جديدة للتواصل مع الزملاء.</p>
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
              <div className="messenger-thread-head__meta">
                <div className="messenger-thread-head__title">{partnerTitle(selectedConversation)}</div>
                <div className="messenger-thread-head__sub">
                  {selectedConversation.isGroup ? `${(selectedConversation.participants || []).length} أعضاء` : 'متصل'}
                </div>
              </div>
            </div>
          </div>

          <div className="messenger-messages-wrap">
            <div className="messenger-messages" ref={messagesRef}>
              {messages.length === 0 ? (
                <div className="messenger-empty">
                  <p className="messenger-empty__text">لا توجد رسائل بعد. اكتب أول رسالة!</p>
                </div>
              ) : (
                timeline.map((item) => {
                  if (item.kind === 'date') {
                    return (
                      <div key={item.id} className="messenger-date-sep">
                        {item.label}
                      </div>
                    );
                  }

                  const m = item.message;
                  const mine = m.senderId === actorId;
                  const refLbl = replySnippetLabel(m, actorId, actorDisplayName, t);
                  const showAvatar = !mine && item.isLastInGroup;
                  const showSenderName =
                    !mine && selectedConversation.isGroup && item.isFirstInGroup;

                  return (
                    <div
                      key={m.id}
                      className={`messenger-msg-row ${mine ? 'messenger-msg-row--outgoing' : 'messenger-msg-row--incoming'} ${item.isFirstInGroup ? 'messenger-msg-row--first' : ''} ${showAvatar ? 'messenger-msg-row--show-avatar' : ''}`}
                      onTouchStart={(e) => handleTouchStart(e, m)}
                      onTouchEnd={(e) => handleTouchEnd(e, m)}
                    >
                      {!mine && (
                        showAvatar ? (
                          <div className="messenger-msg__avatar-wrap">
                            <img src={messageAvatarSrc(m, false)} alt="" />
                          </div>
                        ) : (
                          <div className="messenger-msg__avatar-spacer" aria-hidden />
                        )
                      )}

                      <div className="messenger-msg__bubble-wrap">
                        {showSenderName && (
                          <div className="messenger-msg__sender">
                            {m.senderName}
                            {m.senderRole && (
                              <span className="messenger-msg__role"> · {roleLabels[m.senderRole] || m.senderRole}</span>
                            )}
                          </div>
                        )}

                        <div
                          className={`messenger-bubble ${mine ? 'messenger-bubble--out' : 'messenger-bubble--in'} ${!item.isFirstInGroup || !item.isLastInGroup ? 'messenger-bubble--grouped' : ''} ${item.isFirstInGroup ? 'messenger-bubble--first-in-group' : ''} ${item.isLastInGroup ? 'messenger-bubble--last-in-group' : ''}`}
                        >
                          {m.replyToText && (
                            <div className="messenger-bubble__reply">
                              <Reply size={12} aria-hidden />
                              <div>
                                {refLbl && <span className="messenger-bubble__reply-who">{refLbl}</span>}
                                <div>{m.replyToText}</div>
                              </div>
                            </div>
                          )}

                          {editingId === m.id ? (
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
                            <span dir="auto">{m.text}</span>
                          )}

                          {editingId !== m.id && (
                            <div className="messenger-bubble__foot">
                              <span>{formatMessageTime(m.createdAt)}</span>
                              {m.editedAt && <span className="messenger-bubble__edited">تم التعديل</span>}
                              <div className="messenger-bubble__actions">
                                <button
                                  type="button"
                                  className="messenger-bubble__icon-btn"
                                  title="رد"
                                  onClick={() => pickReply(m)}
                                >
                                  <Reply size={14} />
                                </button>
                                {mine && (
                                  <button
                                    type="button"
                                    className="messenger-bubble__icon-btn"
                                    title="تعديل"
                                    onClick={() => startEdit(m)}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {showScrollDown && (
              <button
                type="button"
                className="messenger-scroll-down"
                onClick={() => scrollToBottom()}
                aria-label="الانتقال لآخر الرسائل"
              >
                <ChevronDown size={20} />
              </button>
            )}
          </div>

          {replyTo && (
            <div className="messenger-reply-strip">
              <div className="messenger-reply-strip__inner">
                <Reply size={16} aria-hidden />
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
            <div className="messenger-composer__input-wrap">
              <textarea
                ref={composerRef}
                className="messenger-composer__textarea"
                placeholder="اكتب رسالة…"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                dir="auto"
              />
            </div>
            <button
              type="submit"
              className={`messenger-composer__send ${messageText.trim() ? 'messenger-composer__send--active' : ''}`}
              disabled={sendingMessage || !messageText.trim()}
              aria-busy={sendingMessage}
              title={sendingMessage ? 'جاري الإرسال…' : 'إرسال'}
            >
              {sendingMessage ? <Loader2 className="busy-btn__spin" size={20} aria-hidden /> : <Send size={20} />}
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
