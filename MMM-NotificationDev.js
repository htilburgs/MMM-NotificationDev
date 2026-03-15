Module.register("MMM-NotificationDev", {

    defaults: {
        maxNotifications: 200,
        showPayload: true,
        updateInterval: 1000,
        blockedNotifications: [] // you can block "CLOCK_SECOND" if too noisy
    },

    start: function() {
        window.MMMNotificationDevInstance = this;

        this.notifications = [];
        this.paused = false;
        this.filter = "";
        this.loaded = false;
        this.updateTimer = null;
        this.iframeReady = false;
        this.lastRenderedIndex = 0;

        Log.info("MMM-NotificationDev started");
    },

    getStyles: function() {
        return ["MMM-NotificationDev.css"];
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-NotificationDev";

        // Controls
        const controls = document.createElement("div");
        controls.className = "controls";

        const pauseBtn = document.createElement("button");
        pauseBtn.innerHTML = this.paused ? "Resume" : "Pause";
        pauseBtn.onclick = () => {
            this.paused = !this.paused;
            pauseBtn.innerHTML = this.paused ? "Resume" : "Pause";
        };

        const filterInput = document.createElement("input");
        filterInput.placeholder = "Filter notifications...";
        filterInput.value = this.filter;
        filterInput.oninput = (e) => {
            this.filter = e.target.value.toUpperCase();
            this.updateIframe(true);
        };

        controls.appendChild(pauseBtn);
        controls.appendChild(filterInput);
        wrapper.appendChild(controls);

        // Iframe
        if (!this.iframe) {
            this.iframe = document.createElement("iframe");
            this.iframe.style.width = "100%";
            this.iframe.style.height = "400px";
            this.iframe.style.border = "1px solid #444";

            this.iframe.onload = () => {
                this.iframeReady = true;
                const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
                doc.open();
                doc.write(`
                    <html>
                    <head>
                        <style>
                            body { font-family: monospace; color: #fff; background: #111; margin: 0; padding: 5px; overflow-y:auto; }
                            .row { border-bottom:1px solid #444; padding:2px 0; }
                            .sender { margin:0 5px; }
                            .notification { color:#6cf; }
                            pre { color:#aaa; background:#111; padding:2px; margin:2px 0; overflow-x:auto; }
                        </style>
                    </head>
                    <body></body>
                    </html>
                `);
                doc.close();
                this.updateIframe(true);
            };
            wrapper.appendChild(this.iframe);
        }

        return wrapper;
    },

    // Capture notifications from browser modules
    notificationReceived: function(notification, payload, sender) {
        const senderName = sender?.name || "SYSTEM";
        this._captureNotification(notification, payload, senderName, "CLIENT");
    },

    // Capture forwarded NodeHelper notifications
    socketNotificationReceived: function(notification, payload) {
        if (notification === "NODE_NOTIFICATION") {
            this._captureNotification(payload.notification, payload.payload, payload.sender, "NODE");
        }
    },

    // Add a new notification to the list
    _captureNotification: function(notification, payload, sender, source) {
        if (this.paused) return;
        if (this.config.blockedNotifications.includes(notification)) return;

        this.notifications.push({
            time: new Date().toLocaleTimeString(),
            notification,
            payload: payload ?? null,
            sender,
            source
        });

        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications.shift();
        }

        if (!this.updateTimer) {
            this.updateTimer = setTimeout(() => {
                this.updateIframe();
                this.updateTimer = null;
            }, this.config.updateInterval);
        }
    },

    // Render notifications into iframe
    updateIframe: function(forceFull = false) {
        if (!this.iframeReady) return;

        const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
        const body = doc.body;

        if (forceFull) {
            body.innerHTML = "";
            this.lastRenderedIndex = 0;
        }

        const filtered = this.filter
            ? this.notifications.filter(n => n.notification.toUpperCase().includes(this.filter))
            : this.notifications;

        for (let i = this.lastRenderedIndex; i < filtered.length; i++) {
            const n = filtered[i];

            const row = doc.createElement("div");
            row.className = "row";

            let color = "#6cf";
            if (n.source === "NODE") color = "#f6c";
            else if (n.sender === "SYSTEM") color = "#0ff";

            row.innerHTML = `<b>${n.time}</b> <span class="sender" style="color:${color}">${n.sender}</span> <span class="notification">${n.notification}</span>`;

            body.appendChild(row);

            if (this.config.showPayload && n.payload !== null && n.payload !== undefined) {
                const pre = doc.createElement("pre");
                try { pre.innerText = JSON.stringify(n.payload, null, 2); }
                catch (e) { pre.innerText = String(n.payload); }
                body.appendChild(pre);
            }
        }

        this.lastRenderedIndex = filtered.length;
        body.scrollTop = body.scrollHeight;
    }

});
