document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminLoginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("adminLoginBtn");
    const btnText = document.querySelector(".btn-text");
    const btnIcon = document.querySelector(".btn-icon");
    const statusBox = document.getElementById("statusBox");

    function setStatus(message, type) {
        statusBox.textContent = message;
        statusBox.className = "status-box show " + type;
    }

    function clearStatus() {
        statusBox.textContent = "";
        statusBox.className = "status-box";
    }

    function setButton(text, icon, disabled, background = "") {
        btnText.textContent = text;
        btnIcon.textContent = icon;
        loginBtn.disabled = disabled;
        loginBtn.style.background = background;
    }

    function resetButton() {
        setButton("Login as Admin", "→", false, "");
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        clearStatus();

        if (!username || !password) {
            setStatus("Please enter admin username and password.", "error");
            return;
        }

        setButton("Checking...", "⌛", true);

        try {
            const response = await fetch("/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || "Admin login failed");
            }

            const data = await response.json();

            if (data.role !== "ADMIN") {
                throw new Error("This is not an Admin account.");
            }

            localStorage.setItem("user", JSON.stringify(data));

            setStatus("✓ Admin authentication successful!", "success");
            setButton("Access Granted", "✓", true, "linear-gradient(135deg, #15803d, #22c55e)");

            setTimeout(() => {
                window.location.href = "admin.html";
            }, 900);
        } catch (error) {
            const message =
                error.message === "Failed to fetch"
                    ? "Unable to reach the server. Please check backend is running."
                    : error.message;

            setStatus(message, "error");
            setButton("Access Denied", "✗", true, "linear-gradient(135deg, #991b1b, #ef4444)");

            setTimeout(() => {
                resetButton();
            }, 1800);
        }
    });
});