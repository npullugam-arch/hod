document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("loginBtn");
    const btnText = document.querySelector(".btn-text");
    const btnArrow = document.querySelector(".btn-arrow");
    const statusBox = document.getElementById("statusBox");
    const portalNote = document.getElementById("portalNote");
    const toggleButtons = document.querySelectorAll(".toggle-btn");

    const characterElements = document.querySelectorAll(".character");
    const charactersData = [];

    characterElements.forEach((char) => {
        charactersData.push({
            el: char,
            pupils: char.querySelectorAll(".pupil"),
            mouth: char.querySelector(".mouth"),
            body: char.querySelector(".body"),
        });
    });

    const mouthNeutral = "M -10 10 Q 0 15 10 10";
    const mouthSmile = "M -12 8 Q 0 20 12 8";
    const mouthOoh = "M -4 12 Q 0 5 4 12 Q 0 16 -4 12";
    const mouthFlat = "M -10 12 L 10 12";
    const mouthSurprise = "M 0 10 A 3 3 0 1 0 0 16 A 3 3 0 1 0 0 10";
    const mouthSad = "M -12 16 Q 0 8 12 16";

    let isPasswordFocused = false;
    let isUsernameHovered = false;
    let currentRole = "STUDENT";

    function setStatus(message, type) {
        statusBox.textContent = message;
        statusBox.className = "status-box show " + type;
    }

    function clearStatus() {
        statusBox.textContent = "";
        statusBox.className = "status-box";
    }

    function setButtonState(text, arrow, disabled = false, background = "") {
        btnText.textContent = text;
        btnArrow.textContent = arrow;
        loginBtn.disabled = disabled;
        loginBtn.style.background = background;
    }

    function resetButton() {
        setButtonState("Sign In", "→", false, "");
    }

    function resetToNeutral() {
        charactersData.forEach((char) => {
            gsap.to(char.mouth, {
                attr: { d: mouthNeutral },
                duration: 0.25,
            });

            gsap.to(char.pupils, {
                x: 0,
                y: 0,
                duration: 0.3,
            });

            const original = char.body.dataset.originalFill || char.body.getAttribute("fill");

            gsap.to(char.body, {
                fill: original,
                y: 0,
                duration: 0.3,
            });
        });
    }

    function updateRole(role) {
        currentRole = role;

        toggleButtons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.role === role);
        });

        portalNote.textContent =
            role === "STUDENT"
                ? "Selected Portal: Student"
                : "Selected Portal: HOD";

        clearStatus();
        resetToNeutral();
    }

    function playSuccessAnimation() {
        charactersData.forEach((char, index) => {
            gsap.to(char.mouth, {
                attr: { d: mouthSmile },
                duration: 0.2,
            });

            gsap.to(char.pupils, {
                x: 0,
                y: -2,
                duration: 0.2,
            });

            gsap.to(char.el, {
                y: -50,
                duration: 0.3,
                yoyo: true,
                repeat: 3,
                delay: index * 0.05,
                ease: "sine.inOut",
                onComplete: () => gsap.set(char.el, { y: 0 }),
            });
        });
    }

    function playErrorAnimation() {
        charactersData.forEach((char, index) => {
            gsap.to(char.mouth, {
                attr: { d: mouthSad },
                duration: 0.25,
            });

            gsap.to(char.pupils, {
                x: 0,
                y: 3,
                duration: 0.25,
            });

            gsap.to(char.el, {
                rotation: index % 2 === 0 ? -4 : 4,
                duration: 0.12,
                yoyo: true,
                repeat: 3,
                ease: "power1.inOut",
                onComplete: () => gsap.set(char.el, { rotation: 0 }),
            });
        });
    }

    function shadeColor(color, percent) {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);

        R = parseInt((R * (100 + percent)) / 100);
        G = parseInt((G * (100 + percent)) / 100);
        B = parseInt((B * (100 + percent)) / 100);

        R = R < 255 ? R : 255;
        G = G < 255 ? G : 255;
        B = B < 255 ? B : 255;

        const RR = R.toString(16).length === 1 ? "0" + R.toString(16) : R.toString(16);
        const GG = G.toString(16).length === 1 ? "0" + G.toString(16) : G.toString(16);
        const BB = B.toString(16).length === 1 ? "0" + B.toString(16) : B.toString(16);

        return "#" + RR + GG + BB;
    }

    toggleButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            updateRole(btn.dataset.role);
        });
    });

    document.addEventListener("mousemove", (e) => {
        if (isPasswordFocused) return;

        const moveX = (e.clientX / window.innerWidth - 0.5) * 8;
        const moveY = (e.clientY / window.innerHeight - 0.5) * 8;

        charactersData.forEach((char) => {
            gsap.to(char.pupils, {
                x: moveX,
                y: moveY,
                duration: 0.2,
                ease: "power2.out",
            });
        });
    });

    usernameInput.addEventListener("mouseenter", () => {
        if (isPasswordFocused) return;
        isUsernameHovered = true;

        charactersData.forEach((char, index) => {
            if (index % 2 === 0) {
                gsap.to(char.mouth, {
                    attr: { d: mouthSmile },
                    duration: 0.2,
                });
            } else {
                gsap.to(char.mouth, {
                    attr: { d: mouthSurprise },
                    duration: 0.2,
                });
                gsap.to(char.body, {
                    y: -5,
                    duration: 0.2,
                });
            }
        });
    });

    usernameInput.addEventListener("mouseleave", () => {
        isUsernameHovered = false;
        if (isPasswordFocused || document.activeElement === usernameInput) return;

        charactersData.forEach((char) => {
            gsap.to(char.mouth, {
                attr: { d: mouthNeutral },
                duration: 0.3,
            });

            gsap.to(char.body, {
                y: 0,
                duration: 0.3,
            });
        });
    });

    usernameInput.addEventListener("focus", () => {
        isPasswordFocused = false;
        clearStatus();

        charactersData.forEach((char) => {
            gsap.to(char.body, {
                y: 0,
                duration: 0.1,
            });

            gsap.to(char.pupils, {
                x: 0,
                y: 5,
                duration: 0.3,
            });

            gsap.to(char.mouth, {
                attr: { d: mouthOoh },
                duration: 0.3,
            });
        });
    });

    usernameInput.addEventListener("input", () => {
        charactersData.forEach((char) => {
            gsap.fromTo(char.body, { y: 0 }, { y: 6, duration: 0.1, yoyo: true, repeat: 1 });
        });
    });

    usernameInput.addEventListener("blur", () => {
        if (isPasswordFocused) return;

        charactersData.forEach((char) => {
            gsap.to(char.pupils, {
                x: 0,
                y: 0,
                duration: 0.5,
            });

            if (!isUsernameHovered) {
                gsap.to(char.mouth, {
                    attr: { d: mouthNeutral },
                    duration: 0.3,
                });
            }
        });
    });

    passwordInput.addEventListener("focus", () => {
        isPasswordFocused = true;
        clearStatus();

        charactersData.forEach((char, index) => {
            const lookDistX = index % 2 === 0 ? -7 : 7;

            gsap.to(char.pupils, {
                x: lookDistX,
                y: -7,
                duration: 0.5,
                ease: "power2.inOut",
            });

            gsap.to(char.mouth, {
                attr: { d: mouthFlat },
                duration: 0.3,
            });

            const currentColor = char.body.getAttribute("fill");
            char.body.dataset.originalFill = currentColor;

            gsap.to(char.body, {
                fill: shadeColor(currentColor, -10),
                duration: 0.3,
            });
        });
    });

    passwordInput.addEventListener("blur", () => {
        isPasswordFocused = false;
        resetToNeutral();
    });

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        clearStatus();

        if (!username || !password) {
            setStatus("Please enter username and password.", "error");
            playErrorAnimation();
            return;
        }

        setButtonState("Signing In...", "⌛", true);

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
                throw new Error(errText || "Login failed");
            }

            const data = await response.json();

            if (data.role === "ADMIN") {
                throw new Error("Admin login is allowed only from /admin page.");
            }

            if (data.role !== currentRole) {
                throw new Error(`This account belongs to ${data.role}. Please select the correct portal.`);
            }

            localStorage.setItem("user", JSON.stringify(data));

            playSuccessAnimation();
            setButtonState("Access Granted", "✓", true, "linear-gradient(135deg, #1a6b47, #2f9e6f)");

            if (data.role === "STUDENT") {
                setStatus("✓ Student authentication successful!", "success");
            } else if (data.role === "HOD") {
                setStatus("✓ HOD authentication successful!", "success");
            }

            setTimeout(() => {
                if (data.role === "STUDENT") {
                    window.location.href = "student.html";
                } else if (data.role === "HOD") {
                    window.location.href = "hod.html";
                } else {
                    setStatus("Unknown role returned from server.", "error");
                    resetButton();
                }
            }, 1000);
        } catch (error) {
            playErrorAnimation();
            setButtonState("Access Denied", "✗", true, "linear-gradient(135deg, #8b1a1a, #d64545)");

            const message =
                error.message === "Failed to fetch"
                    ? "Unable to reach the server. Please check that the app is running."
                    : error.message;

            setStatus(message, "error");

            setTimeout(() => {
                resetButton();
            }, 2000);
        }
    });

    updateRole("STUDENT");
});