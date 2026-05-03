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

let allTrackingRequests = [];
let currentRejectCertificateId = null;

if (!user) {
    window.top.location.href = "index.html";
}

window.onload = function () {
    loadCertificateTracking();
    bindFilters();
};

function bindFilters() {
    document.getElementById("searchInput").addEventListener("input", applyFiltersAndSort);
    document.getElementById("statusFilter").addEventListener("change", applyFiltersAndSort);
    document.getElementById("reminderFilter").addEventListener("change", applyFiltersAndSort);
    document.getElementById("sortFilter").addEventListener("change", applyFiltersAndSort);
}

function loadCertificateTracking() {
    fetch(`/request/hod/${user.id}`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load requests");
            return res.json();
        })
        .then(data => {
            if (!Array.isArray(data)) data = [];

            allTrackingRequests = data.filter(req => {
                const status = String(req.status || "").toUpperCase();
                return status === "APPROVED" && isCertificateRequired(req.reason);
            });

            applyFiltersAndSort();
        })
        .catch(err => {
            console.error(err);
            document.getElementById("trackingTable").innerHTML = `
                <tr>
                    <td colspan="5" class="empty-row">Unable to load certificate tracking data.</td>
                </tr>
            `;
        });
}

function applyFiltersAndSort() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
    const statusFilter = document.getElementById("statusFilter").value;
    const reminderFilter = document.getElementById("reminderFilter").value;
    const sortFilter = document.getElementById("sortFilter").value;

    let list = [...allTrackingRequests];

    list = list.filter(req => {
        const statusKey = getStatusKey(req);
        const studentName = getStudentName(req).toLowerCase();
        const rollNo = getStudentIdentifier(req).toLowerCase();
        const eventName = String(req.reason || "").toLowerCase();

        const matchesSearch =
            studentName.includes(searchTerm) ||
            rollNo.includes(searchTerm) ||
            eventName.includes(searchTerm);

        const matchesStatus =
            statusFilter === "all" ||
            statusFilter === statusKey;

        const needsReminder = canSendReminder(req);

        let matchesReminder = true;

        if (reminderFilter === "needs-reminder") {
            matchesReminder = needsReminder;
        } else if (reminderFilter === "no-action") {
            matchesReminder = !needsReminder;
        }

        return matchesSearch && matchesStatus && matchesReminder;
    });

    list.sort((a, b) => {
        const nameA = getStudentName(a).toLowerCase();
        const nameB = getStudentName(b).toLowerCase();

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

    table.innerHTML = "";

    if (allTrackingRequests.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-row">No approved certificate-required requests found.</td>
            </tr>
        `;
        noResultsMsg.style.display = "none";
        return;
    }

    if (list.length === 0) {
        noResultsMsg.style.display = "block";
        return;
    }

    noResultsMsg.style.display = "none";

    list.forEach(req => {
        const statusKey = getStatusKey(req);
        const student = req.student || {};
        const studentName = getStudentName(req);
        const studentId = getStudentIdentifier(req);
        const studentPhoto = getStudentPhoto(req);
        const studentInitial = getStudentInitial(req);

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

        const encodedStudent = escapeAttribute(JSON.stringify(studentData));

        const studentAvatar = studentPhoto
            ? `<img src="${escapeAttribute(studentPhoto)}" class="student-avatar" alt="Avatar"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="student-avatar-fallback" style="display:none;">${escapeHtml(studentInitial)}</div>`
            : `<div class="student-avatar-fallback">${escapeHtml(studentInitial)}</div>`;

        const row = `
            <tr class="request-row"
                data-status="${statusKey}"
                data-name="${escapeAttribute(studentName)}"
                data-date="${escapeAttribute(req.endDate || "")}">
                
                <td data-label="Student Details">
                    <div class="student-profile" onclick="openStudentDetailsModalFromString('${encodedStudent}')">
                        ${studentAvatar}
                        <div class="student-info">
                            <span class="name">${escapeHtml(studentName)}</span>
                            <span class="roll">${escapeHtml(studentId)}</span>
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

        table.innerHTML += row;
    });
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
        const remark = req.certificate && req.certificate.rejectionRemark
            ? `<div class="remark-small">Remark: ${escapeHtml(req.certificate.rejectionRemark)}</div>`
            : "";
        return `<span class="status-badge badge-rejected">Rejected</span>${remark}`;
    }

    return `<span class="status-badge badge-overdue">Overdue</span>`;
}

function getActionButtons(req) {
    const statusKey = getStatusKey(req);

    if (req.certificate && req.certificate.filePath) {
        const filePath = req.certificate.filePath;
        const certificateId = req.certificate.id;

        if (statusKey === "verified") {
            return `<span class="no-action-text">No action needed</span>`;
        }

        if (statusKey === "rejected") {
            return `
                <div class="action-group">
                    <a href="${escapeAttribute(filePath)}" target="_blank" class="hod-action-btn btn-view btn-icon" title="View Certificate">
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
                <a href="${escapeAttribute(filePath)}" target="_blank" class="hod-action-btn btn-view btn-icon" title="View Certificate">
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
                    onclick="sendReminder(${req.id}, '${escapeJsString(getStudentName(req))}')"
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

function openStudentDetailsModalFromString(studentString) {
    const student = JSON.parse(studentString.replace(/&quot;/g, '"'));
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

    if (req.certificate) {
        const certStatus = String(req.certificate.status || "").toUpperCase();

        if (certStatus === "VERIFIED") return "verified";
        if (certStatus === "REJECTED") return "rejected";

        return "submitted";
    }

    if (endDate && today < endDate) return "active";
    if (dueDate && today > dueDate) return "overdue";

    return "pending";
}

function canSendReminder(req) {
    if (req.certificate && req.certificate.filePath) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = normalizeDate(req.endDate);
    const dueDate = normalizeDate(req.certificateDueDate);

    return today >= endDate && today <= dueDate;
}

function getStudentName(req) {
    if (req.student) {
        return req.student.name || req.student.username || req.student.fullName || "Student";
    }
    return "Student";
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

    if (customPhoto && customPhoto.trim() !== "") return customPhoto;

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