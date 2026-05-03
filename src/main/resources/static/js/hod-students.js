const user = JSON.parse(localStorage.getItem("user") || "null");

if (!user || user.role !== "HOD") {
    alert("Please login as HOD");
    window.location.href = "index.html";
}

let studentsCache = [];
let currentPage = 0;
const pageSize = 20;
let totalPages = 0;

const VALID_BRANCHES = [
    "CSE", "CSM", "CSD", "CSC", "CSI", "CSIT", "IT",
    "ECE", "EEE", "MECH", "CIVIL", "AIML", "AIDS", "DS", "MBA"
];

document.addEventListener("DOMContentLoaded", () => {
    populateFilters();
    document.getElementById("searchInput").addEventListener("input", debounce(resetAndLoadStudents, 300));
    document.getElementById("branchFilter").addEventListener("change", resetAndLoadStudents);
    document.getElementById("sectionFilter").addEventListener("change", resetAndLoadStudents);
    document.getElementById("semFilter").addEventListener("change", resetAndLoadStudents);
    document.getElementById("prevPageBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextPageBtn").addEventListener("click", () => changePage(currentPage + 1));

    showLoading();
    loadStudents();
});

async function loadStudents() {
    clearPageStatus();
    showLoading();

    try {
        const students = await fetchHodStudents();
        studentsCache = Array.isArray(students.content) ? students.content : [];
        currentPage = Number(students.page) || 0;
        totalPages = Number(students.totalPages) || 0;

        updatePagination(students);
        renderStudents(studentsCache);

        if (Number(students.totalElements) === 0) {
            setPageStatus("No students are assigned to this HOD.", "info");
        }
    } catch (error) {
        studentsCache = [];
        updatePagination({ page: 0, totalPages: 0, totalElements: 0, last: true });
        renderStudents([]);
        setPageStatus(error.message || "Failed to load students", "error");
    } finally {
        hideLoading();
    }
}

async function fetchHodStudents() {
    const hodId = await resolveHodId();

    if (hodId) {
        const params = new URLSearchParams({
            page: String(currentPage),
            size: String(pageSize),
            search: document.getElementById("searchInput").value.trim(),
            branch: document.getElementById("branchFilter").value.trim(),
            sem: document.getElementById("semFilter").value.trim(),
            sec: document.getElementById("sectionFilter").value.trim()
        });

        const response = await fetch(`/student/hod/${hodId}?${params.toString()}`);

        if (response.ok) {
            return response.json();
        }

        throw new Error("Unable to load HOD students.");
    }

    return [];
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
        return null;
    }
}

function getCurrentEmployeeId() {
    return String(user.employeeId || user.username || "").trim().toUpperCase();
}

function populateFilters() {
    const branchFilter = document.getElementById("branchFilter");
    const sectionFilter = document.getElementById("sectionFilter");
    const semFilter = document.getElementById("semFilter");

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
        semFilter.innerHTML += `<option value="${escapeHtml(sem)}">${escapeHtml(sem)}</option>`;
    }
}

function resetAndLoadStudents() {
    currentPage = 0;
    loadStudents();
}

function changePage(page) {
    if (page < 0 || (totalPages > 0 && page >= totalPages)) {
        return;
    }

    currentPage = page;
    loadStudents();
}

function updatePagination(result) {
    const summary = document.getElementById("paginationSummary");
    const indicator = document.getElementById("pageIndicator");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const total = Number(result.totalElements) || 0;
    const page = Number(result.page) || 0;
    const totalPageCount = Number(result.totalPages) || 0;
    const start = total === 0 ? 0 : (page * pageSize) + 1;
    const end = Math.min((page + 1) * pageSize, total);

    summary.textContent = total === 0 ? "No students found" : `Showing ${start}-${end} of ${total} students`;
    indicator.textContent = totalPageCount === 0 ? "Page 0 of 0" : `Page ${page + 1} of ${totalPageCount}`;
    prevBtn.disabled = page <= 0;
    nextBtn.disabled = totalPageCount === 0 || !!result.last;
}

function renderStudents(students) {
    const container = document.getElementById("studentsContainer");
    const emptyState = document.getElementById("emptyState");

    container.innerHTML = "";

    if (!students || students.length === 0) {
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    students.forEach(student => {
        const displayName = safeValue(student.name) === "-" ? "Student" : safeValue(student.name);
        const displayRollNo = safeValue(student.rollNo);
        const displayBranch = normalizeBranch(student.branch) || safeValue(student.branch);
        const displaySection = normalizeSection(student.section || student.sec) || safeValue(student.section || student.sec);
        const displaySem = normalizeSemester(student.sem) || safeValue(student.sem);
        const displayPhone = safeValue(student.studentPhoneNumber);
        const displayParentPhone = safeValue(student.parentPhoneNumber);
        const displayEmail = safeValue(student.email);
        const displayFatherName = safeValue(student.fatherName);
        const displayGender = safeValue(student.gender);
        const displayCaste = safeValue(student.caste);

        const initials = getInitials(displayName);
        const imageUrl = getStudentImageUrl(displayRollNo);

        const card = document.createElement("div");
        card.className = "student-card";

        card.innerHTML = `
    <div class="card-header">
        <div class="initials-box" id="avatar-${student.id}">${escapeHtml(initials)}</div>
        <img class="student-photo" id="photo-${student.id}" alt="${escapeHtml(displayName)}" loading="lazy" />

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
        <button type="button" class="btn btn-primary" data-view-student-id="${student.id}">
            Details
        </button>

        <button type="button" class="btn btn-secondary" data-history-student-id="${student.id}">
            History
        </button>
    </div>
`;

        container.appendChild(card);

        const photoEl = card.querySelector(`#photo-${student.id}`);
        const avatarEl = card.querySelector(`#avatar-${student.id}`);

        if (imageUrl) {
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

        card.querySelector("[data-view-student-id]").addEventListener("click", () => {
            window.location.href = `student-details.html?id=${student.id}`;
        });

        card.querySelector("[data-history-student-id]").addEventListener("click", () => {
            window.location.href = `student-history.html?id=${student.id}&from=students`;
        });
    });
}



function getInitials(name) {
    if (!name || name === "-") return "S";

    return String(name)
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
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

function setPageStatus(message, type) {
    const status = document.getElementById("pageStatus");
    status.textContent = message;
    status.className = "page-status show " + type;
}

function clearPageStatus() {
    const status = document.getElementById("pageStatus");
    status.textContent = "";
    status.className = "page-status";
}

function showLoading() {
    const loadingLayer = document.getElementById("loadingLayer");
    if (loadingLayer) {
        loadingLayer.classList.remove("hidden");
    }
}

function hideLoading() {
    const loadingLayer = document.getElementById("loadingLayer");
    if (loadingLayer) {
        loadingLayer.classList.add("hidden");
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function debounce(fn, delay) {
    let timeoutId = null;

    return function () {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, arguments), delay);
    };
}
