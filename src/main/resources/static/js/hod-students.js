const user = JSON.parse(localStorage.getItem("user") || "null");

if (!user || user.role !== "HOD") {
    alert("Please login as HOD");
    window.location.href = "index.html";
}

let currentPageStudents = [];
let currentPage = 1;
let pageSize = 24;
let totalPages = 0;
let totalElements = 0;
let isLoadingStudents = false;

const VALID_BRANCHES = [
    "CSE", "CSM", "CSD", "CSC", "CSI", "CSIT", "IT",
    "ECE", "EEE", "MECH", "CIVIL", "AIML", "AIDS", "DS", "MBA"
];

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const branchFilter = document.getElementById("branchFilter");
    const sectionFilter = document.getElementById("sectionFilter");
    const semFilter = document.getElementById("semFilter");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const pageSizeSelect = document.getElementById("pageSizeSelect");

    populateFilters();

    if (searchInput) searchInput.addEventListener("input", debounce(resetAndLoadStudents, 300));
    if (branchFilter) branchFilter.addEventListener("change", resetAndLoadStudents);
    if (sectionFilter) sectionFilter.addEventListener("change", resetAndLoadStudents);
    if (semFilter) semFilter.addEventListener("change", resetAndLoadStudents);

    if (prevPageBtn) {
        prevPageBtn.addEventListener("click", () => {
            if (!isLoadingStudents && currentPage > 1) {
                loadStudents(currentPage - 1);
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener("click", () => {
            if (!isLoadingStudents && currentPage < totalPages) {
                loadStudents(currentPage + 1);
            }
        });
    }

    if (pageSizeSelect) {
        pageSizeSelect.addEventListener("change", () => {
            pageSize = Number(pageSizeSelect.value) || 24;
            resetAndLoadStudents();
        });
    }

    showLoading();
    loadStudents(1);
});

function populateFilters() {
    const branchFilter = document.getElementById("branchFilter");
    const sectionFilter = document.getElementById("sectionFilter");
    const semFilter = document.getElementById("semFilter");

    if (!branchFilter || !sectionFilter || !semFilter) return;

    branchFilter.innerHTML = `<option value="">All Branches</option>`;
    sectionFilter.innerHTML = `<option value="">All Sections</option>`;
    semFilter.innerHTML = `<option value="">All Semesters</option>`;

    VALID_BRANCHES.forEach(branch => {
        branchFilter.innerHTML += `<option value="${escapeHtml(branch)}">${escapeHtml(branch)}</option>`;
    });

    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(section => {
        sectionFilter.innerHTML += `<option value="${escapeHtml(section)}">${escapeHtml(section)}</option>`;
    });

    for (let sem = 1; sem <= 8; sem++) {
        semFilter.innerHTML += `<option value="${sem}">${sem}</option>`;
    }
}

async function loadStudents(targetPage = 1) {
    if (isLoadingStudents) {
        return;
    }

    clearPageStatus();
    isLoadingStudents = true;
    currentPage = Math.max(Number(targetPage) || 1, 1);
    setPaginationLoadingState(true);
    showLoading();

    try {
        const result = await fetchHodStudentsPage(currentPage, pageSize);

        currentPageStudents = Array.isArray(result.content) ? result.content : [];
        currentPage = (Number(result.page) || 0) + 1;
        totalPages = Number(result.totalPages) || 0;
        totalElements = Number(result.totalElements) || 0;

        renderStudents(currentPageStudents);
        renderPagination();

        if (totalElements === 0) {
            setPageStatus("No students are assigned to this HOD.", "info");
        }
    } catch (error) {
        console.error("Failed to load students:", error);
        currentPageStudents = [];
        currentPage = 1;
        totalPages = 0;
        totalElements = 0;
        renderStudents([]);
        renderPagination();
        setPageStatus(error.message || "Failed to load students", "error");
    } finally {
        isLoadingStudents = false;
        setPaginationLoadingState(false);
        hideLoading();
    }
}

async function fetchHodStudentsPage(pageNumber, size) {
    const hodId = await resolveHodId();

    if (!hodId) {
        throw new Error("Unable to resolve HOD details.");
    }

    const search = document.getElementById("searchInput")?.value.trim() || "";
    const branch = document.getElementById("branchFilter")?.value.trim() || "";
    const section = document.getElementById("sectionFilter")?.value.trim() || "";
    const semValue = document.getElementById("semFilter")?.value.trim() || "";

    const params = new URLSearchParams({
        page: String(Math.max((Number(pageNumber) || 1) - 1, 0)),
        size: String(Math.max(Number(size) || 24, 1)),
        search,
        branch,
        sec: section
    });

    if (semValue) {
        params.set("sem", semValue);
    }

    const response = await fetch(`/hod/${hodId}/students-page?${params.toString()}`);

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to load HOD students.");
    }

    return response.json();
}

async function resolveHodId() {
    if (user.hodId) return user.hodId;

    const employeeId = getCurrentEmployeeId();

    try {
        const response = await fetch("/admin/hods");

        if (!response.ok) return null;

        const hods = await response.json();

        const matchedHod = (Array.isArray(hods) ? hods : []).find(hod =>
            String(hod?.employeeId || "").trim().toUpperCase() === employeeId ||
            String(hod?.user?.username || "").trim().toUpperCase() === employeeId ||
            String(hod?.name || "").trim().toUpperCase() === String(user.name || "").trim().toUpperCase()
        );

        return matchedHod?.id || null;
    } catch (error) {
        console.error("HOD resolve error:", error);
        return null;
    }
}

function getCurrentEmployeeId() {
    return String(user.employeeId || user.username || "").trim().toUpperCase();
}

function resetAndLoadStudents() {
    loadStudents(1);
}

function renderPagination() {
    const paginationWrapper = document.getElementById("paginationWrapper");
    const paginationInfo = document.getElementById("paginationInfo");
    const pageNumbers = document.getElementById("pageNumbers");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");

    if (!paginationWrapper || !paginationInfo || !pageNumbers) return;

    if (totalElements === 0) {
        paginationWrapper.style.display = "none";
        return;
    }

    paginationWrapper.style.display = "flex";

    const start = ((currentPage - 1) * pageSize) + 1;
    const end = Math.min(currentPage * pageSize, totalElements);

    paginationInfo.textContent = `Showing ${start}-${end} of ${totalElements} students`;

    if (prevPageBtn) prevPageBtn.disabled = isLoadingStudents || currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = isLoadingStudents || totalPages === 0 || currentPage >= totalPages;

    pageNumbers.innerHTML = "";

    const pagesToShow = getVisiblePages(currentPage, totalPages);

    pagesToShow.forEach(page => {
        if (page === "...") {
            const dots = document.createElement("span");
            dots.className = "page-dots";
            dots.textContent = "...";
            pageNumbers.appendChild(dots);
            return;
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `page-number-btn ${page === currentPage ? "active" : ""}`;
        btn.textContent = page;
        btn.disabled = isLoadingStudents;

        btn.addEventListener("click", () => {
            if (!isLoadingStudents && page !== currentPage) {
                loadStudents(page);
            }
        });

        pageNumbers.appendChild(btn);
    });
}

function getVisiblePages(current, total) {
    if (total <= 5) {
        return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 3) {
        return [1, 2, 3, 4, "...", total];
    }

    if (current >= total - 2) {
        return [1, "...", total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 1, current, current + 1, "...", total];
}

function renderStudents(students) {
    const container = document.getElementById("studentsContainer");
    const emptyState = document.getElementById("emptyState");

    if (!container) return;

    container.innerHTML = "";

    if (!students || students.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    students.forEach(student => {
        const displayName = safeValue(student.name) === "-" ? "Student" : safeValue(student.name);
        const displayRollNo = safeValue(student.rollNo);
        const displayBranch = normalizeBranch(student.branch) || safeValue(student.branch);
        const displaySection = normalizeSection(student.section || student.sec) || safeValue(student.section || student.sec);
        const displaySem = normalizeSemester(student.sem) || safeValue(student.sem);

        const initials = getInitials(displayName);
        const imageUrl = student.photoUrl || student.photo || getStudentImageUrl(displayRollNo);

        const card = document.createElement("div");
        card.className = "student-card";

        card.innerHTML = `
            <div class="card-header">
                <div class="initials-box">${escapeHtml(initials)}</div>
                <img class="student-photo" alt="${escapeHtml(displayName)}" style="display:none;" />

                <div class="student-info">
                    <h3>${escapeHtml(displayName)}</h3>
                    <p>${escapeHtml(displayRollNo)}</p>
                </div>
            </div>

            <div class="stats-container">
                <div class="stat-pill">
                    <small>Semester</small>
                    <strong>${escapeHtml(displaySem)}</strong>
                </div>
                <div class="stat-pill">
                    <small>Section</small>
                    <strong>${escapeHtml(displayBranch)}-${escapeHtml(displaySection)}</strong>
                </div>
            </div>

            <div class="btn-group">
                <button type="button" class="btn btn-primary details-btn">Details</button>
                <button type="button" class="btn btn-secondary history-btn">History</button>
            </div>
        `;

        container.appendChild(card);

        const photoEl = card.querySelector(".student-photo");
        const avatarEl = card.querySelector(".initials-box");

        if (imageUrl && photoEl && avatarEl) {
            photoEl.onload = () => {
                photoEl.style.display = "block";
                avatarEl.style.display = "none";
            };

            photoEl.onerror = () => {
                photoEl.style.display = "none";
                avatarEl.style.display = "grid";
            };

            photoEl.src = imageUrl;
        }

        card.querySelector(".details-btn").addEventListener("click", () => {
            window.location.href = `student-details.html?id=${student.id}`;
        });

        card.querySelector(".history-btn").addEventListener("click", () => {
            window.location.href = `student-history.html?id=${student.id}`;
        });
    });
}

function setPaginationLoadingState(loading) {
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const pageSizeSelect = document.getElementById("pageSizeSelect");

    if (prevPageBtn) prevPageBtn.disabled = loading || currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = loading || totalPages === 0 || currentPage >= totalPages;
    if (pageSizeSelect) pageSizeSelect.disabled = loading;

    document.querySelectorAll("#pageNumbers .page-number-btn").forEach(btn => {
        btn.disabled = loading;
    });
}

function debounce(fn, delay) {
    let timerId;

    return (...args) => {
        window.clearTimeout(timerId);
        timerId = window.setTimeout(() => fn(...args), delay);
    };
}

function normalizeBranch(value) {
    if (!value) return "";
    const branch = String(value).trim().toUpperCase();
    return VALID_BRANCHES.includes(branch) ? branch : "";
}

function normalizeSection(value) {
    if (!value) return "";
    const section = String(value).trim().toUpperCase();

    if (/^[A-Z]$/.test(section)) return section;
    if (/^[0-9]+[A-Z]$/.test(section)) return section;

    return "";
}

function normalizeSemester(value) {
    if (value === null || value === undefined || value === "") return "";

    const sem = String(value).trim();
    return /^[1-8]$/.test(sem) ? sem : "";
}

function safeValue(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return "-";
    }

    return String(value).trim();
}

function getStudentImageUrl(rollNo) {
    if (!rollNo || rollNo === "-") return "";

    const cleanRollNo = String(rollNo).trim().toUpperCase();
    return `https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${cleanRollNo}/${cleanRollNo}.jpg`;
}

function getInitials(name) {
    if (!name || name === "-") return "S";

    return String(name)
        .trim()
        .split(/\s+/)
        .map(word => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function setPageStatus(message, type) {
    const status = document.getElementById("pageStatus");
    if (!status) return;

    status.textContent = message;
    status.className = "page-status show " + type;
}

function clearPageStatus() {
    const status = document.getElementById("pageStatus");
    if (!status) return;

    status.textContent = "";
    status.className = "page-status";
}

function showLoading() {
    const loadingLayer = document.getElementById("loadingLayer");
    if (loadingLayer) loadingLayer.classList.remove("hidden");
}

function hideLoading() {
    const loadingLayer = document.getElementById("loadingLayer");
    if (loadingLayer) loadingLayer.classList.add("hidden");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
