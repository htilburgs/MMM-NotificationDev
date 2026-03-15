const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    start: function () {
        console.log("MMM-NotificationDev node helper started");
    },

    notificationReceived: function (notification, payload, sender) {

        const senderName = sender && sender.name ? sender.name : "SYSTEM";

        console.log("[NotificationDev NODE]", notification, payload);

        this.sendSocketNotification("NODE_NOTIFICATION", {
            time: new Date().toLocaleTimeString(),
            notification: notification,
            payload: payload ?? null,
            sender: senderName,
            source: "NODE"
        });

    }

});
