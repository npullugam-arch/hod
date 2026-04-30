const adminUser = JSON.parse(localStorage.getItem("user") || "null");

if (!adminUser || adminUser.role !== "ADMIN") {
    alert("Please login as Admin");
    window.location.href = "index.html";
}

let hodsCache = [];

const FACULTY_PHOTO_BASE_URL = "https://www.iare.ac.in/sites/default/files/";

const hodFields = [
    { id: "detailUsername", key: "username", label: "Username", required: true },
    { id: "detailPhoto", key: "photo", label: "Photo URL" },
    { id: "detailEmployeeId", key: "employeeId", label: "Emp ID", required: true },
    { id: "detailName", key: "name", label: "Name", required: true },
    { id: "detailDepartment", key: "department", label: "Department" },
    { id: "detailDesignation", key: "designation", label: "Designation" },
    { id: "detailPhdAwarded", key: "phdAwarded", label: "Ph.D Awarded" },
    { id: "detailDateOfJoining", key: "dateOfJoining", label: "Date Of Joining" },
    { id: "detailPhoneNumber", key: "phoneNumber", label: "Phone Number" },
    { id: "detailEmailId", key: "emailId", label: "Email Id", type: "email" },
    { id: "detailReligion", key: "religion", label: "Religion" },
    { id: "detailCasteCategory", key: "casteCategory", label: "Caste Category" },
    { id: "detailBloodGroup", key: "bloodGroup", label: "Blood Group" },
    { id: "detailPresentFlatno", key: "presentFlatno", label: "Present Flat No" },
    { id: "detailPresentTown", key: "presentTown", label: "Present Town" },
    { id: "detailPresentDistrict", key: "presentDistrict", label: "Present District" },
    { id: "detailPresentState", key: "presentState", label: "Present State" },
    { id: "detailPresentPincode", key: "presentPincode", label: "Present Pincode" },
    { id: "detailPermanentFlatno", key: "permanentFlatno", label: "Permanent Flat No" },
    { id: "detailPermanentTown", key: "permanentTown", label: "Permanent Town" },
    { id: "detailPermanentDistrict", key: "permanentDistrict", label: "Permanent District" },
    { id: "detailPermanentState", key: "permanentState", label: "Permanent State" },
    { id: "detailPermanentPincode", key: "permanentPincode", label: "Permanent Pincode" },
    { id: "detailJntuUid", key: "jntuUid", label: "JNTU UID" },
    { id: "detailStatus", key: "status", label: "Status" }
];

document.addEventListener("DOMContentLoaded", () => {
    buildFormFields();

    document.getElementById("searchInput").addEventListener("input", applyFilters);

    document.getElementById("closeDetailsModal").addEventListener("click", () => hideModal("detailsModal"));
    document.getElementById("cancelDetailsBtn").addEventListener("click", () => hideModal("detailsModal"));
    document.getElementById("closePasswordModal").addEventListener("click", () => hideModal("passwordModal"));
    document.getElementById("cancelPasswordBtn").addEventListener("click", () => hideModal("passwordModal"));

    document.getElementById("detailsForm").addEventListener("submit", submitDetailsUpdate);
    document.getElementById("passwordForm").addEventListener("submit", submitPasswordUpdate);

    loadHods();
});

function buildFormFields() {
    const grid = document.getElementById("hodFieldsGrid");
    grid.innerHTML = "";

    hodFields.forEach(field => {
        grid.innerHTML += `
            <div class="form-field">
                <label>${field.label}</label>
                <input type="${field.type || "text"}" id="${field.id}" ${field.required ? "required" : ""} />
            </div>
        `;
    });
}

async function loadHods() {
    clearPageStatus();

    try {
        const response = await fetch("/admin/hods");

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Failed to load HODs");
        }

        const hods = await response.json();
        hodsCache = Array.isArray(hods) ? hods : [];
        applyFilters();
    } catch (error) {
        setPageStatus(error.message, "error");
        renderHods([]);
    }
}

function applyFilters() {
    const search = document.getElementById("searchInput").value.trim().toLowerCase();

    const filtered = hodsCache.filter(hod => {
        const searchable = [
            hod.employeeId,
            hod.name,
            hod.department,
            hod.designation,
            hod.phoneNumber,
            hod.emailId,
            hod.status,
            hod.user?.username
        ].join(" ").toLowerCase();

        return !search || searchable.includes(search);
    });

    renderHods(filtered);
}

function getHodPhotoUrl(hod) {
    const savedPhoto = (hod.photo || "").trim();

    if (savedPhoto) {
        return savedPhoto;
    }

    const employeeId = String(hod.employeeId || "").trim();

    if (!employeeId) {
        return "";
    }

    return `${FACULTY_PHOTO_BASE_URL}${encodeURIComponent(employeeId)}_0.png`;
}

function renderHods(hods) {
    const hodGrid = document.getElementById("hodGrid");
    const emptyState = document.getElementById("emptyState");

    hodGrid.innerHTML = "";

    if (!hods.length) {
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    hods.forEach(hod => {
        const card = document.createElement("div");
        card.className = "hod-card";

        const name = hod.name || "HOD";
        const empId = hod.employeeId || "-";
        const dept = hod.department || "-";
        const photo = getHodPhotoUrl(hod);
        const initial = name.charAt(0).toUpperCase();

        card.innerHTML = `
            <div class="hod-top">
                <div class="hod-avatar" id="avatar-${hod.id}">${escapeHtml(initial)}</div>
                <img class="hod-photo" id="photo-${hod.id}" alt="${escapeHtml(name)}" />
                <div>
                    <div class="hod-name">${escapeHtml(name)}</div>
                    <div class="hod-meta">Emp ID: ${escapeHtml(empId)}</div>
                    <div class="hod-meta">Department: ${escapeHtml(dept)}</div>
                    <div class="hod-meta">Phone: ${escapeHtml(hod.phoneNumber || "-")}</div>
                    <div class="hod-meta">Email: ${escapeHtml(hod.emailId || hod.user?.email || "-")}</div>
                </div>
            </div>

            <div class="hod-actions">
                <button type="button" class="card-btn details-btn" data-hod-id="${hod.id}">Update Details</button>
                <button type="button" class="card-btn password-btn" data-password-hod-id="${hod.id}">Update Password</button>
            </div>
        `;

        hodGrid.appendChild(card);

        const photoEl = card.querySelector(`#photo-${hod.id}`);
        const avatarEl = card.querySelector(`#avatar-${hod.id}`);

        if (photo) {
            photoEl.onload = () => {
                photoEl.style.display = "block";
                avatarEl.style.display = "none";
            };

            photoEl.onerror = () => {
                photoEl.style.display = "none";
                avatarEl.style.display = "flex";
            };

            photoEl.src = photo;
        } else {
            photoEl.style.display = "none";
            avatarEl.style.display = "flex";
        }

        card.querySelector("[data-hod-id]").addEventListener("click", () => openDetailsModal(hod.id));
        card.querySelector("[data-password-hod-id]").addEventListener("click", () => openPasswordModal(hod.id));
    });
}

function openDetailsModal(hodId) {
    clearModalStatus("detailsStatus");

    const hod = hodsCache.find(h => String(h.id) === String(hodId));

    if (!hod) {
        setPageStatus("HOD not found", "error");
        return;
    }

    setValue("detailHodId", hod.id);
    setValue("detailUsername", hod.user?.username || "");

    hodFields.forEach(field => {
        if (field.key === "username") return;

        if (field.key === "photo") {
            setValue(field.id, getHodPhotoUrl(hod));
        } else {
            setValue(field.id, hod[field.key] ?? "");
        }
    });

    showModal("detailsModal");
}

async function submitDetailsUpdate(e) {
    e.preventDefault();
    clearModalStatus("detailsStatus");

    const hodId = getValue("detailHodId");

    const payload = {};

    hodFields.forEach(field => {
        payload[field.key] = getValue(field.id);
    });

    try {
        const response = await fetch(`/admin/hod/${hodId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Failed to update HOD details");
        }

        setModalStatus("detailsStatus", "HOD details updated successfully", "success");
        setPageStatus("HOD details updated successfully", "success");

        await loadHods();

        setTimeout(() => hideModal("detailsModal"), 800);
    } catch (error) {
        setModalStatus("detailsStatus", error.message, "error");
    }
}

async function openPasswordModal(hodId) {
    clearModalStatus("passwordStatus");

    try {
        const response = await fetch(`/admin/hod/${hodId}/password`);

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Failed to load HOD password details");
        }

        const data = await response.json();

        setValue("passwordHodId", hodId);
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

    const hodId = getValue("passwordHodId");
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
        const response = await fetch(`/admin/hod/${hodId}/password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newPassword, confirmPassword })
        });

        const message = await response.text();

        if (!response.ok) {
            throw new Error(message || "Failed to update HOD password");
        }

        setModalStatus("passwordStatus", "HOD password updated successfully", "success");
        setPageStatus("HOD password updated successfully", "success");

        setTimeout(() => hideModal("passwordModal"), 800);
    } catch (error) {
        setModalStatus("passwordStatus", error.message, "error");
    }
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

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}