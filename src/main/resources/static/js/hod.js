const user = JSON.parse(localStorage.getItem("user"));
const HOD_PHOTO_MAP = {
    IARE10044: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSCMZwwMTjidtPfcEX_ENvNeuBjJVB_5bdipg&s",
    IARE10862: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYYUJj3qxUm_1sbOIcIzwEGbSbrxnjfYhjZQ&s",
    IARE10033: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRModZ8yZYVjYdFjW5M5id654sapIyUyUXkNA&s",
    IARE10952: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEbJV9Gy3r4oT5KHyz2yrxpmOneQCaeSTU4w&s"
};

let dashboardCountsPromise = null;
const DASHBOARD_CACHE_PREFIX = "sanchara_dashboard_cache_";
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
const HOD_DASHBOARD_ROLE = "HOD";

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

function getHodDashboardCacheKey() {
    return `${DASHBOARD_CACHE_PREFIX}${HOD_DASHBOARD_ROLE}_${String(user?.id || "anonymous")}`;
}

function saveDashboardCache(key, data, role = HOD_DASHBOARD_ROLE) {
    try {
        localStorage.setItem(key, JSON.stringify({
            userId: String(user?.id || ""),
            role,
            savedAt: Date.now(),
            data
        }));
    } catch (error) {
        console.warn("Dashboard cache save failed:", error);
    }
}

function getDashboardCache(key) {
    try {
        const rawValue = localStorage.getItem(key);
        if (!rawValue) return null;
        return JSON.parse(rawValue);
    } catch (error) {
        console.warn("Dashboard cache read failed:", error);
        return null;
    }
}

function clearDashboardCache(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn("Dashboard cache clear failed:", error);
    }
}

function isDashboardCacheValid(cache, role = HOD_DASHBOARD_ROLE) {
    return Boolean(
        cache &&
        cache.data &&
        String(cache.userId || "") === String(user?.id || "") &&
        String(cache.role || "") === role &&
        Number(cache.savedAt || 0) > 0 &&
        (Date.now() - Number(cache.savedAt || 0)) <= DASHBOARD_CACHE_TTL_MS
    );
}

function areDashboardDataEqual(previousData, nextData) {
    try {
        return JSON.stringify(previousData || null) === JSON.stringify(nextData || null);
    } catch (error) {
        return false;
    }
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
    const mobileHodHeaderPhotoEl = document.getElementById("mobileHodHeaderPhoto");
    const userProfileCard = document.querySelector(".user-profile-card");
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

    if (mobileHodHeaderPhotoEl) {
        mobileHodHeaderPhotoEl.loading = "lazy";
        mobileHodHeaderPhotoEl.src = photoUrl;
        mobileHodHeaderPhotoEl.onerror = function () {
            this.onerror = null;
            this.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(hodName) + "&background=2563eb&color=fff";
        };
    }

    if (updatePasswordNav && user.passwordChanged === true) {
        updatePasswordNav.style.display = "none";
    }

    if (userProfileCard) {
        userProfileCard.onclick = function () {
            loadHodProfilePage();
        };
    }
}

function loadHodProfilePage(event) {
    if (event) {
        event.preventDefault();
    }

    loadPage(
        { preventDefault: () => {}, currentTarget: document.querySelector('.nav-link[onclick*="hod-profile.html"]') },
        "hod-profile.html",
        "HOD Profile"
    );
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

    const cache = getDashboardCache(getHodDashboardCacheKey());

    if (cache?.data) {
        applyHodDashboardCacheData(cache.data, { animateCounts: false });

        if (!isDashboardCacheValid(cache)) {
            refreshDashboardCache({ silent: true, force: true }).catch(() => {});
        }
    } else {
        refreshDashboardCache({ silent: false, force: true }).catch(() => {});
    }

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

function animateCount(elementId, targetValue, delay = 0) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const finalValue = Number(targetValue) || 0;

    setTimeout(() => {
        element.classList.add("count-animating");

        const duration = 2200;
        const startTime = performance.now();

        function update(currentTime) {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 5);
            const currentValue = Math.floor(easedProgress * finalValue);

            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = finalValue;
                element.classList.remove("count-animating");
                element.classList.add("count-finished");

                setTimeout(() => {
                    element.classList.remove("count-finished");
                }, 700);
            }
        }

        requestAnimationFrame(update);
    }, delay);
}

function resetDashboardCountsToZero() {
    ["totalCount", "approvedCount", "pendingCount", "rejectedCount", "certificatePendingCount"]
        .forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = "0";
                element.title = "";
            }
        });
}

function setDashboardCountsError() {
    resetDashboardCountsToZero();

    ["totalCount", "approvedCount", "pendingCount", "rejectedCount", "certificatePendingCount"]
        .forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.title = "Unable to load dashboard counts";
            }
        });
}

function setCounterValue(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const safeValue = Number(targetValue) || 0;
    element.textContent = safeValue;
}

function renderHodDashboardSummary(summary, animate = false) {
    const safeSummary = summary || {};

    if (animate) {
        animateCount("totalCount", safeSummary.totalCount, 300);
        animateCount("approvedCount", safeSummary.approvedCount, 1200);
        animateCount("pendingCount", safeSummary.pendingCount, 2100);
        animateCount("rejectedCount", safeSummary.rejectedCount, 3000);
        animateCount("certificatePendingCount", safeSummary.certificatePendingCount, 3900);
        return;
    }

    setCounterValue("totalCount", safeSummary.totalCount);
    setCounterValue("approvedCount", safeSummary.approvedCount);
    setCounterValue("pendingCount", safeSummary.pendingCount);
    setCounterValue("rejectedCount", safeSummary.rejectedCount);
    setCounterValue("certificatePendingCount", safeSummary.certificatePendingCount);
}

function applyHodDashboardCacheData(data, options = {}) {
    if (!data) return;

    if (data.profile) {
        const hodNameEl = document.getElementById("hodName");
        const hodEmployeeIdEl = document.getElementById("hodEmployeeId");
        const hodHeaderPhotoEl = document.getElementById("hodHeaderPhoto");
        const mobileHodHeaderPhotoEl = document.getElementById("mobileHodHeaderPhoto");

        if (hodNameEl && data.profile.hodName) hodNameEl.textContent = data.profile.hodName;
        if (hodEmployeeIdEl && data.profile.employeeId) hodEmployeeIdEl.textContent = data.profile.employeeId;

        if (hodHeaderPhotoEl && data.profile.photoUrl) {
            hodHeaderPhotoEl.src = data.profile.photoUrl;
        }

        if (mobileHodHeaderPhotoEl && data.profile.photoUrl) {
            mobileHodHeaderPhotoEl.src = data.profile.photoUrl;
        }
    }

    renderHodDashboardSummary(data.summary, options.animateCounts === true);
}

function buildHodDashboardCacheData(summary) {
    return {
        profile: {
            hodName: getHodName(),
            employeeId: getHodEmployeeId(),
            photoUrl: getHodPhotoUrl()
        },
        summary: summary || {}
    };
}

function refreshDashboardCache(options = {}) {
    const silent = options.silent === true;
    const force = options.force === true;
    const cacheKey = getHodDashboardCacheKey();
    const existingCache = getDashboardCache(cacheKey);

    if (!force && isDashboardCacheValid(existingCache) && existingCache?.data) {
        if (!silent) {
            applyHodDashboardCacheData(existingCache.data, { animateCounts: false });
        }
        return Promise.resolve(existingCache.data);
    }

    if (dashboardCountsPromise) {
        return dashboardCountsPromise;
    }

    if (!silent || !existingCache?.data) {
        resetDashboardCountsToZero();
    }

    dashboardCountsPromise = fetch(`/hod/${user.id}/dashboard-summary`)
        .then((res) => {
            if (!res.ok) throw new Error("Failed to load dashboard summary");
            return res.json();
        })
        .then((summary) => {
            const dashboardData = buildHodDashboardCacheData(summary);
            const hasChanged = !areDashboardDataEqual(existingCache?.data, dashboardData);

            saveDashboardCache(cacheKey, dashboardData, HOD_DASHBOARD_ROLE);

            if (!silent || hasChanged || !existingCache?.data) {
                applyHodDashboardCacheData(dashboardData, {
                    animateCounts: !existingCache?.data && !silent
                });
            }

            return dashboardData;
        })
        .catch((error) => {
            if (!existingCache?.data) {
                setDashboardCountsError();
            }
            throw error;
        })
        .finally(() => {
            dashboardCountsPromise = null;
        });

    return dashboardCountsPromise;
}

function loadDashboardCounts() {
    return refreshDashboardCache({ silent: false, force: true });
}
function logout() {
    clearDashboardCache(getHodDashboardCacheKey());
    localStorage.removeItem("user");
    window.location.href = "index.html";
}
