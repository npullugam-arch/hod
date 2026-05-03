const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.top.location.href = "index.html";
}

const STUDENT_PHOTO_BASE_URL = "https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS";

let allRequests = [];

window.onload = function () {
    loadAllRequests();

    document.getElementById("searchInput").addEventListener("input", renderAllRequests);
    document.getElementById("statusFilter").addEventListener("change", renderAllRequests);
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
            status.textContent = `Total requests: ${allRequests.length}`;
            renderAllRequests();
        })
        .catch(err => {
            console.error(err);
            status.textContent = "";
            table.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-row">
                        Unable to load all requests. Please add backend API: GET /request/all
                    </td>
                </tr>
            `;
        });
}

function renderAllRequests() {
    const table = document.getElementById("allRequestsTable");
    const searchText = document.getElementById("searchInput").value.trim().toLowerCase();
    const selectedStatus = document.getElementById("statusFilter").value;

    table.innerHTML = "";

    let filtered = allRequests.filter(req => {
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

    if (filtered.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="10" class="empty-row">No requests found.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach(req => {
        const student = req.student || {};

        const studentName = getStudentName(req);
        const studentId = getStudentIdentifier(req);
        const studentPhoto = getStudentPhoto(req);
        const studentInitial = getStudentInitial(req);
        const description = req.description || "No description provided.";
        const remark = req.rejectionRemark || "No remark provided.";

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

        const row = `
            <tr>
                <td>
                    <div
                        class="student-cell clickable-student"
                        onclick='openStudentDetailsModal(${JSON.stringify(studentData).replace(/'/g, "&apos;")})'
                        title="View Student Details"
                    >
                        <div class="student-photo-wrap">
                            ${studentPhotoHtml}
                        </div>
                        <div class="student-meta">
                            <div class="student-name">${escapeHtml(studentName)}</div>
                            <div class="student-roll">${escapeHtml(studentId)}</div>
                        </div>
                    </div>
                </td>

                <td>${escapeHtml(req.reason || "-")}</td>

                <td>
                    <button
                        class="description-btn"
                        onclick="openDescriptionModal('${escapeJsString(studentName)}', '${escapeJsString(studentId)}', '${escapeJsString(description)}')"
                    >
                        View
                    </button>
                </td>

                <td>${getStatusBadge(req.status)}</td>

                <td>${formatDate(req.startDate)}</td>
                <td>${formatDate(req.endDate)}</td>
                <td>${formatDate(req.requestDate)}</td>
                <td>${formatDate(req.approvalDate)}</td>
                <td>${formatDate(req.certificateDueDate)}</td>

                <td>
                    <button
                        class="remark-btn"
                        onclick="openRemarkModal('${escapeJsString(remark)}')"
                    >
                        View
                    </button>
                </td>
            </tr>
        `;

        table.innerHTML += row;
    });
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
    const finalStatus = status || "PENDING";

    if (finalStatus === "APPROVED") {
        return `<span class="status-badge status-approved">APPROVED</span>`;
    }

    if (finalStatus === "REJECTED") {
        return `<span class="status-badge status-rejected">REJECTED</span>`;
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

function openDescriptionModal(studentName, studentId, description) {
    document.getElementById("modalStudentName").textContent = studentName || "N/A";
    document.getElementById("modalStudentRollNo").textContent = studentId || "N/A";
    document.getElementById("modalDescriptionText").textContent = description || "No description provided.";
    document.getElementById("descriptionModal").classList.remove("hidden");
}

function closeDescriptionModal() {
    document.getElementById("descriptionModal").classList.add("hidden");
}

function openRemarkModal(remark) {
    document.getElementById("modalRemarkText").textContent = remark || "No remark provided.";
    document.getElementById("remarkModal").classList.remove("hidden");
}

function closeRemarkModal() {
    document.getElementById("remarkModal").classList.add("hidden");
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
    const remarkModal = document.getElementById("remarkModal");
    const studentDetailsModal = document.getElementById("studentDetailsModal");

    if (event.target === descriptionModal) closeDescriptionModal();
    if (event.target === remarkModal) closeRemarkModal();
    if (event.target === studentDetailsModal) closeStudentDetailsModal();
});

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeDescriptionModal();
        closeRemarkModal();
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

function escapeJsString(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "")
        .replace(/\n/g, "\\n");
}