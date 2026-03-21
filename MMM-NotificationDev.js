Module.register("MMM-NotificationDev", {

    defaults: {
        maxNotifications: 200,
        showPayload: true,
        updateInterval: 1000,
        blockedNotifications: []
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
            if (!this.paused) this.scheduleUpdate();
        };

        const clearBtn = document.createElement("button");
        clearBtn.innerHTML = "Clear";
        clearBtn.onclick = () => {
            this.notifications = [];
            this.lastRenderedIndex = 0;
            this.updateIframe(true);
        };

        const filterInput = document.createElement("input");
        filterInput.placeholder = "Filter notifications...";
        filterInput.value = this.filter;
        filterInput.oninput = (e) => {
            this.filter = e.target.value.toUpperCase();
            this.updateIframe(true);
        };

        controls.appendChild(pauseBtn);
        controls.appendChild(clearBtn);
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
                            .notification { font-weight:bold; }
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

    notificationReceived: function(notification, payload, sender) {
        const senderName = sender?.name || "SYSTEM";
        this._captureNotification(notification, payload, senderName, "CLIENT");
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "NODE_NOTIFICATION") {
            this._captureNotification(payload.notification, payload.payload, payload.sender, "NODE");
        }
    },

    _captureNotification: function(notification, payload, sender, source) {
        if (this.config.blockedNotifications.includes(notification)) return;

        const time = new Date().toLocaleTimeString();

        // Determine color for console and iframe
        let color = "#6cf"; // CLIENT
        if (source === "NODE") color = "#f6c";
        if (sender === "SYSTEM") color = "#0ff";
        if (notification.includes("ERROR")) color = "#f66";

        // Console log with colors
        console.log(
            `%c[${source}] %c${notification} %c${sender} %c(${time})`,
            `color: gray; font-weight: bold;`,
            `color: ${color}; font-weight: bold;`,
            `color: ${color}; font-style: italic;`,
            `color: #aaa;`
        );
        if (payload !== null && payload !== undefined) console.log(payload);

        // Save notification for iframe
        this.notifications.push({
            time,
            notification,
            payload: payload ?? null,
            sender,
            source,
            color
        });

        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications.shift();
        }

        if (!this.paused) this.scheduleUpdate();
    },

    scheduleUpdate: function() {
        if (this.updateTimer) return;
        this.updateTimer = setTimeout(() => {
            this.updateIframe();
            this.updateTimer = null;
        }, this.config.updateInterval);
    },

    updateIframe: function(forceFull = false) {
        if (!this.iframeReady) return;

        const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
        const body = doc.body;
        const isFiltering = !!this.filter;

        if (forceFull || isFiltering) {
            body.innerHTML = "";
            this.lastRenderedIndex = 0;
        }

        const filtered = isFiltering
            ? this.notifications.filter(n => n.notification.toUpperCase().includes(this.filter))
            : this.notifications;

        const fragment = doc.createDocumentFragment();

        for (let i = this.lastRenderedIndex; i < filtered.length; i++) {
            const n = filtered[i];

            const row = doc.createElement("div");
            row.className = "row";

            row.innerHTML = `<b>${n.time}</b> 
                <span class="sender" style="color:${n.color}">${n.sender}</span> 
                <span class="notification" style="color:${n.color}">${n.notification}</span>`;

            fragment.appendChild(row);

            if (this.config.showPayload && n.payload !== null && n.payload !== undefined) {
                const pre = doc.createElement("pre");
                try { pre.innerText = JSON.stringify(n.payload, null, 2); }
                catch (e) { pre.innerText = String(n.payload); }
                fragment.appendChild(pre);
            }
        }

        const isAtBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 5;
        body.appendChild(fragment);
        this.lastRenderedIndex = filtered.length;

        if (isAtBottom) body.scrollTop = body.scrollHeight;
    }

});
