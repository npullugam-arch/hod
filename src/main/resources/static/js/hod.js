const user = JSON.parse(localStorage.getItem("user"));
const HOD_PHOTO_MAP = {
    IARE10044: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSCMZwwMTjidtPfcEX_ENvNeuBjJVB_5bdipg&s",
    IARE10862: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYYUJj3qxUm_1sbOIcIzwEGbSbrxnjfYhjZQ&s",
    IARE10033: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRModZ8yZYVjYdFjW5M5id654sapIyUyUXkNA&s",
    IARE10952: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEbJV9Gy3r4oT5KHyz2yrxpmOneQCaeSTU4w&s"
};

let dashboardCountsPromise = null;

if (!user) {
    window.location.href = "index.html";
}

window.onload = function () {
    initializeSidebar();
    setHodInfo();
    showDashboard();
};

function getHodEmployeeId() {
    return user.employeeId || user.employee_id || user.username || "IARE10033";
}

function getHodName() {
    return user.name || user.fullName || user.username || "HOD";
}

function getHodPhotoUrl() {
    const empId = String(getHodEmployeeId() || "").trim().toUpperCase();

    if (!empId) {
        return "";
    }

    if (HOD_PHOTO_MAP[empId]) {
        return HOD_PHOTO_MAP[empId];
    }

    return `https://www.iare.ac.in/sites/default/files/${encodeURIComponent(empId)}_0.png`;
}

function initializeSidebar() {
    const menuToggle = document.getElementById("menuToggle");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileCloseBtn = document.getElementById("mobileCloseBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const sidePanel = document.getElementById("sidePanel");

    if (menuToggle) {
        menuToggle.addEventListener("click", function () {
            document.body.classList.toggle("sidebar-collapsed");
        });
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", function () {
            sidePanel.classList.add("mobile-open");
            sidebarOverlay.classList.add("active");
        });
    }

    if (mobileCloseBtn) mobileCloseBtn.addEventListener("click", closeMobileSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeMobileSidebar);

    function closeMobileSidebar() {
        sidePanel.classList.remove("mobile-open");
        sidebarOverlay.classList.remove("active");
    }

    window.closeMobileSidebar = closeMobileSidebar;
}

function setHodInfo() {
    const hodName = getHodName();
    const employeeId = getHodEmployeeId();
    const photoUrl = getHodPhotoUrl();

    const hodNameEl = document.getElementById("hodName");
    const hodEmployeeIdEl = document.getElementById("hodEmployeeId");
    const hodHeaderPhotoEl = document.getElementById("hodHeaderPhoto");
    const updatePasswordNav = document.getElementById("updatePasswordNav");

    if (hodNameEl) hodNameEl.textContent = hodName;
    if (hodEmployeeIdEl) hodEmployeeIdEl.textContent = employeeId;

    if (hodHeaderPhotoEl) {
        hodHeaderPhotoEl.loading = "lazy";
        hodHeaderPhotoEl.src = photoUrl;
        hodHeaderPhotoEl.onerror = function () {
            this.onerror = null;
            this.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(hodName) + "&background=2563eb&color=fff";
        };
    }

    if (updatePasswordNav && user.passwordChanged === true) {
        updatePasswordNav.style.display = "none";
    }
}

function setActiveNav(clickedItem) {
    document.querySelectorAll(".nav-link").forEach((item) => {
        item.classList.remove("active");
    });

    if (clickedItem) clickedItem.classList.add("active");
}

function showDashboard(event) {
    if (event) {
        event.preventDefault();
        setActiveNav(event.currentTarget);
    } else {
        const dashboardNav = document.querySelector('.nav-link[data-page="dashboard"]');
        if (dashboardNav) setActiveNav(dashboardNav);
    }

    document.getElementById("pageTitle").textContent = "Dashboard";
    document.getElementById("pageSubtitle").textContent = "Overview of requests and certificate submissions.";

    document.getElementById("dashboardSection").classList.remove("hidden");
    document.getElementById("iframeSection").classList.add("hidden");
    document.getElementById("contentFrame").src = "";

    loadDashboardCounts();

    if (window.innerWidth <= 900 && typeof window.closeMobileSidebar === "function") {
        window.closeMobileSidebar();
    }
}

function loadPage(event, pageUrl, title) {
    event.preventDefault();
    setActiveNav(event.currentTarget);

    document.getElementById("pageTitle").textContent = title;

    if (title === "All Requests") {
        document.getElementById("pageSubtitle").textContent = "View all student requests with status, dates and remarks.";
    } else {
        document.getElementById("pageSubtitle").textContent = "Manage this section from the right panel.";
    }

    document.getElementById("dashboardSection").classList.add("hidden");
    document.getElementById("iframeSection").classList.remove("hidden");

    const frame = document.getElementById("contentFrame");
    if (frame._resizeObserver) {
        frame._resizeObserver.disconnect();
        frame._resizeObserver = null;
    }

    frame.style.overflow = "hidden";
    frame.setAttribute("scrolling", "no");
    frame.style.visibility = "hidden";
    frame.style.setProperty("height", "0px", "important");
    frame.style.setProperty("min-height", "0px", "important");

    frame.onerror = function () {
        frame.style.visibility = "visible";
        alert("Unable to load " + title + " right now.");
    };

    frame.onload = function () {
        try {
            const iframeDoc = frame.contentDocument || frame.contentWindow.document;

            const resizeIframe = () => {
                try {
                    const docEl = iframeDoc.documentElement;
                    const body = iframeDoc.body;

                    if (!docEl || !body) return;

                    docEl.style.overflow = "hidden";
                    docEl.style.height = "auto";
                    body.style.overflow = "hidden";
                    body.style.height = "auto";

                    const contentRoot =
                        iframeDoc.querySelector(".standalone-wrapper") ||
                        iframeDoc.querySelector(".page-wrap") ||
                        iframeDoc.querySelector(".table-card") ||
                        iframeDoc.querySelector(".content-card") ||
                        body;

                    const rectHeight = Math.ceil(contentRoot.getBoundingClientRect().height || 0);
                    const bodyScrollHeight = Math.ceil(body.scrollHeight || 0);
                    const bodyOffsetHeight = Math.ceil(body.offsetHeight || 0);
                    const htmlScrollHeight = Math.ceil(docEl.scrollHeight || 0);
                    const htmlOffsetHeight = Math.ceil(docEl.offsetHeight || 0);

                    const finalHeight = Math.max(
                        rectHeight,
                        bodyScrollHeight,
                        bodyOffsetHeight,
                        htmlScrollHeight,
                        htmlOffsetHeight,
                        320
                    );

                    frame.style.setProperty("height", finalHeight + "px", "important");
                    frame.style.setProperty("min-height", finalHeight + "px", "important");
                    frame.style.visibility = "visible";
                } catch (resizeError) {
                    console.warn("HOD iframe resize error:", resizeError);
                }
            };

            resizeIframe();
            setTimeout(resizeIframe, 100);
            setTimeout(resizeIframe, 300);
            setTimeout(resizeIframe, 800);
            setTimeout(resizeIframe, 1500);

            if (window.ResizeObserver) {
                const observedTarget =
                    iframeDoc.querySelector(".standalone-wrapper") ||
                    iframeDoc.querySelector(".page-wrap") ||
                    iframeDoc.body;

                const observer = new ResizeObserver(() => resizeIframe());
                observer.observe(observedTarget);
                frame._resizeObserver = observer;
            }
        } catch (error) {
            console.warn("HOD iframe resize failed:", error);
            frame.style.setProperty("height", "600px", "important");
            frame.style.setProperty("min-height", "600px", "important");
            frame.style.visibility = "visible";
        }

        window.scrollTo({ top: 0, behavior: "auto" });
    };

    frame.src = pageUrl + "?t=" + new Date().getTime();

    if (window.innerWidth <= 900 && typeof window.closeMobileSidebar === "function") {
        window.closeMobileSidebar();
    }
}

function animateCount(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const finalValue = Number(targetValue) || 0;
    const duration = 900;
    const startTime = performance.now();

    function update(currentTime) {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(easedProgress * finalValue);

        element.textContent = currentValue;

        if (progress < 1) requestAnimationFrame(update);
        else element.textContent = finalValue;
    }

    requestAnimationFrame(update);
}

function setDashboardCountsLoading() {
    ["totalCount", "pendingCount", "certificatePendingCount", "approvedCount", "rejectedCount"]
        .forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = "Loading...";
            }
        });
}

function setDashboardCountsError() {
    ["totalCount", "pendingCount", "certificatePendingCount", "approvedCount", "rejectedCount"]
        .forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = "0";
                element.title = "Unable to load dashboard counts";
            }
        });
}

function loadDashboardCounts() {
    if (dashboardCountsPromise) {
        return dashboardCountsPromise;
    }

    setDashboardCountsLoading();

    dashboardCountsPromise = fetch(`/hod/${user.id}/dashboard-summary`)
        .then((res) => {
            if (!res.ok) throw new Error("Failed to load dashboard summary");
            return res.json();
        })
        .then((summary) => {
            animateCount("totalCount", summary.totalCount);
            animateCount("pendingCount", summary.pendingCount);
            animateCount("certificatePendingCount", summary.certificatePendingCount);
            animateCount("approvedCount", summary.approvedCount);
            animateCount("rejectedCount", summary.rejectedCount);
        })
        .catch(() => {
            setDashboardCountsError();
        })
        .finally(() => {
            dashboardCountsPromise = null;
        });

    return dashboardCountsPromise;
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}
