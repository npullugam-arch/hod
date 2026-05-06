const user = JSON.parse(localStorage.getItem("user"));
let resolvedStudent = null;
let resolvedStudentPromise = null;

const CERTIFICATE_REQUIRED_REASONS = [
    "HACKATHON",
    "SEMINAR",
    "MEDICAL LEAVE",
    "SPORTS EVENT",
    "WORKSHOP / TRAINING",
    "INTERNSHIP"
];

if (!user) {
    window.location.href = "index.html";
}

window.addEventListener("DOMContentLoaded", async () => {
    bindSidebarEvents();
    updatePasswordMenuVisibility();
    await setStudentInfo();
    showDashboard();
});

function bindSidebarEvents() {
    const menuToggle = document.getElementById("menuToggle");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileCloseBtn = document.getElementById("mobileCloseBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const sidePanel = document.getElementById("sidePanel");

    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            document.body.classList.toggle("sidebar-collapsed");
        });
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", () => {
            sidePanel.classList.add("mobile-open");
            sidebarOverlay.classList.add("active");
        });
    }

    const closeMobileSidebar = () => {
        sidePanel.classList.remove("mobile-open");
        sidebarOverlay.classList.remove("active");
    };

    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener("click", closeMobileSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeMobileSidebar);
    }

    window.closeMobileSidebar = closeMobileSidebar;
}

function updatePasswordMenuVisibility() {
    const passwordNavItem = document.getElementById("updatePasswordNavItem");
    if (!passwordNavItem) return;

    const currentUser = JSON.parse(localStorage.getItem("user"));
    const passwordChanged = currentUser?.passwordChanged === true;

    passwordNavItem.style.display = passwordChanged ? "none" : "block";
}

function hidePasswordMenuAfterUpdate() {
    const currentUser = JSON.parse(localStorage.getItem("user")) || {};
    currentUser.passwordChanged = true;
    localStorage.setItem("user", JSON.stringify(currentUser));
    updatePasswordMenuVisibility();
}

async function setStudentInfo() {
    const studentNameEl = document.getElementById("studentName");
    const studentIdEl = document.getElementById("studentId");
    const userInitialEl = document.getElementById("userInitial");

    let displayName = user?.username || user?.name || "Student";
    let displayId = user?.rollNumber || user?.studentId || user?.id || "-";
    const initial = String(displayName).charAt(0).toUpperCase();

    if (studentNameEl) studentNameEl.textContent = displayName;
    if (studentIdEl) studentIdEl.textContent = displayId;
    if (userInitialEl) userInitialEl.textContent = initial;

    try {
        const student = await getResolvedStudent();

        displayName = student?.name || user?.username || user?.name || "Student";
        displayId = student?.rollNo || student?.rollNumber || user?.rollNumber || user?.studentId || user?.id || "-";
        const updatedInitial = String(displayName).charAt(0).toUpperCase();

        if (studentNameEl) studentNameEl.textContent = displayName;
        if (studentIdEl) studentIdEl.textContent = displayId;
        if (userInitialEl) userInitialEl.textContent = updatedInitial;

        setStudentHeaderProfileImage(displayId, updatedInitial);
    } catch (error) {
        console.error("Header profile load error:", error);
        showStudentHeaderAvatar(initial);
    }
}

function setStudentHeaderProfileImage(rollNo, initial) {
    const imageEl = document.getElementById("studentProfileImage");
    const avatarEl = document.getElementById("userInitial");

    if (!imageEl || !avatarEl) return;

    if (!rollNo || rollNo === "-") {
        showStudentHeaderAvatar(initial);
        return;
    }

    const cleanRollNo = String(rollNo).trim().toUpperCase();
    const imageUrl = `https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${cleanRollNo}/${cleanRollNo}.jpg`;

    imageEl.onload = function () {
        imageEl.style.display = "block";
        avatarEl.style.display = "none";
    };

    imageEl.onerror = function () {
        showStudentHeaderAvatar(initial);
    };

    imageEl.src = imageUrl;
}

function showStudentHeaderAvatar(initial) {
    const imageEl = document.getElementById("studentProfileImage");
    const avatarEl = document.getElementById("userInitial");

    if (!imageEl || !avatarEl) return;

    avatarEl.textContent = initial || "S";
    avatarEl.style.display = "flex";
    imageEl.style.display = "none";
    imageEl.removeAttribute("src");
}

function setActiveNav(clickedLink) {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });

    if (clickedLink) {
        clickedLink.classList.add("active");
    }
}

function setIframeMode(enabled) {
    document.body.classList.toggle("iframe-mode", enabled);
}

function showDashboard(event) {
    if (event) {
        event.preventDefault();
        setActiveNav(event.currentTarget);
    } else {
        const dashboardNav = document.querySelector('.nav-link[data-page="dashboard"]');
        if (dashboardNav) {
            setActiveNav(dashboardNav);
        }
    }

    setIframeMode(false);
    setHeader("Dashboard", "Welcome back! View your request summary here.", "fa-chart-bar");

    const dashboardSection = document.getElementById("dashboardSection");
    const iframeSection = document.getElementById("iframeSection");
    const contentFrame = document.getElementById("contentFrame");

    if (dashboardSection) dashboardSection.classList.remove("hidden");
    if (iframeSection) iframeSection.classList.add("hidden");

    if (contentFrame) {
        contentFrame.src = "";
        contentFrame.removeAttribute("src");
    }

    loadDashboardCounts();
    loadDashboardCertificateUploads();
    loadUnreadReminderCount();
    updatePasswordMenuVisibility();

    if (window.innerWidth <= 900 && typeof window.closeMobileSidebar === "function") {
        window.closeMobileSidebar();
    }

    window.scrollTo({ top: 0, behavior: "auto" });
}

function loadPage(event, pageUrl, title) {
    if (event) {
        event.preventDefault();
        setActiveNav(event.currentTarget);
    }

    setIframeMode(true);

    let subtitle = "Manage your student information here.";
    let icon = "fa-folder-open";

    if (title === "Apply for Permission") {
        subtitle = "Submit a new permission request from this section.";
        icon = "fa-file-lines";
    } else if (title === "My Requests") {
        subtitle = "View all your submitted requests here.";
        icon = "fa-folder";
    } else if (title === "Upload Certificate") {
        subtitle = "Upload certificates for approved requests.";
        icon = "fa-cloud-arrow-up";
    } else if (title === "Reminders") {
        subtitle = "View your reminder notifications here.";
        icon = "fa-bell";
    } else if (title === "Profile") {
        subtitle = "View your student profile details here.";
        icon = "fa-address-book";
    } else if (title === "Update Password") {
        subtitle = "Update your password for future logins.";
        icon = "fa-key";
    }

    setHeader(title, subtitle, icon);

    const dashboardSection = document.getElementById("dashboardSection");
    const iframeSection = document.getElementById("iframeSection");
    const frame = document.getElementById("contentFrame");

    if (dashboardSection) dashboardSection.classList.add("hidden");
    if (iframeSection) {
        iframeSection.classList.remove("hidden");
        iframeSection.classList.add("iframe-loading");
    }

    if (frame) {
        if (frame._resizeObserver) {
            frame._resizeObserver.disconnect();
            frame._resizeObserver = null;
        }

        frame.style.setProperty("height", "0px", "important");
        frame.style.setProperty("min-height", "0px", "important");
        frame.style.setProperty("overflow", "hidden", "important");
        frame.setAttribute("scrolling", "no");

        frame.onerror = function () {
            alert("Unable to load " + title + " right now.");
            if (iframeSection) iframeSection.classList.remove("iframe-loading");
        };

        frame.onload = function () {
            try {
                const iframeDoc = frame.contentDocument || frame.contentWindow.document;
                const docEl = iframeDoc.documentElement;
                const body = iframeDoc.body;

                if (docEl) {
                    docEl.style.overflow = "hidden";
                    docEl.style.height = "auto";
                    docEl.style.minHeight = "0";
                    docEl.style.scrollbarWidth = "none";
                }

                if (body) {
                    body.style.overflow = "hidden";
                    body.style.height = "auto";
                    body.style.minHeight = "0";
                    body.style.margin = "0";
                    body.style.padding = "0";
                    body.style.background = "transparent";
                    body.style.scrollbarWidth = "none";
                }

                const resizeIframe = () => {
                    try {
                        const contentRoot =
                            iframeDoc.querySelector(".standalone-wrapper") ||
                            iframeDoc.querySelector(".page-wrap") ||
                            iframeDoc.querySelector(".content-card") ||
                            body;

                        if (!contentRoot) return;

                        const rectHeight = Math.ceil(contentRoot.getBoundingClientRect().height || 0);
                        const scrollHeight = Math.ceil(contentRoot.scrollHeight || 0);
                        const offsetHeight = Math.ceil(contentRoot.offsetHeight || 0);

                        const finalHeight = Math.max(rectHeight, scrollHeight, offsetHeight, 300);

                        frame.style.setProperty("height", finalHeight + "px", "important");
                        frame.style.setProperty("min-height", finalHeight + "px", "important");
                    } catch (resizeError) {
                        console.warn("Iframe resize error:", resizeError);
                    }
                };

                resizeIframe();

                setTimeout(resizeIframe, 50);
                setTimeout(resizeIframe, 150);
                setTimeout(resizeIframe, 400);
                setTimeout(resizeIframe, 900);
                setTimeout(resizeIframe, 1500);

                if (window.ResizeObserver) {
                    const observedTarget =
                        iframeDoc.querySelector(".standalone-wrapper") ||
                        iframeDoc.body;

                    if (observedTarget) {
                        const observer = new ResizeObserver(() => resizeIframe());
                        observer.observe(observedTarget);
                        frame._resizeObserver = observer;
                    }
                }

                requestAnimationFrame(() => {
                    resizeIframe();
                    if (iframeSection) iframeSection.classList.remove("iframe-loading");
                });
            } catch (error) {
                console.warn("Iframe resize failed:", error);
                frame.style.setProperty("height", "600px", "important");
                frame.style.setProperty("min-height", "600px", "important");
                if (iframeSection) iframeSection.classList.remove("iframe-loading");
            }

            window.scrollTo({ top: 0, behavior: "auto" });
        };

        const resolvedPageUrl = new URL(pageUrl, window.location.href);

        frame.style.setProperty("overflow", "hidden", "important");
        frame.setAttribute("scrolling", "no");

        frame.src = resolvedPageUrl.pathname + "?t=" + new Date().getTime();
    }

    if (window.innerWidth <= 900 && typeof window.closeMobileSidebar === "function") {
        window.closeMobileSidebar();
    }
}

function loadProfilePage(event) {
    if (event) {
        event.preventDefault();
    }

    const profileNav = document.querySelector('.nav-link[data-page="profile"]');
    if (profileNav) {
        setActiveNav(profileNav);
    }

    loadPage({ preventDefault: () => {} }, "profile.html", "Profile");
}

function setHeader(title, subtitle, iconClass) {
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const headerIcon = document.getElementById("headerIcon");

    if (pageTitle) pageTitle.textContent = title;
    if (pageSubtitle) pageSubtitle.textContent = subtitle;
    if (headerIcon) headerIcon.className = "fa-solid " + iconClass;
}

function normalizeReason(reason) {
    return String(reason || "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}

function isCertificateRequired(reason) {
    return CERTIFICATE_REQUIRED_REASONS.includes(normalizeReason(reason));
}

function hasUploadedCertificate(req) {
    return !!(req.certificate && req.certificate.filePath);
}

function loadDashboardCounts() {
    getResolvedStudent()
        .then(student => {
            const studentId = student?.id || user?.id;

            if (!studentId) {
                throw new Error("Student ID not found");
            }

            return fetch(`/request/student/${studentId}/summary`);
        })
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to load dashboard data");
            }
            return res.json();
        })
        .then(summary => {
            animateCounter("approvedCount", summary.approvedCount);
            animateCounter("pendingCount", summary.pendingCount);
            animateCounter("certificateCount", summary.certificatePendingCount);
            animateCounter("totalCount", summary.totalCount);
        })
        .catch(error => {
            console.error(error);
            animateCounter("approvedCount", 0);
            animateCounter("pendingCount", 0);
            animateCounter("certificateCount", 0);
            animateCounter("totalCount", 0);
        });
}

async function getResolvedStudent() {
    if (resolvedStudent) {
        return resolvedStudent;
    }

    if (!resolvedStudentPromise) {
        const userId = user?.id;

        if (!userId) {
            throw new Error("User ID not found");
        }

        resolvedStudentPromise = fetch(`/student/user/${userId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Unable to load student info");
                }

                return response.json();
            })
            .then(student => {
                resolvedStudent = student;
                return student;
            })
            .catch(error => {
                resolvedStudentPromise = null;
                throw error;
            });
    }

    return resolvedStudentPromise;
}

function animateCounter(elementId, target) {
    const counter = document.getElementById(elementId);
    if (!counter) return;

    const safeTarget = Number(target) || 0;
    counter.setAttribute("data-target", String(safeTarget));

    const animationDuration = 900;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / animationDuration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentCount = Math.floor(easeOutQuart * safeTarget);

        counter.textContent = currentCount < 10 ? "0" + currentCount : String(currentCount);

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            counter.textContent = safeTarget < 10 ? "0" + safeTarget : String(safeTarget);
            counter.classList.remove("pop");
            void counter.offsetWidth;
            counter.classList.add("pop");
        }
    }

    requestAnimationFrame(updateCounter);
}

function loadUnreadReminderCount() {
    fetch(`/notification/unread/${user.id}`)
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to load unread reminders");
            }
            return res.json();
        })
        .then(data => {
            const badge = document.getElementById("reminderBadge");
            if (!badge) return;

            const unreadCount = Array.isArray(data) ? data.length : 0;

            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
                badge.style.display = "inline-block";
            } else {
                badge.textContent = "0";
                badge.style.display = "none";
            }
        })
        .catch(error => {
            console.error(error);
            const badge = document.getElementById("reminderBadge");
            if (badge) {
                badge.textContent = "0";
                badge.style.display = "none";
            }
        });
}

async function loadDashboardCertificateUploads() {
    const card = document.getElementById("dashboardCertificateCard");
    const list = document.getElementById("dashboardCertificateList");
    const statusBox = document.getElementById("dashboardCertificateStatus");

    if (!card || !list || !statusBox) return;

    card.style.display = "none";
    list.innerHTML = "";
    statusBox.textContent = "";

    try {
        const student = await getResolvedStudent();
        const studentId = student?.id || user?.id;

        if (!studentId) {
            throw new Error("Student ID not found");
        }

        const res = await fetch(`/request/student/${studentId}/certificate-pending`);

        if (!res.ok) {
            throw new Error("Unable to load certificate pending requests");
        }

        const pendingCertificateRequests = await res.json();
        const safeRequests = Array.isArray(pendingCertificateRequests) ? pendingCertificateRequests : [];

        if (safeRequests.length === 0) {
            card.style.display = "none";
            return;
        }

        card.style.display = "block";

        statusBox.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            ${safeRequests.length} certificate upload pending.
        `;

        list.innerHTML = safeRequests.map(req => buildDashboardCertificateItem(req)).join("");

    } catch (error) {
        console.error("Dashboard certificate load error:", error);
    }
}

function buildDashboardCertificateItem(req) {
    const requestId = req.requestId;
    const reason = escapeHtml(req.reason || "Certificate Required");
    const endDate = formatDashboardDate(req.endDate);
    const dueDate = formatDashboardDate(req.certificateDueDate);
    const hodName = escapeHtml(req.hodName || req.hodUsername || "HOD");

    return `
        <div class="dashboard-cert-item">
            <div class="dashboard-cert-info">
                <h3>${reason}</h3>
                <p><strong>HOD:</strong> ${hodName}</p>
                <p><strong>Event End:</strong> ${endDate} | <strong>Due:</strong> ${dueDate}</p>
            </div>

            <div class="dashboard-cert-upload">
                <input 
                    type="file" 
                    id="dashboard-cert-file-${requestId}" 
                    class="dashboard-hidden-file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onchange="uploadDashboardCertificate(${requestId})"
                />

                <label for="dashboard-cert-file-${requestId}" class="dashboard-cert-upload-btn">
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                    Upload Certificate
                </label>
            </div>
        </div>
    `;
}

function uploadDashboardCertificate(requestId) {
    const fileInput = document.getElementById(`dashboard-cert-file-${requestId}`);

    if (!fileInput || fileInput.files.length === 0) {
        alert("Please select a certificate file.");
        return;
    }

    const file = fileInput.files[0];
    const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
    const fileName = file.name.toLowerCase();
    const extension = fileName.includes(".") ? fileName.split(".").pop() : "";

    if (!allowedExtensions.includes(extension)) {
        fileInput.value = "";
        alert("Only JPG, JPEG, PNG, and PDF files are allowed.");
        return;
    }

    if (file.size > 1024 * 1024) {
        fileInput.value = "";
        alert("File size is more than 1 MB.");
        return;
    }

    const formData = new FormData();
    formData.append("requestId", requestId);
    formData.append("file", file);

    fetch("/certificate/upload", {
        method: "POST",
        body: formData
    })
        .then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to upload certificate");
            }
            return res.json();
        })
        .then(() => {
            alert("Certificate uploaded successfully!");
            loadDashboardCounts();
            loadDashboardCertificateUploads();
        })
        .catch(error => {
            console.error(error);
            alert(error.message || "Certificate upload failed.");
        });
}

function formatDashboardDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);

    return `${dd}-${mm}-${yy}`;
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}
