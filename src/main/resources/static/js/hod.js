const user = JSON.parse(localStorage.getItem("user"));

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
    const empId = getHodEmployeeId();
    return `https://www.iare.ac.in/sites/default/files/${empId}_0.png`;
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
        hodHeaderPhotoEl.src = photoUrl;
        hodHeaderPhotoEl.onerror = function () {
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
    document.getElementById("pageSubtitle").textContent = "Manage this section from the right panel.";

    document.getElementById("dashboardSection").classList.add("hidden");
    document.getElementById("iframeSection").classList.remove("hidden");

    const frame = document.getElementById("contentFrame");
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

function loadDashboardCounts() {
    fetch(`/hod/${user.id}/requests`)
        .then((res) => {
            if (!res.ok) throw new Error("Failed to load requests");
            return res.json();
        })
        .then((data) => {
            let pendingCount = 0;
            let certificatePendingCount = 0;
            let approvedCount = 0;
            let rejectedCount = 0;

            data.forEach((req) => {
                if (req.status === "PENDING") pendingCount++;
                else if (req.status === "APPROVED") {
                    approvedCount++;
                    if (!req.certificate) certificatePendingCount++;
                } else if (req.status === "REJECTED") rejectedCount++;
            });

            animateCount("totalCount", data.length);
            animateCount("pendingCount", pendingCount);
            animateCount("certificatePendingCount", certificatePendingCount);
            animateCount("approvedCount", approvedCount);
            animateCount("rejectedCount", rejectedCount);
        })
        .catch(() => {
            ["totalCount", "pendingCount", "certificatePendingCount", "approvedCount", "rejectedCount"]
                .forEach(id => document.getElementById(id).textContent = "0");
        });
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}