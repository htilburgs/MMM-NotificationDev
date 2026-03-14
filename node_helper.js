const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    start: function () {
        console.log("MMM-NotificationDev node helper started");
    },

    socketNotificationReceived: function (notification, payload) {

        console.log("[NotificationDev NODE]", notification, payload);

    }

});
