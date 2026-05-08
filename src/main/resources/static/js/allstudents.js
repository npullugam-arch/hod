const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.top.location.href = "index.html";
}

const STUDENT_PHOTO_BASE_URL = "https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS";

let allRequests = [];
let filteredRequests = [];
let currentPage = 1;
const rowsPerPage = 10;

window.onload = function () {
    loadAllRequests();

    document.getElementById("searchInput").addEventListener("input", function () {
        currentPage = 1;
        renderAllRequests();
    });

    document.getElementById("statusFilter").addEventListener("change", function () {
        currentPage = 1;
        renderAllRequests();
    });

    document.getElementById("prevPageBtn").addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            renderPageRows();
        }
    });

    document.getElementById("nextPageBtn").addEventListener("click", function () {
        const totalPages = getTotalPages();
        if (currentPage < totalPages) {
            currentPage++;
            renderPageRows();
        }
    });
};

function loadAllRequests() {
    const status = document.getElementById("pageStatus");
    const table = document.getElementById("allRequestsTable");

    status.textContent = "Loading all requests...";
    table.innerHTML = "";

    fetch("/request/all")
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to load all requests. Backend API /request/all is required.");
            }
            return res.json();
        })
        .then(data => {
            allRequests = Array.isArray(data) ? data : [];
            currentPage = 1;
            renderAllRequests();
        })
        .catch(err => {
            console.error(err);
            status.textContent = "";
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-row">
                        Unable to load all requests. Please add backend API: GET /request/all
                    </td>
                </tr>
            `;
            updatePagination(0);
        });
}

function renderAllRequests() {
    const searchText = document.getElementById("searchInput").value.trim().toLowerCase();
    const selectedStatus = document.getElementById("statusFilter").value;

    filteredRequests = allRequests.filter(req => {
        const studentName = getStudentName(req).toLowerCase();
        const rollNo = getStudentIdentifier(req).toLowerCase();
        const reason = getDisplayValue(req.reason).toLowerCase();
        const description = getDisplayValue(req.description).toLowerCase();
        const status = getDisplayValue(req.status).toUpperCase();

        const matchesStatus = selectedStatus === "ALL" || status === selectedStatus;

        const matchesSearch =
            studentName.includes(searchText) ||
            rollNo.includes(searchText) ||
            reason.includes(searchText) ||
            description.includes(searchText) ||
            status.toLowerCase().includes(searchText);

        return matchesStatus && matchesSearch;
    });

    renderPageRows();
}

function renderPageRows() {
    const table = document.getElementById("allRequestsTable");
    const status = document.getElementById("pageStatus");

    table.innerHTML = "";

    if (filteredRequests.length === 0) {
        status.textContent = `Total requests: ${allRequests.length}`;
        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">No requests found.</td>
            </tr>
        `;
        updatePagination(0);
        return;
    }

    const totalPages = getTotalPages();

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageItems = filteredRequests.slice(startIndex, endIndex);

    status.textContent = `Total requests: ${allRequests.length} | Filtered: ${filteredRequests.length}`;

    pageItems.forEach(req => {
        const mainRow = buildRequestMainRow(req);
        const remarkRow = buildRemarkRow(req);
        table.innerHTML += mainRow + remarkRow;
    });

    updatePagination(filteredRequests.length);
}

function getTotalPages() {
    return Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));
}

function updatePagination(totalItems) {
    const paginationBar = document.getElementById("paginationBar");
    const paginationSummary = document.getElementById("paginationSummary");
    const pageIndicator = document.getElementById("pageIndicator");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");

    if (!paginationBar || !paginationSummary || !pageIndicator || !prevBtn || !nextBtn) return;

    if (totalItems === 0) {
        paginationSummary.textContent = "Showing 0 requests";
        pageIndicator.textContent = "Page 0 of 0";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const totalPages = getTotalPages();
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalItems);

    paginationSummary.textContent = `Showing ${start}-${end} of ${totalItems} requests`;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function buildRequestMainRow(req) {
    const student = req.student || {};

    const studentName = getStudentName(req);
    const studentId = getStudentIdentifier(req);
    const studentPhoto = getStudentPhoto(req);
    const studentInitial = getStudentInitial(req);

    const description = req.description || "No description provided.";

    const studentData = {
        photo: studentPhoto,
        name: studentName,
        rollNo: studentId,
        email: getDisplayValue(student.email),
        branch: getDisplayValue(student.branch),
        section: getDisplayValue(student.section || student.sec),
        sem: getDisplayValue(student.sem),
        gender: getDisplayValue(student.gender),
        dob: getDisplayValue(student.dateOfBirth),
        studentPhone: getDisplayValue(student.studentPhoneNumber),
        parentPhone: getDisplayValue(student.parentPhoneNumber),
        fatherName: getDisplayValue(student.fatherName),
        admissionType: getDisplayValue(student.admissionType),
        caste: getDisplayValue(student.caste),
        initial: studentInitial
    };

    const studentPhotoHtml = studentPhoto
        ? `<img src="${escapeAttribute(studentPhoto)}" alt="${escapeAttribute(studentName)}" class="student-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
           <div class="student-avatar-fallback" style="display:none;">${escapeHtml(studentInitial)}</div>`
        : `<div class="student-avatar-fallback">${escapeHtml(studentInitial)}</div>`;

    return `
        <tr class="main-row">
            <td>
                <div
                    class="student-cell"
                    onclick='openStudentDetailsModal(${JSON.stringify(studentData).replace(/'/g, "&apos;")})'
                    title="View Student Details"
                >
                    ${studentPhotoHtml}
                    <div>
                        <div class="student-name">${escapeHtml(studentName)}</div>
                        <div class="student-roll">${escapeHtml(studentId)}</div>
                    </div>
                </div>
            </td>

            <td class="reason-text">${escapeHtml(req.reason || "-")}</td>

            <td>
                <div class="description-wrap">
                    <span class="desc-text">${escapeHtml(description)}</span>
                    ${description.length > 90 ? `<button class="read-more-btn" onclick="toggleReadMore(this)">Read more</button>` : ""}
                </div>
            </td>

            <td>${formatDate(req.startDate)}</td>
            <td>${formatDate(req.endDate)}</td>
            <td>${formatDate(req.requestDate)}</td>

            <td>${getStatusBadge(req.status)}</td>
        </tr>
    `;
}

function buildRemarkRow(req) {
    const status = String(req.status || "").toUpperCase();

    const remark = req.rejectionRemark
        || req.remark
        || req.rejectRemark
        || req.hodRemark
        || req.certificate?.rejectionRemark
        || "";

    if (status === "EXPIRED") {
        return `
            <tr class="remark-row remark-row-expired">
                <td colspan="7">
                    <span class="remark-label">Status Note:</span>
                    This permission request expired because approval was not completed before the scheduled start date.
                </td>
            </tr>
        `;
    }

    if (status !== "REJECTED" || !remark) {
        return "";
    }

    return `
        <tr class="remark-row">
            <td colspan="7">
                <span class="remark-label">HOD Remark:</span>
                ${escapeHtml(remark)}
            </td>
        </tr>
    `;
}

function toggleReadMore(btn) {
    const textSpan = btn.previousElementSibling;

    if (textSpan.classList.contains("expanded")) {
        textSpan.classList.remove("expanded");
        btn.textContent = "Read more";
    } else {
        textSpan.classList.add("expanded");
        btn.textContent = "Read less";
    }
}

function getStudentName(req) {
    if (req.student) {
        return req.student.name || req.student.username || req.student.fullName || "N/A";
    }
    return "N/A";
}

function getStudentIdentifier(req) {
    if (!req.student) return "N/A";

    return req.student.rollNo
        || req.student.rollNumber
        || (req.student.user && req.student.user.username)
        || (req.student.user && req.student.user.id)
        || req.student.id
        || "N/A";
}

function getStudentPhoto(req) {
    if (!req.student) return "";

    const rollNo = req.student.rollNo
        || req.student.rollNumber
        || (req.student.user && req.student.user.username)
        || "";

    const customPhoto = req.student.photoUrl
        || req.student.photo
        || req.student.imageUrl
        || req.student.profilePhoto
        || req.student.profileImage
        || "";

    if (customPhoto && customPhoto.trim() !== "") {
        return customPhoto;
    }

    if (rollNo && rollNo.trim() !== "") {
        const cleanRollNo = rollNo.trim();
        return `${STUDENT_PHOTO_BASE_URL}/${encodeURIComponent(cleanRollNo)}/${encodeURIComponent(cleanRollNo)}.jpg`;
    }

    return "";
}

function getStudentInitial(req) {
    const name = getStudentName(req);
    if (!name || name === "N/A") return "S";
    return name.trim().charAt(0).toUpperCase();
}

function getStatusBadge(status) {
    const finalStatus = String(status || "PENDING").toUpperCase();

    if (finalStatus === "APPROVED") {
        return `<span class="status-badge status-approved">APPROVED</span>`;
    }

    if (finalStatus === "REJECTED") {
        return `<span class="status-badge status-rejected">REJECTED</span>`;
    }

    if (finalStatus === "EXPIRED") {
        return `<span class="status-badge status-expired">EXPIRED</span>`;
    }

    return `<span class="status-badge status-pending">PENDING</span>`;
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (isNaN(date.getTime())) return escapeHtml(value);

    return date.toLocaleDateString("en-GB");
}

function getDisplayValue(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return "-";
    }
    return String(value);
}

function openStudentDetailsModal(student) {
    document.getElementById("studentDetailsName").textContent = student.name || "-";
    document.getElementById("studentDetailsRollNo").textContent = student.rollNo || "-";
    document.getElementById("studentDetailsEmail").textContent = student.email || "-";
    document.getElementById("studentDetailsBranch").textContent = student.branch || "-";
    document.getElementById("studentDetailsSection").textContent = student.section || "-";
    document.getElementById("studentDetailsSem").textContent = student.sem || "-";
    document.getElementById("studentDetailsGender").textContent = student.gender || "-";
    document.getElementById("studentDetailsDob").textContent = student.dob || "-";
    document.getElementById("studentDetailsStudentPhone").textContent = student.studentPhone || "-";
    document.getElementById("studentDetailsParentPhone").textContent = student.parentPhone || "-";
    document.getElementById("studentDetailsFatherName").textContent = student.fatherName || "-";
    document.getElementById("studentDetailsAdmissionType").textContent = student.admissionType || "-";
    document.getElementById("studentDetailsCaste").textContent = student.caste || "-";

    const photoEl = document.getElementById("studentDetailsPhoto");
    photoEl.src = student.photo || "";
    photoEl.alt = student.name || "Student Photo";

    photoEl.onerror = function () {
        this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.initial || "S")}&background=2563eb&color=ffffff&size=160`;
    };

    document.getElementById("studentDetailsModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeStudentDetailsModal() {
    document.getElementById("studentDetailsModal").classList.add("hidden");
    document.body.style.overflow = "auto";
}

function handleStudentModalOutsideClick(event) {
    const modal = document.getElementById("studentDetailsModal");
    if (event.target === modal) {
        closeStudentDetailsModal();
    }
}

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeStudentDetailsModal();
    }
});

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
