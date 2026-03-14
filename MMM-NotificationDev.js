Module.register("MMM-NotificationDev", {

    defaults: {
        maxNotifications: 100,
        showPayload: true,
        updateInterval: 1000, // throttle DOM updates
        blockedNotifications: ["MODULE_DOM", "DOM_OBJECTS_CREATED", "CLOCK_SECOND"]
    },

    start: function () {
        this.notifications = [];
        this.paused = false;
        this.filter = "";
        this.loaded = false;
        this.updateTimer = null;
        this.iframeReady = false;

        Log.info("MMM-NotificationDev started");
    },

    getDom: function () {

        // Create main wrapper
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-NotificationDev";

        // Controls (pause & filter)
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
            this.updateIframe();
        };

        controls.appendChild(pauseBtn);
        controls.appendChild(filterInput);
        wrapper.appendChild(controls);

        // Create iframe if not yet created
        if (!this.iframe) {
            this.iframe = document.createElement("iframe");
            this.iframe.style.width = "100%";
            this.iframe.style.height = "400px";
            this.iframe.style.border = "1px solid #444";
            this.iframe.onload = () => {
                this.iframeReady = true;
                this.updateIframe();
            };
            wrapper.appendChild(this.iframe);
        }

        return wrapper;
    },

    notificationReceived: function (notification, payload, sender) {

        if (!this.loaded) this.loaded = true;
        if (this.paused) return;

        // Ignore blocked notifications
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

        // Throttle iframe updates
        if (!this.updateTimer) {
            this.updateTimer = setTimeout(() => {
                this.updateIframe();
                this.updateTimer = null;
            }, this.config.updateInterval);
        }
    },

    // Render inside iframe
    updateIframe: function () {
        if (!this.iframeReady) return;
        const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
        doc.open();
        doc.write("<html><head><style>" +
            "body{font-family:monospace;color:#fff;background:#111;margin:0;padding:5px}" +
            ".row{border-bottom:1px solid #444;padding:2px 0}" +
            ".sender{color:#0ff;margin:0 5px}" +
            ".notification{color:#6cf}" +
            "pre{color:#aaa;background:#111;padding:2px;margin:2px 0;overflow-x:auto}" +
            "</style></head><body></body></html>");
        doc.close();

        const body = doc.body;

        const filtered = this.filter
            ? this.notifications.filter(n => n.notification.includes(this.filter))
            : this.notifications;

        filtered.slice().reverse().forEach(n => {
            const row = doc.createElement("div");
            row.className = "row";

            row.innerHTML = `<b>${n.time}</b> 
                             <span class="sender">${n.sender}</span> 
                             <span class="notification">${n.notification}</span>`;
            body.appendChild(row);

            if (this.config.showPayload && n.payload !== undefined) {
                const pre = doc.createElement("pre");
                try {
                    pre.innerText = JSON.stringify(n.payload, null, 2);
                } catch (e) {
                    pre.innerText = String(n.payload);
                }
                body.appendChild(pre);
            }
        });
    }

});
