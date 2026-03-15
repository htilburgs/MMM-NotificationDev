const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    start: function() {
        console.log("MMM-NotificationDev NodeHelper started");

        // Forward core notifications like CLOCK_SECOND
        const self = this;

        // Listen to MagicMirror notifications globally
        const MM = global; // global MagicMirror object

        // Core notifications come through the notification system
        this.sendCoreNotification = function(notification, payload, sender) {
            self.sendSocketNotification("NODE_NOTIFICATION", {
                notification,
                payload: payload ?? null,
                sender: sender || "SYSTEM"
            });
        };
    },

    // Capture notifications from other NodeHelpers
    notificationReceived: function(notification, payload, sender) {
        const senderName = sender?.name || "NODE";
        this.sendSocketNotification("NODE_NOTIFICATION", {
            notification,
            payload: payload ?? null,
            sender: senderName
        });
    }

});
