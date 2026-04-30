const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "index.html";
}

window.addEventListener("DOMContentLoaded", () => {
    loadReminderNotifications();
});

function loadReminderNotifications() {
    const reminderList = document.getElementById("reminderList");
    if (!reminderList) return;

    reminderList.innerHTML = `<div class="empty-state">Loading reminders...</div>`;

    fetch(`/notification/${user.id}`)
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to load reminders");
            }
            return res.json();
        })
        .then(async data => {
            const notifications = Array.isArray(data) ? data : [];

            if (notifications.length === 0) {
                reminderList.innerHTML = `
                    <div class="empty-state">
                        No reminders available right now.
                    </div>
                `;
                return;
            }

            const unreadNotifications = notifications.filter(item => item && item.read === false);

            await Promise.all(
                unreadNotifications.map(item =>
                    fetch(`/notification/read/${item.id}`, {
                        method: "PUT"
                    }).catch(() => null)
                )
            );

            reminderList.innerHTML = notifications.map(item => {
                const isRead = item.read === true;
                const createdAt = formatDateTime(item.createdAt);

                return `
                    <div class="reminder-item ${isRead ? "read" : "unread"}">
                        <div class="reminder-top">
                            <div class="reminder-title">
                                ${isRead ? "Reminder" : "New Reminder"}
                            </div>
                            <div class="reminder-date">${escapeHtml(createdAt)}</div>
                        </div>
                        <div class="reminder-message">
                            ${escapeHtml(item.message || "No message available.")}
                        </div>
                    </div>
                `;
            }).join("");
        })
        .catch(error => {
            console.error(error);
            reminderList.innerHTML = `
                <div class="error-state">
                    Unable to load reminders right now.
                </div>
            `;
        });
}

function formatDateTime(dateTimeValue) {
    if (!dateTimeValue) return "Date not available";

    const date = new Date(dateTimeValue);
    if (Number.isNaN(date.getTime())) return "Date not available";

    return date.toLocaleString();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}