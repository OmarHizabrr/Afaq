const admin = require("firebase-admin");
const {logger} = require("firebase-functions");

const db = () => admin.firestore();
const messaging = () => admin.messaging();

/**
 * @param {string} userId
 * @return {Promise<string[]>}
 */
async function getUserFcmTokens(userId) {
  const snap = await db().doc(`users/${userId}`).get();
  const data = snap.data() || {};
  const raw = data.fcmTokens;
  if (!Array.isArray(raw)) return [];
  return raw.filter((t) => typeof t === "string" && t.length > 10);
}

/**
 * @param {string[]} tokens
 * @param {string} userId
 */
async function pruneInvalidTokens(tokens, userId, invalidTokens) {
  if (!invalidTokens.length) return;
  const userRef = db().doc(`users/${userId}`);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const current = snap.exists ? snap.data().fcmTokens || [] : [];
    const next = current.filter((t) => !invalidTokens.includes(t));
    tx.set(userRef, {fcmTokens: next}, {merge: true});
  });
}

/**
 * @param {string} userId
 * @param {{title: string, body: string, data?: object, link?: string}} payload
 */
async function sendPushToUser(userId, payload) {
  const tokens = await getUserFcmTokens(userId);
  if (!tokens.length) {
    return {sent: 0, failed: 0, tokensCount: 0};
  }

  const data = {};
  Object.entries(payload.data || {}).forEach(([key, value]) => {
    if (value != null) data[key] = String(value);
  });

  const response = await messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title || "آفاق",
      body: payload.body || "",
    },
    data,
    webpush: {
      fcmOptions: {
        link: payload.link || "/notifications",
      },
    },
  });

  const invalidTokens = [];
  response.responses.forEach((res, index) => {
    if (res.success) return;
    const err = res.error || {};
    logger.warn("fcm send failed", {
      userId,
      tokenPrefix: tokens[index] ? tokens[index].slice(0, 12) : "",
      code: err.code || "",
      message: err.message || "",
    });
    const code = err.code;
    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length) {
    await pruneInvalidTokens(tokens, userId, invalidTokens);
  }

  return {
    sent: response.successCount,
    failed: response.failureCount,
    tokensCount: tokens.length,
  };
}

/**
 * @param {string} conversationId
 * @param {object} message
 */
async function createChatInboxNotifications(conversationId, message) {
  const convSnap = await db().doc(`conversations/${conversationId}`).get();
  if (!convSnap.exists) return;

  const conv = convSnap.data();
  const senderId = message.senderId;
  const participants = (conv.participants || []).filter((id) => id !== senderId);
  if (!participants.length) return;

  const senderName = message.senderName || "مستخدم";
  const rawText = typeof message.text === "string" ? message.text : "";
  const preview = rawText.length > 140 ?
    `${rawText.slice(0, 140)}…` :
    rawText;
  const title = conv.isGroup ?
    `رسالة في ${conv.title || "مجموعة"}` :
    `رسالة من ${senderName}`;
  const body = conv.isGroup ? `${senderName}: ${preview}` : preview;

  const recipientSnaps = await Promise.all(
      participants.map((id) => db().doc(`users/${id}`).get()),
  );

  const batch = db().batch();
  const now = new Date().toISOString();

  participants.forEach((recipientId, index) => {
    const toUser = recipientSnaps[index].data() || {};
    const notifRef = db().collection("notifications").doc();

    batch.set(notifRef, {
      toUserId: recipientId,
      toUserName: toUser.displayName || "",
      toUserRole: toUser.role || "",
      toUserPhotoURL: toUser.photoURL || "",
      fromUserId: senderId,
      fromUserName: senderName,
      fromUserRole: message.senderRole || "",
      fromUserPhotoURL: message.senderPhotoURL || "",
      title,
      body,
      type: "info",
      source: "chat",
      isRead: false,
      conversationId,
      conversationTitle: conv.isGroup ?
        (conv.title || "مجموعة") :
        senderName,
      messageId: message.id || "",
      pushSent: false,
      createdAt: now,
    });
  });

  await batch.commit();
}

/**
 * @param {FirebaseFirestore.DocumentSnapshot} snap
 * @param {string} notificationId
 */
async function deliverNotificationPush(snap, notificationId) {
  const n = snap.data();
  if (!n || !n.toUserId) return;
  if (n.pushSent === true) return;

  const link = n.conversationId ?
    `/notifications?chat=${n.conversationId}` :
    "/notifications";

  const result = await sendPushToUser(n.toUserId, {
    title: n.title,
    body: n.body,
    link,
    data: {
      notificationId,
      conversationId: n.conversationId || "",
      type: n.type || "info",
      source: n.source || "manual",
    },
  });

  // إذا لا توجد توكنات، لا نعلّم pushSent حتى لا يظهر كأنه تم الإرسال.
  // (لن يُعاد تشغيل onCreate لنفس الوثيقة، لكن هذا يفيد التشخيص ووضوح الحالة في Firestore.)
  const hasAnyAttempt = (result.tokensCount || 0) > 0;
  await snap.ref.update({
    pushSent: hasAnyAttempt && result.sent > 0,
    pushAttempted: hasAnyAttempt,
    pushSentAt: hasAnyAttempt ? admin.firestore.FieldValue.serverTimestamp() : null,
    pushSuccessCount: result.sent,
    pushFailureCount: result.failed,
    pushTokensCount: result.tokensCount || 0,
    pushSkipReason: hasAnyAttempt ? "" : "no-fcm-tokens",
  });

  logger.info("notification push delivered", {
    notificationId,
    toUserId: n.toUserId,
    sent: result.sent,
    failed: result.failed,
    tokensCount: result.tokensCount || 0,
  });
}

module.exports = {
  createChatInboxNotifications,
  deliverNotificationPush,
};
