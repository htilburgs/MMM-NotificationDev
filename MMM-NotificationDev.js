Module.register("MMM-NotificationDev", {

    defaults: {
        maxNotifications: 100,
        showPayload: true,
        updateInterval: 1000 // update DOM once per second max
    },

    start: function () {
        this.notifications = [];
        this.paused = false;
        this.filter = "";
        this.loaded = false;

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
        filterInput.placeholder = "Filter...";
        filterInput.value = this.filter;

        filterInput.oninput = (e) => {
            this.filter = e.target.value.toUpperCase();
            this.updateDom();
        };

        controls.appendChild(pauseBtn);
        controls.appendChild(filterInput);

        wrapper.appendChild(controls);

        const list = document.createElement("div");

        let filtered = this.notifications;

        if (this.filter) {
            filtered = filtered.filter(n =>
                n.notification.includes(this.filter)
            );
        }

        filtered.slice().reverse().forEach(n => {

            const row = document.createElement("div");

            row.innerHTML =
                `<b>${n.time}</b> 
                 <span style="color:#0ff">${n.sender}</span> 
                 <span style="color:#6cf">${n.notification}</span>`;

            list.appendChild(row);

            if (this.config.showPayload && n.payload !== undefined) {
                const payload = document.createElement("pre");
                payload.innerText = JSON.stringify(n.payload, null, 2);
                list.appendChild(payload);
            }

        });

        wrapper.appendChild(list);

        return wrapper;
    },

    notificationReceived: function (notification, payload, sender) {

        if (this.paused) return;

        const entry = {
            time: new Date().toLocaleTimeString(),
            notification: notification,
            payload: payload,
            sender: sender ? sender.name : "SYSTEM"
        };

        console.log("[NotificationDev]", entry);

        this.notifications.push(entry);

        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications.shift();
        }

        if (!this.loaded) {
            this.loaded = true;
        }

        if (!this.updateTimer) {
            this.updateTimer = setTimeout(() => {
                this.updateDom();
                this.updateTimer = null;
            }, this.config.updateInterval);
        }

    }

});
