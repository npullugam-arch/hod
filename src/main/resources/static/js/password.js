document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("user"));

    const form = document.getElementById("passwordForm");
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const updatePasswordBtn = document.getElementById("updatePasswordBtn");
    const resetBtn = document.getElementById("resetBtn");
    const passwordMessage = document.getElementById("passwordMessage");
    const toggleButtons = document.querySelectorAll(".eye-toggle");

    function showMessage(message, type) {
        passwordMessage.textContent = message;
        passwordMessage.className = `status-message ${type}`;
    }

    toggleButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
            e.preventDefault();

            const targetId = button.getAttribute("data-target");
            const input = document.getElementById(targetId);

            if (input.type === "password") {
                input.type = "text";
                button.classList.add("active");
            } else {
                input.type = "password";
                button.classList.remove("active");
            }
        });
    });

    if (!user || !user.id) {
        showMessage("User not found. Please login again.", "error");
        updatePasswordBtn.disabled = true;
        return;
    }

    if (user.passwordChanged === true) {
        showMessage("Your password has already been updated. You can log in to your account using your updated password.", "success");
        updatePasswordBtn.disabled = true;
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        passwordMessage.textContent = "";
        passwordMessage.className = "status-message";

        if (!newPassword || !confirmPassword) {
            showMessage("Please fill in both password fields.", "error");
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage("Passwords do not match. Please re-enter the same password.", "error");
            return;
        }

        if (newPassword.length < 4) {
            showMessage("Password must contain at least 4 characters.", "error");
            return;
        }

        updatePasswordBtn.disabled = true;
        updatePasswordBtn.textContent = "Updating...";

        try {
            const response = await fetch("/auth/update-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: user.id,
                    newPassword: newPassword,
                    confirmPassword: confirmPassword
                })
            });

            const message = await response.text();

            if (!response.ok) {
                throw new Error(message || "Failed to update password.");
            }

            showMessage(
                "Password updated successfully. You can now log in to your account using your new password.",
                "success"
            );

            const updatedUser = {
                ...user,
                passwordChanged: true
            };

            localStorage.setItem("user", JSON.stringify(updatedUser));

            if (window.parent && window.parent !== window) {
                if (typeof window.parent.hidePasswordMenuAfterUpdate === "function") {
                    window.parent.hidePasswordMenuAfterUpdate();
                }
            }

            form.reset();

            newPasswordInput.type = "password";
            confirmPasswordInput.type = "password";

            toggleButtons.forEach((button) => {
                button.classList.remove("active");
            });

            updatePasswordBtn.textContent = "Password Updated";
            resetBtn.style.display = "none";

        } catch (error) {
            showMessage(error.message || "Something went wrong. Please try again.", "error");
            updatePasswordBtn.disabled = false;
            updatePasswordBtn.textContent = "Update Password";
        }
    });

    resetBtn.addEventListener("click", () => {
        passwordMessage.textContent = "";
        passwordMessage.className = "status-message";

        newPasswordInput.type = "password";
        confirmPasswordInput.type = "password";

        toggleButtons.forEach((button) => {
            button.classList.remove("active");
        });
    });
});