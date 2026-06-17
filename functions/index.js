const {setGlobalOptions} = require("firebase-functions");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");
const {
  createChatInboxNotifications,
  deliverNotificationPush,
} = require("./notifications");

admin.initializeApp();

setGlobalOptions({maxInstances: 10});

/**
 * عند إنشاء رسالة محادثة: إنشاء إشعارات صندوق الوارد للمشاركين.
 * الإرسال الفوري (FCM) يتم عبر onNotificationCreated.
 */
exports.onChatMessageCreated = onDocumentCreated(
    "messages/{conversationId}/messages/{messageId}",
    async (event) => {
      const snap = event.data;
      if (!snap) return;

      const message = snap.data();
      const {conversationId, messageId} = event.params;

      try {
        await createChatInboxNotifications(conversationId, {
          ...message,
          id: messageId,
        });
        logger.info("chat inbox notifications created", {
          conversationId,
          messageId,
          senderId: message.senderId,
        });
      } catch (err) {
        logger.error("onChatMessageCreated failed", {
          conversationId,
          messageId,
          err,
        });
        throw err;
      }
    },
);

/**
 * عند إنشاء أي إشعار (محادثة أو يدوي): إرسال دفع FCM للمستلم.
 */
exports.onNotificationCreated = onDocumentCreated(
    "notifications/{notificationId}",
    async (event) => {
      const snap = event.data;
      if (!snap) return;

      try {
        await deliverNotificationPush(snap, event.params.notificationId);
      } catch (err) {
        logger.error("onNotificationCreated failed", {
          notificationId: event.params.notificationId,
          err,
        });
        throw err;
      }
    },
);
