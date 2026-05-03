const user = JSON.parse(localStorage.getItem("user"));
const fileActionMap = {};
let deleteRequestId = null;
let resolvedStudentId = null;

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

window.onload = function () {
    bindStaticEvents();
    loadCertificateRequests();
};

function bindStaticEvents() {
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", function () {
            if (deleteRequestId !== null) {
                performDeleteCertificate(deleteRequestId);
            }
        });
    }
}

async function loadCertificateRequests() {
    try {
        const studentId = await getStudentIdForRequests();
        const res = await fetch(`/request/student/${studentId}`);

        if (!res.ok) {
            throw new Error("Failed to load requests");
        }

        const data = await res.json();
        const table = document.getElementById("certificateTable");
        table.innerHTML = "";

        if (!data || data.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-row">No requests found.</td>
                </tr>
            `;
            return;
        }

        const approvedCertificateRequests = data.filter(req => {
            const status = String(req.status || "").toUpperCase();
            const reason = normalizeReason(req.reason);
            return status === "APPROVED" && CERTIFICATE_REQUIRED_REASONS.includes(reason);
        });

        if (approvedCertificateRequests.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-row">
                        No approved certificate-required requests available for upload.
                    </td>
                </tr>
            `;
            return;
        }

        approvedCertificateRequests.forEach(req => {
            table.innerHTML += buildCertificateRow(req);
        });
    } catch (err) {
        console.error(err);
        document.getElementById("certificateTable").innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">Unable to load certificate requests.</td>
            </tr>
        `;
    }
}

async function getStudentIdForRequests() {
    if (resolvedStudentId) {
        return resolvedStudentId;
    }

    if (!user?.id) {
        throw new Error("User ID not found");
    }

    const res = await fetch(`/student/user/${user.id}`);

    if (!res.ok) {
        throw new Error("Unable to load student info");
    }

    const student = await res.json();
    resolvedStudentId = student?.id || user.id;
    return resolvedStudentId;
}

function buildCertificateRow(req) {
    const requestId = req.id;
    const reason = escapeHtml(req.reason || "—");
    const hodName = req.hod && req.hod.username ? escapeHtml(req.hod.username) : "—";
    const requestStatus = escapeHtml(req.status || "APPROVED");
    const endDate = formatDate(req.endDate);
    const dueDate = formatDate(req.certificateDueDate);

    const fileInputHtml = `
        <input
            type="file"
            id="file-${requestId}"
            class="hidden-file-input"
            accept=".jpg,.jpeg,.png,.pdf"
            onchange="handleFileSelected(${requestId})"
        />
    `;

    let certificatePathHtml = `
        <div class="file-cell-wrap">
            <span class="no-file">No file uploaded yet.</span>
            <div class="file-name" id="file-name-${requestId}"></div>
        </div>
    `;

    let actionHtml = `
        ${fileInputHtml}
        <div class="upload-group">
            <div class="custom-file-input-wrapper">
                <div class="file-name-display" id="display-${requestId}">Choose file...</div>
                <label for="file-${requestId}" class="browse-btn-label" onclick="setActionType(${requestId}, 'UPLOAD')">Browse</label>
            </div>
            <button class="upload-action-btn" onclick="openFilePicker(${requestId}, 'UPLOAD')">
                <i class="fa-solid fa-cloud-arrow-up"></i> Upload
            </button>
        </div>
    `;

    if (req.certificate && req.certificate.filePath) {
        const certStatus = String(req.certificate.status || "SUBMITTED").toUpperCase();
        const rejectionRemark = req.certificate.rejectionRemark || "";

        certificatePathHtml = `
            <div class="file-cell-wrap">
                <a href="${escapeAttribute(req.certificate.filePath)}" target="_blank" class="view-link">View File</a>
                <div class="inline-student-status">
                    ${getStudentCertificateStatusHtml(certStatus, rejectionRemark)}
                </div>
                <div class="file-name" id="file-name-${requestId}"></div>
            </div>
        `;

        if (certStatus === "VERIFIED") {
            actionHtml = `
                <div class="verified-msg-stacked">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>Certificate<br>already verified</span>
                </div>
            `;
        } else if (certStatus === "REJECTED") {
            actionHtml = `
                ${fileInputHtml}
                <div class="upload-group">
                    <div class="custom-file-input-wrapper warning-border">
                        <div class="file-name-display" id="display-${requestId}">Choose replacement...</div>
                        <label for="file-${requestId}" class="browse-btn-label" onclick="setActionType(${requestId}, 'REPLACE')">Browse</label>
                    </div>
                    <button class="upload-action-btn btn-replace" onclick="openFilePicker(${requestId}, 'REPLACE')">
                        <i class="fa-solid fa-arrow-rotate-right"></i> Replace
                    </button>
                </div>
            `;
        } else {
            actionHtml = `
                ${fileInputHtml}
                <div class="upload-group">
                    <div class="custom-file-input-wrapper">
                        <div class="file-name-display" id="display-${requestId}">Choose file...</div>
                        <label for="file-${requestId}" class="browse-btn-label" onclick="setActionType(${requestId}, 'UPDATE')">Browse</label>
                    </div>
                    <button class="upload-action-btn" onclick="openFilePicker(${requestId}, 'UPDATE')">
                        <i class="fa-solid fa-upload"></i> Update
                    </button>
                    <button class="upload-action-btn btn-delete" onclick="deleteCertificate(${requestId})">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            `;
        }
    }

    return `
        <tr>
            <td data-label="Event / Reason">${reason}</td>
            <td data-label="HOD">${hodName}</td>
            <td data-label="Status">
                ${getRequestStatusBadge(requestStatus)}
            </td>
            <td data-label="End Date" class="nowrap-date">${endDate}</td>
            <td data-label="Certificate Due" class="nowrap-date">${dueDate}</td>
            <td data-label="Certificate Path">${certificatePathHtml}</td>
            <td data-label="Action">${actionHtml}</td>
        </tr>
    `;
}

function normalizeReason(reason) {
    return String(reason || "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return escapeHtml(value);
    
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    
    return `${dd}-${mm}-${yy}`;
}

function getRequestStatusBadge(status) {
    const normalizedStatus = String(status || "").toUpperCase();

    if (normalizedStatus === "APPROVED") {
        return `
            <div class="status-stacked approved">
                <span class="status-title">Approved</span>
                <span class="status-desc">Eligible for certificate upload</span>
            </div>
        `;
    }

    if (normalizedStatus === "REJECTED") {
        return `
            <div class="status-stacked rejected">
                <span class="status-title">Rejected</span>
                <span class="status-desc">This request was rejected</span>
            </div>
        `;
    }

    return `
        <div class="status-stacked pending">
            <span class="status-title">Pending</span>
            <span class="status-desc">Waiting for HOD action</span>
        </div>
    `;
}

function getStudentCertificateStatusHtml(status, rejectionRemark) {
    if (status === "VERIFIED") {
        return `
            <div class="status-stacked verified">
                <span class="status-title">Verified</span>
                <span class="status-desc">Approved by HOD</span>
            </div>
        `;
    }

    if (status === "REJECTED") {
        return `
            <div class="status-stacked rejected">
                <span class="status-title">Rejected</span>
                <span class="status-desc">
                    ${rejectionRemark ? `Remark: ${escapeHtml(rejectionRemark)}` : "Please upload again"}
                </span>
            </div>
        `;
    }

    return `
        <div class="status-stacked pending">
            <span class="status-title">Submitted</span>
            <span class="status-desc">Uploaded and waiting for HOD review</span>
        </div>
    `;
}

function setActionType(requestId, actionType) {
    fileActionMap[requestId] = actionType;
}

function openFilePicker(requestId, actionType) {
    const fileInput = document.getElementById(`file-${requestId}`);
    if (!fileInput) return;

    fileActionMap[requestId] = actionType;
    fileInput.value = "";
    fileInput.click();
}

function handleFileSelected(requestId) {
    const fileInput = document.getElementById(`file-${requestId}`);
    const fileNameBox = document.getElementById(`file-name-${requestId}`);
    const displayBox = document.getElementById(`display-${requestId}`);

    if (!fileInput || fileInput.files.length === 0) {
        if (fileNameBox) fileNameBox.innerHTML = "";
        if (displayBox) displayBox.textContent = "Choose file...";
        return;
    }

    const file = fileInput.files[0];

    if (fileNameBox) {
        fileNameBox.innerHTML = `Selected: ${escapeHtml(file.name)}`;
    }

    if (displayBox) {
        displayBox.textContent = file.name;
    }

    uploadCertificate(requestId);
}

function uploadCertificate(requestId) {
    const fileInput = document.getElementById(`file-${requestId}`);

    if (!fileInput || fileInput.files.length === 0) {
        showInfoModal("Missing File", "Please select a certificate file before uploading.");
        return;
    }

    const file = fileInput.files[0];
    const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
    const fileName = file.name.toLowerCase();
    const extension = fileName.includes(".") ? fileName.split(".").pop() : "";

    if (!allowedExtensions.includes(extension)) {
        fileInput.value = "";
        clearSelectedFileName(requestId);
        showErrorModal("Only JPG, JPEG, PNG, and PDF files are allowed.");
        return;
    }

    if (file.size > 1024 * 1024) {
        fileInput.value = "";
        clearSelectedFileName(requestId);
        showErrorModal("File size is more than 1 MB, so upload rejected.");
        return;
    }

    const actionType = fileActionMap[requestId] || "UPLOAD";
    const formData = new FormData();
    formData.append("requestId", requestId);
    formData.append("file", file);

    fetch("/certificate/upload", {
        method: "POST",
        body: formData
    })
        .then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to upload certificate");
            }
            return res.json();
        })
        .then(() => {
            let successMessage = "Certificate uploaded successfully!";

            if (actionType === "UPDATE") {
                successMessage = "Certificate updated successfully!";
            } else if (actionType === "REPLACE") {
                successMessage = "Certificate replaced successfully!";
            }

            delete fileActionMap[requestId];
            showSuccessModal(successMessage);
            loadCertificateRequests();
        })
        .catch(err => {
            console.error(err);
            showErrorModal(err.message || "Error while uploading certificate.");
        });
}

function deleteCertificate(requestId) {
    deleteRequestId = requestId;
    openModal("deleteConfirmModal");
}

function performDeleteCertificate(requestId) {
    fetch(`/certificate/request/${requestId}`, {
        method: "DELETE"
    })
        .then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to delete certificate");
            }
            return res.text();
        })
        .then(() => {
            delete fileActionMap[requestId];
            deleteRequestId = null;
            closeModal("deleteConfirmModal");
            showSuccessModal("Certificate deleted successfully!");
            loadCertificateRequests();
        })
        .catch(err => {
            console.error(err);
            deleteRequestId = null;
            closeModal("deleteConfirmModal");
            showErrorModal(err.message || "Error while deleting certificate.");
        });
}

function clearSelectedFileName(requestId) {
    const fileNameBox = document.getElementById(`file-name-${requestId}`);
    const displayBox = document.getElementById(`display-${requestId}`);

    if (fileNameBox) {
        fileNameBox.innerHTML = "";
    }

    if (displayBox) {
        displayBox.textContent = "Choose file...";
    }
}

function showInfoModal(title, message) {
    document.getElementById("infoModalTitle").textContent = title;
    document.getElementById("infoModalMessage").textContent = message;
    openModal("infoModal");
}

function showSuccessModal(message) {
    document.getElementById("successModalMessage").textContent = message;
    openModal("successModal");
}

function showErrorModal(message) {
    document.getElementById("errorModalMessage").textContent = message;
    openModal("errorModal");
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.style.display = "flex";
    setTimeout(() => {
        modal.classList.add("active");
    }, 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("active");
    setTimeout(() => {
        modal.style.display = "none";
    }, 250);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}
