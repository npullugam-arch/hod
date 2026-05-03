const adminUser = JSON.parse(localStorage.getItem("user") || "null");

if (!adminUser || adminUser.role !== "ADMIN") {
    alert("Please login as Admin");
    window.location.href = "index.html";
}

let studentsCache = [];
let currentPage = 0;
const pageSize = 20;
let totalPages = 0;
let totalElements = 0;

const VALID_BRANCHES = [
    "CSE", "CSM", "CSD", "CSC", "CSI", "CSIT", "IT",
    "ECE", "EEE", "MECH", "CIVIL", "AIML", "AIDS", "DS", "MBA"
];

const basicFields = [
    { id: "detailUsername", key: "username", label: "Username", required: true },
    { id: "detailName", key: "name", label: "Student Name", required: true },
    { id: "detailRollNo", key: "rollNo", label: "Roll Number", required: true },
    { id: "detailEmail", key: "email", label: "Email", type: "email" },
    { id: "detailFatherName", key: "fatherName", label: "Father Name" },
    { id: "detailGender", key: "gender", label: "Gender" },
    { id: "detailBranch", key: "branch", label: "Branch" },
    { id: "detailSem", key: "sem", label: "Semester", type: "number" },
    { id: "detailSection", key: "section", label: "Section" },
    { id: "detailCaste", key: "caste", label: "Caste" },
    { id: "detailStudentPhoneNumber", key: "studentPhoneNumber", label: "Student Phone Number" },
    { id: "detailParentPhoneNumber", key: "parentPhoneNumber", label: "Parent Phone Number" },
    { id: "detailDateOfBirth", key: "dateOfBirth", label: "Date of Birth" },
    { id: "detailAdmissionType", key: "admissionType", label: "Admission Type" },
    { id: "detailDeptId", key: "deptId", label: "Dept ID", type: "number" },
    { id: "detailSectionId", key: "sectionId", label: "Section ID", type: "number" }
];

const extraFields = [
    { id: "detailStudentStatus", key: "studentStatus", label: "Student Status" },
    { id: "detailSubCaste", key: "subCaste", label: "Sub Caste" },
    { id: "detailReligion", key: "religion", label: "Religion" },
    { id: "detailFeeCategory", key: "feeCategory", label: "Fee Category" },
    { id: "detailCetRank", key: "cetRank", label: "CET Rank" },
    { id: "detailSscMarks", key: "sscMarks", label: "SSC Marks" },
    { id: "detailSscPercentage", key: "sscPercentage", label: "SSC %" },
    { id: "detailInterMarks", key: "interMarks", label: "Inter Marks" },
    { id: "detailInterPercentage", key: "interPercentage", label: "Inter %" },
    { id: "detailUgMarks", key: "ugMarks", label: "UG Marks" },
    { id: "detailUgPercentage", key: "ugPercentage", label: "UG %" },
    { id: "detailDateOfJoining", key: "dateOfJoining", label: "Date of Joining" },
    { id: "detailMotherName", key: "motherName", label: "Mother Name" },
    { id: "detailMotherPhone", key: "motherPhone", label: "Mother Phone" },
    { id: "detailCurrentAddress", key: "currentAddress", label: "Current Address" },
    { id: "detailPermanentAddress", key: "permanentAddress", label: "Permanent Address" },
    { id: "detailAadhar", key: "aadhar", label: "Aadhar" },
    { id: "detailFatherOccupation", key: "fatherOccupation", label: "Father Occupation" },
    { id: "detailOccupationType", key: "occupationType", label: "Occupation Type" },
    { id: "detailIncome", key: "income", label: "Income" },
    { id: "detailMoles", key: "moles", label: "Moles" },
    { id: "detailPlaceOfBirth", key: "placeOfBirth", label: "Place of Birth" },
    { id: "detailCurrentDno", key: "currentDno", label: "Current D.No" },
    { id: "detailCurrentStreet", key: "currentStreet", label: "Current Street" },
    { id: "detailCurrentVillageTown", key: "currentVillageTown", label: "Current Village/Town" },
    { id: "detailCurrentMandal", key: "currentMandal", label: "Current Mandal" },
    { id: "detailCurrentDistrict", key: "currentDistrict", label: "Current District" },
    { id: "detailCurrentState", key: "currentState", label: "Current State" },
    { id: "detailCurrentPincode", key: "currentPincode", label: "Current Pincode" },
    { id: "detailPermanentDno", key: "permanentDno", label: "Permanent D.No" },
    { id: "detailPermanentStreet", key: "permanentStreet", label: "Permanent Street" },
    { id: "detailPermanentVillageTown", key: "permanentVillageTown", label: "Permanent Village/Town" },
    { id: "detailPermanentMandal", key: "permanentMandal", label: "Permanent Mandal" },
    { id: "detailPermanentDistrict", key: "permanentDistrict", label: "Permanent District" },
    { id: "detailPermanentState", key: "permanentState", label: "Permanent State" },
    { id: "detailPermanentPincode", key: "permanentPincode", label: "Permanent Pincode" },
    { id: "detailDomicileState", key: "domicileState", label: "Domicile State" },
    { id: "detailSscState", key: "sscState", label: "SSC State" },
    { id: "detailInterState", key: "interState", label: "Inter State" }
];

document.addEventListener("DOMContentLoaded", () => {
    buildFormFields();
    populateFilterOptions();

    document.getElementById("searchInput").addEventListener("input", debounce(resetAndLoadStudents, 300));
    document.getElementById("branchFilter").addEventListener("change", resetAndLoadStudents);
    document.getElementById("sectionFilter").addEventListener("change", resetAndLoadStudents);
    document.getElementById("semFilter").addEventListener("change", resetAndLoadStudents);
    document.getElementById("prevPageBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextPageBtn").addEventListener("click", () => changePage(currentPage + 1));

    document.getElementById("closeDetailsModal").addEventListener("click", () => hideModal("detailsModal"));
    document.getElementById("cancelDetailsBtn").addEventListener("click", () => hideModal("detailsModal"));
    document.getElementById("closePasswordModal").addEventListener("click", () => hideModal("passwordModal"));
    document.getElementById("cancelPasswordBtn").addEventListener("click", () => hideModal("passwordModal"));

    document.getElementById("detailsForm").addEventListener("submit", submitDetailsUpdate);
    document.getElementById("passwordForm").addEventListener("submit", submitPasswordUpdate);

    loadStudents();
});

function buildFormFields() {
    renderFieldGroup("basicFieldsGrid", basicFields);
    renderFieldGroup("extraExcelFieldsGrid", extraFields);
}

function renderFieldGroup(containerId, fields) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    fields.forEach(field => {
        container.innerHTML += `
            <div class="form-field">
                <label>${field.label}</label>
                <input 
                    type="${field.type || "text"}" 
                    id="${field.id}" 
                    ${field.required ? "required" : ""} 
                />
            </div>
        `;
    });
}

function populateFilterOptions() {
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
        semFilter.innerHTML += `<option value="${sem}">${sem}</option>`;
    }
}

async function loadStudents() {
    clearPageStatus();
    setPaginationSummary("Loading students...");

    try {
        const params = new URLSearchParams({
            page: String(currentPage),
            size: String(pageSize),
            search: document.getElementById("searchInput").value.trim(),
            branch: document.getElementById("branchFilter").value.trim(),
            sem: document.getElementById("semFilter").value.trim(),
            sec: document.getElementById("sectionFilter").value.trim(),
            sortBy: "name",
            sortDir: "asc"
        });

        const response = await fetch(`/admin/students?${params.toString()}`);

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Failed to load students");
        }

        const result = await response.json();
        studentsCache = Array.isArray(result.content) ? result.content : [];
        currentPage = Number(result.page) || 0;
        totalPages = Number(result.totalPages) || 0;
        totalElements = Number(result.totalElements) || 0;

        updatePagination(result);
        renderStudents(studentsCache);
    } catch (error) {
        setPageStatus(error.message, "error");
        updatePagination({ page: 0, totalPages: 0, totalElements: 0, content: [] });
        renderStudents([]);
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

    const page = Number(result.page) || 0;
    const last = !!result.last;
    const total = Number(result.totalElements) || 0;
    const totalPageCount = Number(result.totalPages) || 0;
    const start = total === 0 ? 0 : (page * pageSize) + 1;
    const end = Math.min((page + 1) * pageSize, total);

    summary.textContent = total === 0
        ? "No students found"
        : `Showing ${start}-${end} of ${total} students`;
    indicator.textContent = totalPageCount === 0
        ? "Page 0 of 0"
        : `Page ${page + 1} of ${totalPageCount}`;
    prevBtn.disabled = page <= 0;
    nextBtn.disabled = totalPageCount === 0 || last;
}

function setPaginationSummary(message) {
    document.getElementById("paginationSummary").textContent = message;
}

function renderStudents(students) {
    const studentGrid = document.getElementById("studentGrid");
    const emptyState = document.getElementById("emptyState");

    studentGrid.innerHTML = "";

    if (!students.length) {
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    students.forEach(student => {
        const displayName = student.name || "Student";
        const displayRollNo = student.rollNo || "-";
        const displayBranch = normalizeBranch(student.branch) || "-";
        const displaySection = normalizeSection(student.section || student.sec) || "-";
        const displaySem = normalizeSemester(student.sem) || "-";
        const initial = displayName.charAt(0).toUpperCase();
        const imageUrl = getStudentImageUrl(displayRollNo);

        const card = document.createElement("div");
        card.className = "student-card";

        card.innerHTML = `
            <div class="student-top">
                <div class="student-avatar" id="avatar-${student.id}">${escapeHtml(initial)}</div>
                <img class="student-photo" id="photo-${student.id}" alt="${escapeHtml(displayName)}" loading="lazy" />
                <div>
                    <div class="student-name">${escapeHtml(displayName)}</div>
                    <div class="student-meta">Roll No: ${escapeHtml(displayRollNo)}</div>
                    <div class="student-meta">Branch: ${escapeHtml(displayBranch)}</div>
                    <div class="student-meta">Sem / Section: ${escapeHtml(displaySem)} / ${escapeHtml(displaySection)}</div>
                    <div class="student-meta">Phone: ${escapeHtml(student.studentPhoneNumber || "-")}</div>
                </div>
            </div>

            <div class="student-actions">
                <button type="button" class="card-btn details-btn" data-student-id="${student.id}">Update Details</button>
                <button type="button" class="card-btn password-btn" data-password-student-id="${student.id}">Update Password</button>
            </div>
        `;

        studentGrid.appendChild(card);

        const photoEl = card.querySelector(`#photo-${student.id}`);
        const avatarEl = card.querySelector(`#avatar-${student.id}`);

        if (imageUrl) {
            photoEl.onload = () => {
                photoEl.style.display = "block";
                avatarEl.style.display = "none";
            };

            photoEl.onerror = () => {
                photoEl.style.display = "none";
                avatarEl.style.display = "flex";
            };

            photoEl.src = imageUrl;
        }

        card.querySelector("[data-student-id]").addEventListener("click", () => openDetailsModal(student.id));
        card.querySelector("[data-password-student-id]").addEventListener("click", () => openPasswordModal(student.id));
    });
}

async function openDetailsModal(studentId) {
    clearModalStatus("detailsStatus");

    try {
        const response = await fetch(`/admin/student/${studentId}`);

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Failed to load student details");
        }

        const student = await response.json();

        setValue("detailStudentId", student.id || "");
        setValue("detailUsername", student.user?.username || "");

        [...basicFields, ...extraFields].forEach(field => {
            if (field.key === "username") return;

            if (field.key === "section") {
                setValue(field.id, student.section || student.sec || "");
            } else {
                setValue(field.id, student[field.key] ?? "");
            }
        });

        showModal("detailsModal");
    } catch (error) {
        setPageStatus(error.message, "error");
    }
}

async function submitDetailsUpdate(e) {
    e.preventDefault();
    clearModalStatus("detailsStatus");

    const studentId = getValue("detailStudentId");

    const payload = {};

    [...basicFields, ...extraFields].forEach(field => {
        if (field.key === "sem" || field.key === "deptId" || field.key === "sectionId") {
            payload[field.key] = getNumberOrNull(field.id);
        } else {
            payload[field.key] = getValue(field.id);
        }
    });

    try {
        const response = await fetch(`/admin/student/${studentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Failed to update student details");
        }

        setModalStatus("detailsStatus", "Student details updated successfully", "success");
        setPageStatus("Student details updated successfully", "success");

        await loadStudents();

        setTimeout(() => hideModal("detailsModal"), 800);
    } catch (error) {
        setModalStatus("detailsStatus", error.message, "error");
    }
}

async function openPasswordModal(studentId) {
    clearModalStatus("passwordStatus");

    try {
        const response = await fetch(`/admin/student/${studentId}/password`);

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Failed to load password details");
        }

        const data = await response.json();

        setValue("passwordStudentId", studentId);
        setValue("oldPassword", data.currentPassword || "");
        setValue("newPassword", "");
        setValue("confirmPassword", "");

        showModal("passwordModal");
    } catch (error) {
        setPageStatus(error.message, "error");
    }
}

async function submitPasswordUpdate(e) {
    e.preventDefault();
    clearModalStatus("passwordStatus");

    const studentId = getValue("passwordStudentId");
    const newPassword = getValue("newPassword");
    const confirmPassword = getValue("confirmPassword");

    if (!newPassword || !confirmPassword) {
        setModalStatus("passwordStatus", "Please fill all password fields", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        setModalStatus("passwordStatus", "New password and confirm password do not match", "error");
        return;
    }

    try {
        const response = await fetch(`/admin/student/${studentId}/password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newPassword, confirmPassword })
        });

        const message = await response.text();

        if (!response.ok) {
            throw new Error(message || "Failed to update password");
        }

        setModalStatus("passwordStatus", "Student password updated successfully", "success");
        setPageStatus("Student password updated successfully", "success");

        setTimeout(() => hideModal("passwordModal"), 800);
    } catch (error) {
        setModalStatus("passwordStatus", error.message, "error");
    }
}

function normalizeBranch(value) {
    if (!value) return "";

    const branch = String(value).trim().toUpperCase();

    if (VALID_BRANCHES.includes(branch)) {
        return branch;
    }

    return "";
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

    if (/^[1-8]$/.test(sem)) {
        return sem;
    }

    return "";
}

function getStudentImageUrl(rollNo) {
    if (!rollNo || rollNo === "-") return "";
    const cleanRollNo = String(rollNo).trim().toUpperCase();
    return `https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${cleanRollNo}/${cleanRollNo}.jpg`;
}

function showModal(id) {
    document.getElementById(id).classList.add("show");
}

function hideModal(id) {
    document.getElementById(id).classList.remove("show");
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

function setModalStatus(elementId, message, type) {
    const status = document.getElementById(elementId);
    status.textContent = message;
    status.className = "modal-status show " + type;
}

function clearModalStatus(elementId) {
    const status = document.getElementById(elementId);
    status.textContent = "";
    status.className = "modal-status";
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

function getNumberOrNull(id) {
    const value = getValue(id);
    return value ? Number(value) : null;
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
