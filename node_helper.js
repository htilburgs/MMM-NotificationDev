const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    start: function () {
        console.log("MMM-NotificationDev NodeHelper started");
    },

    notificationReceived: function(notification, payload, sender) {
        const senderName = sender?.name || "NODE";
        this.sendSocketNotification("NODE_NOTIFICATION", {
            notification,
            payload: payload ?? null,
            sender: senderName
        });
    }

});
