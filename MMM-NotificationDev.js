Module.register("MMM-NotificationDev", {

    defaults: {
        maxNotifications: 100,
        showPayload: true,
        updateInterval: 1000 // throttle DOM updates
    },

    start: function () {
        this.notifications = [];
        this.paused = false;
        this.filter = "";
        this.loaded = false;
        this.updateTimer = null;

        Log.info("Starting module: " + this.name);
    },

    getStyles: function () {
        return ["MMM-NotificationDev.css"];
    },

    getDom: function () {

        const wrapper = document.createElement("div");

        if (!this.loaded) {
            wrapper.innerHTML = "Notification monitor starting...";
            return wrapper;
        }

        const controls = document.createElement("div");

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

        const list = document.createElement("div");

        const filtered = this.filter
            ? this.notifications.filter(n => n.notification.includes(this.filter))
            : this.notifications;

        filtered.slice().reverse().forEach(n => {
            const row = document.createElement("div");

            row.innerHTML =
                `<b>${n.time}</b> 
                 <span style="color:#0ff">${n.sender}</span> 
                 <span style="color:#6cf">${n.notification}</span>`;

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

        if (this.paused) return;

        // Safe sender
        const senderName = sender && sender.name ? sender.name : "SYSTEM";

        // Store notification
        this.notifications.push({
            time: new Date().toLocaleTimeString(),
            notification,
            payload: payload || null,
            sender: senderName
        });

        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications.shift();
        }

        if (!this.loaded) {
            this.loaded = true;
        }

        // Throttle DOM updates
        if (!this.updateTimer) {
            this.updateTimer = setTimeout(() => {
                this.updateDom();
                this.updateTimer = null;
            }, this.config.updateInterval);
        }
    }

});
