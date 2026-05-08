const user = JSON.parse(localStorage.getItem("user"));
const DASHBOARD_CACHE_PREFIX = "sanchara_dashboard_cache_";
const CERTIFICATE_REQUIRED_REASONS = [
    "HACKATHON",
    "SEMINAR",
    "MEDICAL LEAVE",
    "SPORTS EVENT",
    "WORKSHOP / TRAINING",
    "INTERNSHIP"
];

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
let pendingRejectId = null;

window.onload = function () {
    bindPendingPagination();
    bindRejectConfirmButton();
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

function bindRejectConfirmButton() {
    const confirmBtn = document.getElementById("confirmRejectBtn");

    if (confirmBtn) {
        confirmBtn.addEventListener("click", executeRejectWithRemark);
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
            updatePendingPagination();
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
            ? `
                <img
                    src="${escapeAttribute(studentData.photo)}"
                    alt="${escapeAttribute(studentData.name)}"
                    class="avatar"
                    loading="lazy"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                />
                <div class="student-avatar-fallback" style="display:none;">${escapeHtml(studentData.initial)}</div>
              `
            : `<div class="student-avatar-fallback">${escapeHtml(studentData.initial)}</div>`;

        const historyButton = req.studentId
            ? `
                <button class="btn btn-history" onclick="viewStudentHistory(${req.studentId})" type="button">
                    <i class="fa-solid fa-eye"></i>
                    <span>View History</span>
                </button>
              `
            : `
                <button class="btn btn-history disabled" disabled type="button">
                    <i class="fa-solid fa-eye"></i>
                    <span>View History</span>
                </button>
              `;

        table.innerHTML += `
            <tr>
                <td data-label="Student">
                    <div class="student-box" onclick="openStudentDetailsModalByIndex(${index})" title="View Student Details">
                        ${studentPhotoHtml}
                        <div class="student-meta">
                            <div class="student-name">${escapeHtml(studentData.name)}</div>
                            <div class="student-id">${escapeHtml(studentData.rollNo)}</div>
                        </div>
                    </div>
                </td>

                <td data-label="Reason / Event">${escapeHtml(req.reason || "-")}</td>

                <td data-label="Description">
                    ${formatDescription(req.description || "No description provided.", req.id || index)}
                </td>

                <td data-label="Start Date" class="date-cell">${formatDate(req.startDate)}</td>
                <td data-label="End Date" class="date-cell">${formatDate(req.endDate)}</td>
                <td data-label="Request Date" class="date-cell">${formatDate(req.requestDate)}</td>

                <td data-label="Actions">
                    <div class="action-group">
                        <button class="btn btn-approve" onclick="approveRequest(${req.id})" type="button">
                            <i class="fa-regular fa-circle-check"></i>
                            <span>Approve</span>
                        </button>

                        <button class="btn btn-reject" onclick="openRejectRemark(${req.id})" type="button">
                            <i class="fa-regular fa-circle-xmark"></i>
                            <span>Reject</span>
                        </button>

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

function formatDescription(desc, rowId) {
    const safeDesc = desc || "No description provided.";
    const isLong = safeDesc.length > 95;

    return `
        <div class="desc-box">
            <div id="desc-text-${rowId}" class="desc-text truncated">${escapeHtml(safeDesc)}</div>
            ${isLong ? `<span id="readmore-btn-${rowId}" class="read-more" onclick="toggleDescription(${rowId})">Read more</span>` : ""}
        </div>
    `;
}

function toggleDescription(rowId) {
    const descTextEl = document.getElementById(`desc-text-${rowId}`);
    const readMoreSpan = document.getElementById(`readmore-btn-${rowId}`);

    if (!descTextEl || !readMoreSpan) return;

    if (descTextEl.classList.contains("truncated")) {
        descTextEl.classList.remove("truncated");
        descTextEl.classList.add("full");
        readMoreSpan.innerHTML = "Read less";
    } else {
        descTextEl.classList.remove("full");
        descTextEl.classList.add("truncated");
        readMoreSpan.innerHTML = "Read more";
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

    if (isNaN(date.getTime())) {
        return escapeHtml(value);
    }

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

function openStudentDetailsModalByIndex(index) {
    const student = buildPendingStudentData(currentPendingRequests[index] || {});
    openStudentDetailsModal(student);
}

function openStudentDetailsModal(student) {
    const studentModalBody = document.getElementById("studentModalBody");

    if (!studentModalBody) return;

    const photoHtml = student.photo
        ? `
            <img
                src="${escapeAttribute(student.photo)}"
                class="avatar"
                alt="${escapeAttribute(student.name)}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="student-avatar-fallback" style="display:none;">${escapeHtml(student.initial)}</div>
          `
        : `<div class="student-avatar-fallback">${escapeHtml(student.initial)}</div>`;

    studentModalBody.innerHTML = `
        <div class="student-top">
            ${photoHtml}
            <div>
                <div class="student-top-name">${escapeHtml(student.name)}</div>
                <div class="student-top-id">${escapeHtml(student.rollNo)}</div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-field">
                <div class="info-label">Email</div>
                <div class="info-value small">${escapeHtml(student.email)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Branch</div>
                <div class="info-value">${escapeHtml(student.branch)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Section</div>
                <div class="info-value">${escapeHtml(student.section)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Semester</div>
                <div class="info-value">${escapeHtml(student.sem)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Gender</div>
                <div class="info-value">${escapeHtml(student.gender)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Date of Birth</div>
                <div class="info-value">${escapeHtml(student.dob)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Student Phone</div>
                <div class="info-value">${escapeHtml(student.studentPhone)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Parent Phone</div>
                <div class="info-value">${escapeHtml(student.parentPhone)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Father Name</div>
                <div class="info-value">${escapeHtml(student.fatherName)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Admission Type</div>
                <div class="info-value">${escapeHtml(student.admissionType)}</div>
            </div>

            <div class="info-field">
                <div class="info-label">Caste</div>
                <div class="info-value">${escapeHtml(student.caste)}</div>
            </div>
        </div>
    `;

    openOverlay("studentOverlay");
}

function openRejectRemark(id) {
    if (!id) return;

    pendingRejectId = id;

    const textarea = document.getElementById("rejectionRemarkText");

    if (textarea) {
        textarea.value = "";
    }

    openOverlay("rejectRemarkOverlay");
}

function executeRejectWithRemark() {
    if (pendingRejectId === null) return;

    const textarea = document.getElementById("rejectionRemarkText");
    const remarkText = textarea ? textarea.value.trim() : "";

    if (remarkText === "") {
        alert("Please provide a reason for rejection before confirming.");
        return;
    }

    const requestId = pendingRejectId;

    fetch(`/request/reject/${requestId}?remark=${encodeURIComponent(remarkText)}`, {
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
            pendingRejectId = null;
            patchHodDashboardCacheAfterReject(requestId);
            clearDashboardCachesByPrefix(`${DASHBOARD_CACHE_PREFIX}STUDENT_`);

            closeOverlayWithAnimation("rejectRemarkOverlay");

            const finalMsgSpan = document.getElementById("rejectFinalMessage");

            if (finalMsgSpan) {
                finalMsgSpan.innerHTML = `Request rejected with remark: "${escapeHtml(remarkText)}" <br> The student will be notified.`;
            }

            openOverlay("rejectOverlay");

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
            openOverlay("approveOverlay");
            patchHodDashboardCacheAfterApprove(id);
            clearDashboardCachesByPrefix(`${DASHBOARD_CACHE_PREFIX}STUDENT_`);

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

function openOverlay(id) {
    const overlay = document.getElementById(id);

    if (overlay) {
        overlay.classList.add("show");
    }
}

function closeOverlayWithAnimation(id) {
    const overlay = document.getElementById(id);

    if (!overlay) return;

    overlay.classList.remove("show");
}

window.addEventListener("click", function (event) {
    const overlays = [
        "studentOverlay",
        "descriptionOverlay",
        "approveOverlay",
        "rejectOverlay",
        "rejectRemarkOverlay"
    ];

    overlays.forEach(id => {
        const overlay = document.getElementById(id);

        if (event.target === overlay) {
            overlay.classList.remove("show");
        }
    });
});

function getHodDashboardCacheKey() {
    return `${DASHBOARD_CACHE_PREFIX}HOD_${String(user?.id || "anonymous")}`;
}

function getDashboardCache(key) {
    try {
        const rawValue = localStorage.getItem(key);
        return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
        return null;
    }
}

function saveDashboardCache(key, cache) {
    try {
        localStorage.setItem(key, JSON.stringify(cache));
    } catch (error) {
        console.warn("Dashboard cache save failed:", error);
    }
}

function clearDashboardCache(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn("Dashboard cache clear failed:", error);
    }
}

function clearDashboardCachesByPrefix(prefix) {
    try {
        for (let index = localStorage.length - 1; index >= 0; index -= 1) {
            const key = localStorage.key(index);
            if (key && key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        }
    } catch (error) {
        console.warn("Dashboard cache prefix clear failed:", error);
    }
}

function normalizeCacheReason(reason) {
    return String(reason || "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}

function isCertificateRequiredForCache(reason) {
    return CERTIFICATE_REQUIRED_REASONS.includes(normalizeCacheReason(reason));
}

function patchHodDashboardCacheAfterApprove(requestId) {
    const cacheKey = getHodDashboardCacheKey();
    const cache = getDashboardCache(cacheKey);
    const request = currentPendingRequests.find(item => Number(item?.id) === Number(requestId));

    if (!cache?.data?.summary) {
        clearDashboardCache(cacheKey);
        return;
    }

    cache.data.summary.pendingCount = Math.max(0, (Number(cache.data.summary.pendingCount) || 0) - 1);
    cache.data.summary.approvedCount = (Number(cache.data.summary.approvedCount) || 0) + 1;

    if (request && isCertificateRequiredForCache(request.reason)) {
        cache.data.summary.certificatePendingCount = (Number(cache.data.summary.certificatePendingCount) || 0) + 1;
    }

    cache.savedAt = Date.now();
    saveDashboardCache(cacheKey, cache);
}

function patchHodDashboardCacheAfterReject(requestId) {
    const cacheKey = getHodDashboardCacheKey();
    const cache = getDashboardCache(cacheKey);

    if (!cache?.data?.summary) {
        clearDashboardCache(cacheKey);
        return;
    }

    cache.data.summary.pendingCount = Math.max(0, (Number(cache.data.summary.pendingCount) || 0) - 1);
    cache.data.summary.rejectedCount = (Number(cache.data.summary.rejectedCount) || 0) + 1;
    cache.savedAt = Date.now();
    saveDashboardCache(cacheKey, cache);
}

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeOverlayWithAnimation("studentOverlay");
        closeOverlayWithAnimation("descriptionOverlay");
        closeOverlayWithAnimation("approveOverlay");
        closeOverlayWithAnimation("rejectOverlay");
        closeOverlayWithAnimation("rejectRemarkOverlay");
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
