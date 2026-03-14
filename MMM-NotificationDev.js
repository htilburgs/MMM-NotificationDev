Module.register("MMM-NotificationDev", {

    defaults: {
        maxNotifications: 100,
        showPayload: true,
        updateInterval: 1000, // throttle DOM updates in ms
        blockedNotifications: ["MODULE_DOM", "DOM_OBJECTS_CREATED", "CLOCK_SECOND"] // configurable
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

        // Controls
        const controls = document.createElement("div");
        controls.className = "controls";

        const pauseBtn = document.createElement("button");
        pauseBtn.innerHTML = this.paused ? "Resume" : "Pause";
        pauseBtn.onclick = () => {
            this.paused = !this.paused;
            this.updateIframe(true); // refresh to update UI
        };

        const filterInput = document.createElement("input");
        filterInput.placeholder = "Filter notifications...";
        filterInput.value = this.filter;
        filterInput.oninput = (e) => {
            this.filter = e.target.value.toUpperCase();
            this.updateIframe(true); // full re-render on filter change
        };

        controls.appendChild(pauseBtn);
        controls.appendChild(filterInput);
        wrapper.appendChild(controls);

        // Create iframe once
        if (!this.iframe) {
            this.iframe = document.createElement("iframe");
            this.iframe.style.width = "100%";
            this.iframe.style.height = "400px";
            this.iframe.style.border = "1px solid #444";

            this.iframe.onload = () => {
                this.iframeReady = true;
                const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
                doc.open();
                doc.write("<html><head><style>" +
                    "body{font-family:monospace;color:#fff;background:#111;margin:0;padding:5px}" +
                    ".row{border-bottom:1px solid #444;padding:2px 0}" +
                    ".sender{margin:0 5px}" +
                    ".notification{color:#6cf}" +
                    "pre{color:#aaa;background:#111;padding:2px;margin:2px 0;overflow-x:auto}" +
                    "</style></head><body></body></html>");
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
            notification,
            payload: payload !== undefined ? payload : null,
            sender: senderName
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

    updateIframe: function(forceFull = false) {
        if (!this.iframeReady) return;
        const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
        const body = doc.body;

        // Full re-render if needed
        if (forceFull) {
            body.innerHTML = "";
            this.lastRenderedIndex = 0;
        }

        // Filter notifications
        const filtered = this.filter
            ? this.notifications.filter(n => n.notification.includes(this.filter))
            : this.notifications;

        // Append only new notifications
        for (let i = this.lastRenderedIndex; i < filtered.length; i++) {
            const n = filtered[i];

            // Skip completely empty notifications
            if (!n.notification && (n.payload === null || n.payload === undefined)) continue;

            const row = doc.createElement("div");
            row.className = "row";

            // Color code: SYSTEM = cyan, modules = light blue
            const senderColor = (n.sender === "SYSTEM") ? "#0ff" : "#6cf";

            row.innerHTML = `<b>${n.time}</b> 
                             <span class="sender" style="color:${senderColor}">${n.sender}</span> 
                             <span class="notification">${n.notification}</span>`;

            body.appendChild(row);

            // Only show payload if it exists
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

        // Scroll to bottom
        body.scrollTop = body.scrollHeight;
    }

});
