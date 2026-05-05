const user = JSON.parse(localStorage.getItem("user"));

const CERTIFICATE_REQUIRED_REASONS = [
    "HACKATHON",
    "SEMINAR",
    "MEDICAL LEAVE",
    "SPORTS EVENT",
    "WORKSHOP / TRAINING",
    "INTERNSHIP"
];

const STUDENT_PHOTO_BASE_URL = "https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS";
const TRACKING_PAGE_SIZE = 20;

let currentTrackingItems = [];
let currentRejectCertificateId = null;
let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
let isTrackingLoading = false;
let searchDebounceTimer = null;
let visibleTrackingItems = [];

if (!user) {
    window.top.location.href = "index.html";
}

window.onload = function () {
    bindFilters();
    bindTrackingPagination();
    loadCertificateTracking();
};

function bindFilters() {
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const reminderFilter = document.getElementById("reminderFilter");
    const sortFilter = document.getElementById("sortFilter");

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            currentPage = 0;
            window.clearTimeout(searchDebounceTimer);
            searchDebounceTimer = window.setTimeout(loadCertificateTracking, 250);
        });
    }

    [statusFilter, reminderFilter, sortFilter].forEach(element => {
        if (!element) return;

        element.addEventListener("change", function () {
            currentPage = 0;
            loadCertificateTracking();
        });
    });
}

function bindTrackingPagination() {
    const prevBtn = document.getElementById("trackingPrevBtn");
    const nextBtn = document.getElementById("trackingNextBtn");

    if (prevBtn) {
        prevBtn.addEventListener("click", function () {
            if (currentPage > 0 && !isTrackingLoading) {
                currentPage -= 1;
                loadCertificateTracking();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", function () {
            if (currentPage + 1 < totalPages && !isTrackingLoading) {
                currentPage += 1;
                loadCertificateTracking();
            }
        });
    }
}

function loadCertificateTracking() {
    isTrackingLoading = true;
    renderTrackingLoadingState();
    updateTrackingPagination();

    const searchTerm = document.getElementById("searchInput")?.value?.trim() || "";
    const url = `/request/hod/${user.id}/certificate-tracking?page=${currentPage}&size=${TRACKING_PAGE_SIZE}&search=${encodeURIComponent(searchTerm)}`;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load certificate tracking data");
            return res.json();
        })
        .then(data => {
            currentTrackingItems = Array.isArray(data.content) ? data.content : [];
            totalPages = Number(data.totalPages) || 0;
            totalElements = Number(data.totalElements) || 0;

            if (totalPages > 0 && currentPage >= totalPages) {
                currentPage = totalPages - 1;
                return loadCertificateTracking();
            }

            applyFiltersAndSort();
            updateTrackingPagination();
        })
        .catch(err => {
            console.error(err);
            currentTrackingItems = [];
            totalPages = 0;
            totalElements = 0;
            renderTrackingErrorState();
            updateTrackingPagination();
        })
        .finally(() => {
            isTrackingLoading = false;
        });
}

function renderTrackingLoadingState() {
    const table = document.getElementById("trackingTable");
    const noResultsMsg = document.getElementById("noResultsMsg");
    const status = document.getElementById("trackingStatus");

    if (noResultsMsg) {
        noResultsMsg.style.display = "none";
    }

    if (status) {
        status.textContent = "Loading certificate tracking data...";
    }

    if (table) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-row">Loading certificate tracking data...</td>
            </tr>
        `;
    }
}

function renderTrackingErrorState() {
    const table = document.getElementById("trackingTable");
    const noResultsMsg = document.getElementById("noResultsMsg");
    const status = document.getElementById("trackingStatus");

    if (noResultsMsg) {
        noResultsMsg.style.display = "none";
    }

    if (status) {
        status.textContent = "Unable to load certificate tracking data.";
    }

    if (table) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-row">Unable to load certificate tracking data.</td>
            </tr>
        `;
    }
}

function applyFiltersAndSort() {
    const searchTerm = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
    const statusFilter = document.getElementById("statusFilter")?.value || "all";
    const reminderFilter = document.getElementById("reminderFilter")?.value || "all";
    const sortFilter = document.getElementById("sortFilter")?.value || "date-desc";

    let list = [...currentTrackingItems];

    list = list.filter(req => {
        const statusKey = getStatusKey(req);
        const studentName = String(req.studentName || "").toLowerCase();
        const rollNo = String(req.studentRollNo || "").toLowerCase();
        const eventName = String(req.reason || "").toLowerCase();

        const matchesSearch =
            studentName.includes(searchTerm) ||
            rollNo.includes(searchTerm) ||
            eventName.includes(searchTerm);

        const matchesStatus = statusFilter === "all" || statusFilter === statusKey;

        let matchesReminder = true;
        const needsReminder = canSendReminder(req);

        if (reminderFilter === "needs-reminder") {
            matchesReminder = needsReminder;
        } else if (reminderFilter === "no-action") {
            matchesReminder = !needsReminder;
        }

        return matchesSearch && matchesStatus && matchesReminder;
    });

    list.sort((a, b) => {
        const nameA = String(a.studentName || "").toLowerCase();
        const nameB = String(b.studentName || "").toLowerCase();
        const dateA = new Date(a.endDate || a.requestDate || 0);
        const dateB = new Date(b.endDate || b.requestDate || 0);

        if (sortFilter === "name-asc") return nameA.localeCompare(nameB);
        if (sortFilter === "name-desc") return nameB.localeCompare(nameA);
        if (sortFilter === "date-asc") return dateA - dateB;
        return dateB - dateA;
    });

    renderTrackingTable(list);
}

function renderTrackingTable(list) {
    const table = document.getElementById("trackingTable");
    const noResultsMsg = document.getElementById("noResultsMsg");
    const status = document.getElementById("trackingStatus");

    if (!table) return;

    table.innerHTML = "";
    visibleTrackingItems = list;

    if (currentTrackingItems.length === 0) {
        if (noResultsMsg) {
            noResultsMsg.style.display = "none";
        }

        if (status) {
            status.textContent = totalElements === 0
                ? "No approved certificate-required requests found."
                : "No certificate records on this page.";
        }

        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-row">No approved certificate-required requests found.</td>
            </tr>
        `;
        return;
    }

    if (list.length === 0) {
        if (noResultsMsg) {
            noResultsMsg.style.display = "block";
        }

        if (status) {
            status.textContent = `Showing ${currentTrackingItems.length} records on this page`;
        }

        table.innerHTML = "";
        return;
    }

    if (noResultsMsg) {
        noResultsMsg.style.display = "none";
    }

    if (status) {
        const start = currentPage * TRACKING_PAGE_SIZE + 1;
        const end = currentPage * TRACKING_PAGE_SIZE + currentTrackingItems.length;
        status.textContent = `Showing ${start}-${end} of ${totalElements} certificate records`;
    }

    list.forEach((req, index) => {
        const studentData = buildTrackingStudentData(req);
        const studentAvatar = studentData.photo
            ? `<img src="${escapeAttribute(studentData.photo)}" class="student-avatar" alt="Avatar" loading="lazy"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="student-avatar-fallback" style="display:none;">${escapeHtml(studentData.initial)}</div>`
            : `<div class="student-avatar-fallback">${escapeHtml(studentData.initial)}</div>`;

        table.innerHTML += `
            <tr class="request-row">
                <td data-label="Student Details">
                    <div class="student-profile" onclick="openStudentDetailsModalByIndex(${index})">
                        ${studentAvatar}
                        <div class="student-info">
                            <span class="name">${escapeHtml(studentData.name)}</span>
                            <span class="roll">${escapeHtml(studentData.rollNo)}</span>
                        </div>
                    </div>
                </td>
                <td data-label="Event" style="font-weight:600;">
                    ${escapeHtml(req.reason || "-")}
                </td>
                <td data-label="Status Progress">
                    ${getTimelineTracker(req)}
                </td>
                <td data-label="Status">
                    ${getStatusBadge(req)}
                </td>
                <td data-label="Actions">
                    ${getActionButtons(req)}
                </td>
            </tr>
        `;
    });
}

function updateTrackingPagination() {
    const prevBtn = document.getElementById("trackingPrevBtn");
    const nextBtn = document.getElementById("trackingNextBtn");
    const pageInfo = document.getElementById("trackingPageInfo");

    if (prevBtn) {
        prevBtn.disabled = isTrackingLoading || currentPage <= 0;
    }

    if (nextBtn) {
        nextBtn.disabled = isTrackingLoading || totalPages === 0 || currentPage >= totalPages - 1;
    }

    if (pageInfo) {
        const displayPage = totalPages === 0 ? 0 : currentPage + 1;
        const safeTotalPages = totalPages === 0 ? 0 : totalPages;
        pageInfo.textContent = `Page ${displayPage} of ${safeTotalPages}`;
    }
}

function buildTrackingStudentData(req) {
    const name = req.studentName || "Student";
    const rollNo = req.studentRollNo || req.studentId || "N/A";

    return {
        photo: getStudentPhoto(req),
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
        initial: getStudentInitial(name)
    };
}

function getTimelineTracker(req) {
    const statusKey = getStatusKey(req);
    const dueShort = formatShortDate(req.certificateDueDate);

    if (statusKey === "active") {
        return `
            <div class="timeline-tracker">
                <div class="track-step current-blue"><i class="fa-solid fa-spinner fa-spin"></i><span class="step-label">Progress</span></div>
                <div class="track-line"></div>
                <div class="track-step"><i class="fa-solid fa-flag-checkered"></i><span class="step-label">Ended</span></div>
                <div class="track-line"></div>
                <div class="track-step"><i class="fa-solid fa-cloud-arrow-up"></i><span class="step-label">Upload</span></div>
                <div class="track-line">
                    <div class="deadline-marker inactive">
                        <span class="d-text">Deadline</span>
                        <i class="fa-solid fa-clock"></i>
                        <div class="stop-line"></div>
                        <span class="d-date">${dueShort}</span>
                    </div>
                </div>
                <div class="track-step"><i class="fa-solid fa-user-shield"></i><span class="step-label">Review</span></div>
            </div>
        `;
    }

    if (statusKey === "pending") {
        return `
            <div class="timeline-tracker">
                <div class="track-step done"><i class="fa-solid fa-spinner"></i><span class="step-label">Progress</span></div>
                <div class="track-line done"></div>
                <div class="track-step done"><i class="fa-solid fa-flag-checkered"></i><span class="step-label">Ended</span></div>
                <div class="track-line done"></div>
                <div class="track-step current-orange"><i class="fa-solid fa-cloud-arrow-up"></i><span class="step-label">Upload</span></div>
                <div class="track-line wait">
                    <div class="deadline-marker">
                        <span class="d-text">Deadline</span>
                        <i class="fa-solid fa-hand"></i>
                        <div class="stop-line"></div>
                        <span class="d-date">${dueShort}</span>
                    </div>
                </div>
                <div class="track-step"><i class="fa-solid fa-user-shield"></i><span class="step-label">Review</span></div>
            </div>
        `;
    }

    if (statusKey === "submitted") {
        return `
            <div class="timeline-tracker">
                <div class="track-step done"><i class="fa-solid fa-spinner"></i><span class="step-label">Progress</span></div>
                <div class="track-line done"></div>
                <div class="track-step done"><i class="fa-solid fa-flag-checkered"></i><span class="step-label">Ended</span></div>
                <div class="track-line done"></div>
                <div class="track-step done"><i class="fa-solid fa-cloud-arrow-up"></i><span class="step-label">Uploaded</span></div>
                <div class="track-line done">
                    <div class="deadline-marker passed">
                        <span class="d-text">Passed</span>
                        <i class="fa-solid fa-check"></i>
                        <div class="stop-line"></div>
                        <span class="d-date">${dueShort}</span>
                    </div>
                </div>
                <div class="track-step current-blue"><i class="fa-solid fa-user-clock"></i><span class="step-label">Review</span></div>
            </div>
        `;
    }

    if (statusKey === "verified") {
        return `
            <div class="timeline-tracker">
                <div class="track-step done"><i class="fa-solid fa-spinner"></i><span class="step-label">Progress</span></div>
                <div class="track-line done"></div>
                <div class="track-step done"><i class="fa-solid fa-flag-checkered"></i><span class="step-label">Ended</span></div>
                <div class="track-line done"></div>
                <div class="track-step done"><i class="fa-solid fa-cloud-arrow-up"></i><span class="step-label">Uploaded</span></div>
                <div class="track-line done">
                    <div class="deadline-marker passed">
                        <span class="d-text">Passed</span>
                        <i class="fa-solid fa-check"></i>
                        <div class="stop-line"></div>
                        <span class="d-date">${dueShort}</span>
                    </div>
                </div>
                <div class="track-step done"><i class="fa-solid fa-check-double"></i><span class="step-label">Verified</span></div>
            </div>
        `;
    }

    if (statusKey === "rejected") {
        return `
            <div class="timeline-tracker">
                <div class="track-step done"><i class="fa-solid fa-spinner"></i><span class="step-label">Progress</span></div>
                <div class="track-line done"></div>
                <div class="track-step done"><i class="fa-solid fa-flag-checkered"></i><span class="step-label">Ended</span></div>
                <div class="track-line done"></div>
                <div class="track-step done"><i class="fa-solid fa-cloud-arrow-up"></i><span class="step-label">Uploaded</span></div>
                <div class="track-line error">
                    <div class="deadline-marker">
                        <span class="d-text">Rejected</span>
                        <i class="fa-solid fa-ban"></i>
                        <div class="stop-line"></div>
                        <span class="d-date">${dueShort}</span>
                    </div>
                </div>
                <div class="track-step error"><i class="fa-solid fa-xmark"></i><span class="step-label">Rejected</span></div>
            </div>
        `;
    }

    return `
        <div class="timeline-tracker">
            <div class="track-step done"><i class="fa-solid fa-spinner"></i><span class="step-label">Progress</span></div>
            <div class="track-line done"></div>
            <div class="track-step done"><i class="fa-solid fa-flag-checkered"></i><span class="step-label">Ended</span></div>
            <div class="track-line done"></div>
            <div class="track-step error"><i class="fa-solid fa-triangle-exclamation"></i><span class="step-label">Missed</span></div>
            <div class="track-line error">
                <div class="deadline-marker">
                    <span class="d-text">Deadline</span>
                    <i class="fa-solid fa-ban"></i>
                    <div class="stop-line"></div>
                    <span class="d-date">${dueShort}</span>
                </div>
            </div>
            <div class="track-step"><i class="fa-solid fa-user-shield"></i><span class="step-label">Review</span></div>
        </div>
    `;
}

function getStatusBadge(req) {
    const statusKey = getStatusKey(req);

    if (statusKey === "active") return `<span class="status-badge badge-active">Active</span>`;
    if (statusKey === "pending") return `<span class="status-badge badge-pending">Pending</span>`;
    if (statusKey === "submitted") return `<span class="status-badge badge-submitted">Review</span>`;
    if (statusKey === "verified") return `<span class="status-badge badge-verified">Verified</span>`;

    if (statusKey === "rejected") {
        const remark = req.certificateRejectionRemark
            ? `<div class="remark-small">Remark: ${escapeHtml(req.certificateRejectionRemark)}</div>`
            : "";
        return `<span class="status-badge badge-rejected">Rejected</span>${remark}`;
    }

    return `<span class="status-badge badge-overdue">Overdue</span>`;
}

function getActionButtons(req) {
    const statusKey = getStatusKey(req);

   const certificateFileUrl = getCertificateViewUrl(req);
    const certificateId = getCertificateId(req);

    if (certificateFileUrl) {
        if (statusKey === "verified") {
            return `
                <div class="action-group">
                    <a href="${escapeAttribute(certificateFileUrl)}" target="_blank" class="hod-action-btn btn-view btn-icon" title="View Certificate">
                        <i class="fa-solid fa-eye"></i>
                    </a>
                    <span class="no-action-text">Verified</span>
                </div>
            `;
        }

        if (statusKey === "rejected") {
            return `
                <div class="action-group">
                    <a href="${escapeAttribute(certificateFileUrl)}" target="_blank" class="hod-action-btn btn-view btn-icon" title="View Certificate">
                        <i class="fa-solid fa-eye"></i>
                    </a>
                    <button class="hod-action-btn btn-reject btn-icon" onclick="openRejectModal(${certificateId})" title="Update Remark">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
            `;
        }

        return `
            <div class="action-group">
                <a href="${escapeAttribute(certificateFileUrl)}" target="_blank" class="hod-action-btn btn-view btn-icon" title="View Certificate">
                    <i class="fa-solid fa-eye"></i>
                </a>
                <button class="hod-action-btn btn-verify btn-icon" onclick="verifyCertificate(${certificateId})" title="Verify Certificate">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="hod-action-btn btn-reject btn-icon" onclick="openRejectModal(${certificateId})" title="Reject Certificate">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
    }

    if (canSendReminder(req)) {
        return `
            <div class="action-group">
                <button class="hod-action-btn btn-remind btn-icon"
                    onclick="sendReminder(${req.requestId}, '${escapeJsString(req.studentName || "Student")}')"
                    title="Send Reminder">
                    <i class="fa-solid fa-bell"></i>
                </button>
            </div>
        `;
    }

    if (statusKey === "active") {
        return `<span class="no-action-text">Event ongoing</span>`;
    }

    return `<span class="no-action-text">No action available</span>`;
}

function verifyCertificate(certificateId) {
    const confirmed = confirm("Are you sure you want to verify this certificate?");
    if (!confirmed) return;

    fetch(`/certificate/verify/${certificateId}`, {
        method: "POST"
    })
        .then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to verify certificate");
            }
            return res.json();
        })
        .then(() => {
            openModal("verifyModal");

            if (currentTrackingItems.length === 1 && currentPage > 0) {
                currentPage -= 1;
            }

            loadCertificateTracking();
        })
        .catch(err => {
            console.error(err);
            alert(err.message || "Error while verifying certificate.");
        });
}

function openRejectModal(certificateId) {
    currentRejectCertificateId = certificateId;
    document.getElementById("rejectRemarks").value = "";
    validateRemarks();
    openModal("rejectModal");
}

function validateRemarks() {
    const btn = document.getElementById("submitRejectBtn");
    const remarks = document.getElementById("rejectRemarks").value.trim();
    btn.disabled = remarks.length === 0;
}

function submitReject() {
    const remark = document.getElementById("rejectRemarks").value.trim();

    if (!currentRejectCertificateId) {
        alert("Certificate ID missing.");
        return;
    }

    if (!remark) {
        alert("Rejection remark is required.");
        return;
    }

    fetch(`/certificate/reject/${currentRejectCertificateId}?remark=${encodeURIComponent(remark)}`, {
        method: "POST"
    })
        .then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to reject certificate");
            }
            return res.json();
        })
        .then(() => {
            closeModal("rejectModal");
            currentRejectCertificateId = null;

            if (currentTrackingItems.length === 1 && currentPage > 0) {
                currentPage -= 1;
            }

            loadCertificateTracking();
        })
        .catch(err => {
            console.error(err);
            alert(err.message || "Error while rejecting certificate.");
        });
}

function sendReminder(requestId, studentName) {
    const confirmed = confirm(`Send reminder to ${studentName} now?`);
    if (!confirmed) return;

    fetch(`/notification/send-reminder/${requestId}`, {
        method: "POST"
    })
        .then(async res => {
            const text = await res.text();

            if (!res.ok) {
                throw new Error(text || "Failed to send reminder");
            }

            return text;
        })
        .then(() => {
            openModal("remindModal");
            loadCertificateTracking();
        })
        .catch(err => {
            console.error(err);
            alert(err.message || "Error while sending reminder.");
        });
}

function openStudentDetailsModalByIndex(index) {
    const student = buildTrackingStudentData(visibleTrackingItems[index] || {});
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

    openModal("studentDetailsModal");
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("active"), 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove("active");
    setTimeout(() => {
        modal.style.display = "none";
    }, 200);
}

window.addEventListener("click", function (event) {
    document.querySelectorAll(".modal-overlay").forEach(modal => {
        if (event.target === modal) {
            closeModal(modal.id);
        }
    });
});

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        document.querySelectorAll(".modal-overlay").forEach(modal => {
            if (modal.classList.contains("active")) {
                closeModal(modal.id);
            }
        });
    }
});

function getStatusKey(req) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = normalizeDate(req.endDate);
    const dueDate = normalizeDate(req.certificateDueDate);
    const certificateId = getCertificateId(req);

    if (certificateId) {
        const certStatus = String(
            req.certificateStatus ||
            req.certificate?.status ||
            ""
        ).toUpperCase();

        if (certStatus === "VERIFIED") return "verified";
        if (certStatus === "REJECTED") return "rejected";
        return "submitted";
    }

    if (endDate && today < endDate) return "active";
    if (dueDate && today > dueDate) return "overdue";

    return "pending";
}

function canSendReminder(req) {
    if (getCertificateFileUrl(req)) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = normalizeDate(req.endDate);
    const dueDate = normalizeDate(req.certificateDueDate);

    return !!(endDate && dueDate && today >= endDate && today <= dueDate);
}

function getStudentPhoto(req) {
    const customPhoto = req.studentPhotoUrl || "";
    if (customPhoto && customPhoto.trim() !== "") return customPhoto.trim();

    const rollNo = req.studentRollNo || "";
    if (!rollNo || !String(rollNo).trim()) return "";

    const cleanRollNo = String(rollNo).trim().toUpperCase();
    return `${STUDENT_PHOTO_BASE_URL}/${encodeURIComponent(cleanRollNo)}/${encodeURIComponent(cleanRollNo)}.jpg`;
}

function getStudentInitial(name) {
    if (!name || name === "N/A") return "S";
    return String(name).trim().charAt(0).toUpperCase();
}

function getDisplayValue(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return "-";
    }
    return String(value);
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

function normalizeDate(dateValue) {
    if (!dateValue) return null;

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;

    date.setHours(0, 0, 0, 0);
    return date;
}

function formatShortDate(value) {
    if (!value) return "--/--";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "--/--";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${day}/${month}`;
}

function getCertificateId(req) {
    return req.certificateId || req.certificate?.id || null;
}

function getCertificateFileUrl(req) {
    let filePath =
        req.certificateFilePath ||
        req.certificate?.filePath ||
        req.filePath ||
        "";

    filePath = String(filePath || "").trim();

    if (!filePath) return "";

    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
        return filePath;
    }

    filePath = filePath.replace(/\\/g, "/");

    const uploadsIndex = filePath.indexOf("/uploads/");
    if (uploadsIndex !== -1) {
        return filePath.substring(uploadsIndex);
    }

    if (filePath.startsWith("uploads/")) {
        return "/" + filePath;
    }

    if (filePath.startsWith("/uploads/")) {
        return filePath;
    }

    return filePath.startsWith("/") ? filePath : "/" + filePath;
}

function getCertificateViewUrl(req) {
    const directUrl = getCertificateFileUrl(req);

    if (isCertificateImageUrl(directUrl)) {
        return directUrl;
    }

    const certificateId = getCertificateId(req);

    if (certificateId) {
        return `/certificate/view/${certificateId}`;
    }

    return directUrl;
}

function isCertificateImageUrl(filePath) {
    const normalized = String(filePath || "").toLowerCase();
    return normalized.includes(".jpg")
        || normalized.includes(".jpeg")
        || normalized.includes(".png")
        || normalized.includes("/image/upload/");
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
        .replace(/>/g, "&gt;")
        .replace(/'/g, "&#39;");
}

function escapeJsString(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "")
        .replace(/\n/g, "\\n");
}
