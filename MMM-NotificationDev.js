notificationReceived: function (notification, payload, sender) {

    // Ignore paused module
    if (this.paused) return;

    // Ignore blocked notifications
    if (this.blockedNotifications.includes(notification)) return;

    const senderName = sender && sender.name ? sender.name : "SYSTEM";

    this.notifications.push({
        time: new Date().toLocaleTimeString(),
        notification,
        payload: payload || null,
        sender: senderName
    });

    if (this.notifications.length > this.config.maxNotifications) {
        this.notifications.shift();
    }

    if (!this.loaded) this.loaded = true;

    if (!this.updateTimer) {
        this.updateTimer = setTimeout(() => {
            this.updateDom();
            this.updateTimer = null;
        }, this.config.updateInterval);
    }
}
