Module.register("MMM-NotificationDev", {

    defaults: {
        maxNotifications: 100,
        showPayload: true,
        updateInterval: 1000,
        blockedNotifications: ["CLOCK_SECOND"]
    },

    start: function () {
        this.notifications = [];
        this.paused = false;
        this.filter = "";
        this.loaded = false;
        this.updateTimer = null;
        this.iframeReady = false;
        this.lastRenderedIndex = 0;

        Log.info("MMM-NotificationDev started");
    },

    getStyles: function () {
        return ["MMM-NotificationDev.css"];
    },

    getDom: function () {

        const wrapper = document.createElement("div");
        wrapper.className = "MMM-NotificationDev";

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
                    body{
                        font-family:monospace;
                        color:#fff;
                        background:#111;
                        margin:0;
                        padding:5px;
                        overflow-y:auto;
                    }
                    .row{
                        border-bottom:1px solid #444;
                        padding:2px 0;
                    }
                    .sender{
                        margin:0 5px;
                    }
                    .notification{
                        color:#6cf;
                    }
                    pre{
                        color:#aaa;
                        background:#111;
                        padding:2px;
                        margin:2px 0;
                        overflow-x:auto;
                    }
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

    notificationReceived: function (notification, payload, sender) {

        if (!this.loaded) this.loaded = true;
        if (this.paused) return;
        if (this.config.blockedNotifications.includes(notification)) return;

        const senderName = sender && sender.name ? sender.name : "SYSTEM";

        this.notifications.push({
            time: new Date().toLocaleTimeString(),
            notification: notification,
            payload: payload ?? null,
            sender: senderName,
            source: "CLIENT"
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

    socketNotificationReceived: function (notification, payload) {

        if (notification !== "NODE_NOTIFICATION") return;
        if (this.paused) return;
        if (this.config.blockedNotifications.includes(payload.notification)) return;

        this.notifications.push(payload);

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

    updateIframe: function (forceFull = false) {

        if (!this.iframeReady) return;

        const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
        const body = doc.body;

        if (forceFull) {
            body.innerHTML = "";
            this.lastRenderedIndex = 0;
        }

        const filtered = this.filter
            ? this.notifications.filter(n =>
                n.notification.toUpperCase().includes(this.filter)
            )
            : this.notifications;

        for (let i = this.lastRenderedIndex; i < filtered.length; i++) {

            const n = filtered[i];

            const row = doc.createElement("div");
            row.className = "row";

            let senderColor;

            if (n.source === "NODE") {
                senderColor = "#f6c";
            } else if (n.sender === "SYSTEM") {
                senderColor = "#0ff";
            } else {
                senderColor = "#6cf";
            }

            row.innerHTML = `
                <b>${n.time}</b>
                <span class="sender" style="color:${senderColor}">
                    ${n.sender}
                </span>
                <span class="notification">${n.notification}</span>
            `;

            body.appendChild(row);

            if (this.config.showPayload && n.payload !== null && n.payload !== undefined) {

                const pre = doc.createElement("pre");

                try {
                    pre.innerText = JSON.stringify(n.payload, null, 2);
                } catch (e) {
                    pre.innerText = String(n.payload);
                }

                body.appendChild(pre);
            }
        }

        this.lastRenderedIndex = filtered.length;

        body.scrollTop = body.scrollHeight;
    }

});
