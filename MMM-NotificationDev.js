Module.register("MMM-NotificationDev", {

    defaults: {
        maxNotifications: 100,
        showPayload: true,
        updateInterval: 1000, // throttle DOM updates (ms)
        blockedNotifications: ["MODULE_DOM", "DOM_OBJECTS_CREATED", "CLOCK_SECOND"] // configurable
    },

    start: function () {
        this.notifications = [];
        this.paused = false;
        this.filter = "";
        this.loaded = false;
        this.updateTimer = null;

        Log.info("MMM-NotificationDev started");
    },

    getStyles: function () {
        return ["MMM-NotificationDev.css"];
    },

    getDom: function () {
        const wrapper = document.createElement("div");

        // Controls
        const controls = document.createElement("div");
        controls.className = "controls";

        const pauseBtn = document.createElement("button");
        pauseBtn.innerHTML = this.paused ? "Resume" : "Pause";
        pauseBtn.onclick = () => {
            this.paused = !this.paused;
            this.updateDom();
        };

        const filterInput = document.createElement("input");
        filterInput.placeholder = "Filter notifications...";
        filterInput.value = this.filter;
        filterInput.oninput = (e) => {
            this.filter = e.target.value.toUpperCase();
            this.updateDom();
        };

        controls.appendChild(pauseBtn);
        controls.appendChild(filterInput);
        wrapper.appendChild(controls);

        // Notification list
        const list = document.createElement("div");
        list.className = "notification-list";

        if (!this.loaded) {
            list.innerHTML = "<i>Waiting for notifications...</i>";
            wrapper.appendChild(list);
            return wrapper;
        }

        const filtered = this.filter
            ? this.notifications.filter(n => n.notification.includes(this.filter))
            : this.notifications;

        filtered.slice().reverse().forEach(n => {
            const row = document.createElement("div");
            row.className = "row";

            row.innerHTML = `<b>${n.time}</b> 
                             <span class="sender">${n.sender}</span> 
                             <span class="notification">${n.notification}</span>`;

            list.appendChild(row);

            if (this.config.showPayload && n.payload !== undefined) {
                const payload = document.createElement("pre");
                try {
                    payload.innerText = JSON.stringify(n.payload, null, 2);
                } catch (e) {
                    payload.innerText = String(n.payload);
                }
                list.appendChild(payload);
            }
        });

        wrapper.appendChild(list);
        return wrapper;
    },

    notificationReceived: function (notification, payload, sender) {

        if (!this.loaded) this.loaded = true;
        if (this.paused) return;

        // Use the blockedNotifications from config
        if (this.config.blockedNotifications.includes(notification)) return;

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

        if (!this.updateTimer) {
            this.updateTimer = setTimeout(() => {
                this.updateDom();
                this.updateTimer = null;
            }, this.config.updateInterval);
        }
    }

});
