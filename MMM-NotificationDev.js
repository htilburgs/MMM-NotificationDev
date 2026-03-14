Module.register("MMM-NotificationDev", {

    defaults: {
        maxNotifications: 100,
        showPayload: true
    },

    start: function () {
        this.notifications = [];
        this.paused = false;
        this.filter = "";

        Log.info("Starting module: " + this.name);
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
        filterInput.placeholder = "Filter notification...";
        filterInput.value = this.filter;

        filterInput.oninput = (e) => {
            this.filter = e.target.value.toUpperCase();
            this.updateDom();
        };

        controls.appendChild(pauseBtn);
        controls.appendChild(filterInput);

        wrapper.appendChild(controls);

        const list = document.createElement("div");
        list.className = "notification-list";

        let filtered = this.notifications;

        if (this.filter) {
            filtered = filtered.filter(n =>
                n.notification.includes(this.filter)
            );
        }

        filtered.slice().reverse().forEach(n => {

            const row = document.createElement("div");
            row.className = "row";

            const header = document.createElement("div");
            header.className = "header";

            header.innerHTML =
                `<span class="time">${n.time}</span>
                 <span class="sender">${n.sender}</span>
                 <span class="notification">${n.notification}</span>`;

            row.appendChild(header);

            if (this.config.showPayload && n.payload !== undefined) {

                const payload = document.createElement("pre");
                payload.className = "payload";

                payload.innerText = JSON.stringify(n.payload, null, 2);

                row.appendChild(payload);
            }

            list.appendChild(row);

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

        console.log("[MMM-NotificationDev]", entry);

        this.notifications.push(entry);

        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications.shift();
        }

        this.updateDom();
    }

});
