const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.top.location.href = "index.html";
}

const STUDENT_PHOTO_BASE_URL = "https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS";
const DEFAULT_PAGE_SIZE = 20;

let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
let currentPendingRequests = [];
let isPendingLoading = false;

window.onload = function () {
    bindPendingPagination();
    loadPendingRequests();
};

function bindPendingPagination() {
    const prevBtn = document.getElementById("pendingPrevBtn");
    const nextBtn = document.getElementById("pendingNextBtn");

    if (prevBtn) {
        prevBtn.addEventListener("click", function () {
            if (currentPage > 0 && !isPendingLoading) {
                currentPage -= 1;
                loadPendingRequests();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", function () {
            if (currentPage + 1 < totalPages && !isPendingLoading) {
                currentPage += 1;
                loadPendingRequests();
            }
        });
    }
}

function loadPendingRequests() {
    isPendingLoading = true;
    renderPendingLoadingState();
    updatePendingPagination();

    const url = `/request/hod/${user.id}/pending?page=${currentPage}&size=${DEFAULT_PAGE_SIZE}`;

    fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to load requests");
            }
            return res.json();
        })
        .then(data => {
            currentPendingRequests = Array.isArray(data.content) ? data.content : [];
            totalPages = Number(data.totalPages) || 0;
            totalElements = Number(data.totalElements) || 0;

            if (totalPages > 0 && currentPage >= totalPages) {
                currentPage = totalPages - 1;
                return loadPendingRequests();
            }

            renderPendingTable();
            updatePendingPagination();
        })
        .catch(err => {
            console.error(err);
            currentPendingRequests = [];
            totalPages = 0;
            totalElements = 0;
            renderPendingErrorState();
            updatePendingPagination();
        })
        .finally(() => {
            isPendingLoading = false;
        });
}

function renderPendingLoadingState() {
    const table = document.getElementById("pendingTable");
    const status = document.getElementById("pendingStatus");

    if (status) {
        status.textContent = "Loading pending requests...";
    }

    if (table) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">Loading pending requests...</td>
            </tr>
        `;
    }
}

function renderPendingErrorState() {
    const table = document.getElementById("pendingTable");
    const status = document.getElementById("pendingStatus");

    if (status) {
        status.textContent = "Unable to load pending requests.";
    }

    if (table) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">Unable to load pending requests.</td>
            </tr>
        `;
    }
}

function renderPendingTable() {
    const table = document.getElementById("pendingTable");
    const status = document.getElementById("pendingStatus");

    if (!table) return;

    table.innerHTML = "";

    if (currentPendingRequests.length === 0) {
        if (status) {
            status.textContent = totalElements === 0
                ? "No pending requests found."
                : "No pending requests on this page.";
        }

        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">No pending requests found.</td>
            </tr>
        `;
        return;
    }

    if (status) {
        const start = currentPage * DEFAULT_PAGE_SIZE + 1;
        const end = currentPage * DEFAULT_PAGE_SIZE + currentPendingRequests.length;
        status.textContent = `Showing ${start}-${end} of ${totalElements} pending requests`;
    }

    currentPendingRequests.forEach((req, index) => {
        const studentData = buildPendingStudentData(req);
        const studentPhotoHtml = studentData.photo
            ? `<img src="${escapeAttribute(studentData.photo)}" alt="${escapeAttribute(studentData.name)}" class="student-photo" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
               <div class="student-avatar-fallback" style="display:none;">${escapeHtml(studentData.initial)}</div>`
            : `<div class="student-avatar-fallback">${escapeHtml(studentData.initial)}</div>`;

        const historyButton = req.studentId
            ? `<button class="history-btn" onclick="viewStudentHistory(${req.studentId})">View History</button>`
            : `<button class="history-btn disabled" disabled>View History</button>`;

        table.innerHTML += `
            <tr>
                <td>
                    <div class="student-cell clickable-student" onclick="openStudentDetailsModalByIndex(${index})" title="View Student Details">
                        <div class="student-photo-wrap">
                            ${studentPhotoHtml}
                        </div>
                        <div class="student-meta">
                            <div class="student-name">${escapeHtml(studentData.name)}</div>
                            <div class="student-roll">${escapeHtml(studentData.rollNo)}</div>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(req.reason || "-")}</td>
                <td>
                    <button
                        class="description-btn"
                        onclick="openDescriptionModal('${escapeJsString(studentData.name)}', '${escapeJsString(studentData.rollNo)}', '${escapeJsString(req.description || "No description provided.")}')"
                        title="View Description"
                    >
                        View
                    </button>
                </td>
                <td>${formatDate(req.startDate)}</td>
                <td>${formatDate(req.endDate)}</td>
                <td>${formatDate(req.requestDate)}</td>
                <td>
                    <div class="action-group">
                        <button class="approve-btn" onclick="approveRequest(${req.id})">Approve</button>
                        <button class="reject-btn" onclick="rejectRequest(${req.id})">Reject</button>
                        ${historyButton}
                    </div>
                </td>
            </tr>
        `;
    });
}

function updatePendingPagination() {
    const prevBtn = document.getElementById("pendingPrevBtn");
    const nextBtn = document.getElementById("pendingNextBtn");
    const pageInfo = document.getElementById("pendingPageInfo");

    if (prevBtn) {
        prevBtn.disabled = isPendingLoading || currentPage <= 0;
    }

    if (nextBtn) {
        nextBtn.disabled = isPendingLoading || totalPages === 0 || currentPage >= totalPages - 1;
    }

    if (pageInfo) {
        const displayPage = totalPages === 0 ? 0 : currentPage + 1;
        const safeTotalPages = totalPages === 0 ? 0 : totalPages;
        pageInfo.textContent = `Page ${displayPage} of ${safeTotalPages}`;
    }
}

function buildPendingStudentData(req) {
    const name = req.studentName || "N/A";
    const rollNo = req.studentRollNo || req.studentId || "N/A";
    const photo = getStudentPhoto(req);

    return {
        photo,
        name,
        rollNo: String(rollNo),
        email: getDisplayValue(req.studentEmail),
        branch: getDisplayValue(req.studentBranch),
        section: getDisplayValue(req.studentSection || req.studentSec),
        sem: getDisplayValue(req.studentSem),
        gender: getDisplayValue(req.studentGender),
        dob: getDisplayValue(req.studentDateOfBirth),
        studentPhone: getDisplayValue(req.studentPhoneNumber),
        parentPhone: getDisplayValue(req.parentPhoneNumber),
        fatherName: getDisplayValue(req.fatherName),
        admissionType: getDisplayValue(req.admissionType),
        caste: getDisplayValue(req.caste),
        initial: getInitial(name)
    };
}

function getStudentPhoto(req) {
    const customPhoto = req.studentPhotoUrl || "";

    if (customPhoto && customPhoto.trim() !== "") {
        return customPhoto.trim();
    }

    const rollNo = req.studentRollNo || "";
    if (!rollNo || !String(rollNo).trim()) {
        return "";
    }

    const cleanRollNo = String(rollNo).trim().toUpperCase();
    return `${STUDENT_PHOTO_BASE_URL}/${encodeURIComponent(cleanRollNo)}/${encodeURIComponent(cleanRollNo)}.jpg`;
}

function getInitial(name) {
    if (!name || name === "N/A") return "S";
    return String(name).trim().charAt(0).toUpperCase();
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

function viewStudentHistory(studentId) {
    if (!studentId) {
        alert("Student ID not found.");
        return;
    }

    window.location.href = `student-history.html?id=${studentId}&from=pending`;
}

function openDescriptionModal(studentName, studentId, description) {
    document.getElementById("modalStudentName").textContent = studentName || "N/A";
    document.getElementById("modalStudentRollNo").textContent = studentId || "N/A";
    document.getElementById("modalDescriptionText").textContent = description || "No description provided.";
    document.getElementById("descriptionModal").classList.remove("hidden");
}

function closeDescriptionModal() {
    document.getElementById("descriptionModal").classList.add("hidden");
}

function openStudentDetailsModalByIndex(index) {
    const student = buildPendingStudentData(currentPendingRequests[index] || {});
    openStudentDetailsModal(student);
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
}

function closeStudentDetailsModal() {
    document.getElementById("studentDetailsModal").classList.add("hidden");
}

window.addEventListener("click", function (event) {
    const descriptionModal = document.getElementById("descriptionModal");
    const studentDetailsModal = document.getElementById("studentDetailsModal");

    if (event.target === descriptionModal) closeDescriptionModal();
    if (event.target === studentDetailsModal) closeStudentDetailsModal();
});

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeDescriptionModal();
        closeStudentDetailsModal();
    }
});

function approveRequest(id) {
    fetch(`/request/approve/${id}`, {
        method: "PUT"
    })
        .then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                console.error("Approve API error:", errorText);
                throw new Error("Failed to approve request");
            }

            return res.json();
        })
        .then(() => {
            alert("The leave request has been approved successfully.");

            if (currentPendingRequests.length === 1 && currentPage > 0) {
                currentPage -= 1;
            }

            loadPendingRequests();
        })
        .catch(err => {
            console.error(err);
            alert("Error while approving request.");
        });
}

function rejectRequest(id) {
    const remark = prompt("Enter remark for rejection:");

    if (remark === null) return;

    if (remark.trim() === "") {
        alert("Rejection remark is required.");
        return;
    }

    fetch(`/request/reject/${id}?remark=${encodeURIComponent(remark.trim())}`, {
        method: "PUT"
    })
        .then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                console.error("Reject API error:", errorText);
                throw new Error("Failed to reject request");
            }

            return res.json();
        })
        .then(() => {
            alert("The leave request has been rejected successfully.");

            if (currentPendingRequests.length === 1 && currentPage > 0) {
                currentPage -= 1;
            }

            loadPendingRequests();
        })
        .catch(err => {
            console.error(err);
            alert("Error while rejecting request.");
        });
}

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

function escapeJsString(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "")
        .replace(/\n/g, "\\n");
}
