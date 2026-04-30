const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.top.location.href = "index.html";
}

const hodSelect = document.getElementById("hodSelect");
const hodSelectBtn = document.getElementById("hodSelectBtn");
const hodOptions = document.getElementById("hodOptions");

const reasonSelect = document.getElementById("reason");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const descriptionInput = document.getElementById("description");
const submitBtn = document.getElementById("submitBtn");
const successModal = document.getElementById("successModal");
const closeModalBtn = document.getElementById("closeModalBtn");

window.addEventListener("DOMContentLoaded", () => {
    loadHods();
    attachValidationListeners();
    submitBtn.addEventListener("click", createRequest);
    closeModalBtn.addEventListener("click", closeSuccessModal);

    hodSelectBtn.addEventListener("click", () => {
        hodOptions.classList.toggle("show");
    });

    document.addEventListener("click", function (event) {
        if (!event.target.closest("#hodCustomSelect")) {
            hodOptions.classList.remove("show");
        }
    });
});

function loadHods() {
    fetch("/request/hods")
        .then((res) => {
            if (!res.ok) {
                throw new Error("Failed to load HOD list");
            }
            return res.json();
        })
        .then((data) => {
            hodOptions.innerHTML = "";
            hodSelect.value = "";
            hodSelectBtn.innerHTML = `
                <span class="hod-placeholder">-- Select HOD --</span>
                <i class="fa-solid fa-chevron-down"></i>
            `;

            if (!Array.isArray(data) || data.length === 0) {
                hodSelectBtn.innerHTML = `
                    <span class="hod-placeholder">No HODs available</span>
                    <i class="fa-solid fa-chevron-down"></i>
                `;
                return;
            }

            data.forEach((hod) => {
                const hodId = hod.id;
                const employeeId = hod.employeeId || hod.employee_id || hod.username || "HOD";
                const hodName = hod.name || hod.fullName || hod.hodName || hod.username || "HOD";
                const department = hod.department || hod.dept || "Head of Department";
                const photo = hod.photo || `https://www.iare.ac.in/sites/default/files/${employeeId}_0.png`;

                const option = document.createElement("button");
                option.type = "button";
                option.className = "hod-option";
                option.innerHTML = `
                    <img src="${photo}" 
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(hodName)}&background=2563eb&color=fff'"
                         alt="HOD" />
                    <div class="hod-option-info">
                        <strong>${escapeHtml(hodName)}</strong>
                        <span>${escapeHtml(employeeId)} • ${escapeHtml(department)}</span>
                    </div>
                `;

                option.addEventListener("click", () => {
                    hodSelect.value = hodId;

                    hodSelectBtn.innerHTML = `
                        <span class="selected-hod">
                            <img src="${photo}" 
                                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(hodName)}&background=2563eb&color=fff'"
                                 alt="HOD" />
                            <span>
                                <strong>${escapeHtml(hodName)}</strong>
                                <small>${escapeHtml(employeeId)}</small>
                            </span>
                        </span>
                        <i class="fa-solid fa-chevron-down"></i>
                    `;

                    hodOptions.classList.remove("show");
                    removeWarning(hodSelect);
                });

                hodOptions.appendChild(option);
            });
        })
        .catch((err) => {
            console.error(err);
            hodOptions.innerHTML = "";
            hodSelectBtn.innerHTML = `
                <span class="hod-placeholder">Unable to load HODs</span>
                <i class="fa-solid fa-chevron-down"></i>
            `;
        });
}

function createRequest() {
    const hodId = hodSelect.value;
    const reason = reasonSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const description = descriptionInput.value.trim();

    const inputsToCheck = [
        hodSelect,
        reasonSelect,
        startDateInput,
        endDateInput,
        descriptionInput
    ];

    clearAllWarnings();

    let isValid = true;
    let firstInvalidInput = null;

    inputsToCheck.forEach((input) => {
        const value = typeof input.value === "string" ? input.value.trim() : input.value;
        if (!value) {
            showWarning(input);
            isValid = false;
            if (!firstInvalidInput) {
                firstInvalidInput = input;
            }
        }
    });

    if (!isValid) {
        if (firstInvalidInput) {
            firstInvalidInput.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
            firstInvalidInput.focus();
        }
        return;
    }

    if (startDate > endDate) {
        showWarning(startDateInput);
        showWarning(endDateInput);
        alert("Start date cannot be greater than end date.");
        endDateInput.focus();
        return;
    }

    const requestData = {
        reason: reason,
        description: description,
        startDate: startDate,
        endDate: endDate,
        student: { id: user.id },
        hod: { id: Number(hodId) }
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = `Submitting... <i class="fa-solid fa-spinner fa-spin"></i>`;

    fetch("/request/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
    })
        .then((res) => {
            if (!res.ok) {
                return res.text().then((message) => {
                    throw new Error(message || "Failed to create request");
                });
            }
            return res.json();
        })
        .then(() => {
            openSuccessModal();
            clearForm();
        })
        .catch((err) => {
            console.error(err);
            alert(err.message || "Error while submitting request.");
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Submit Request <i class="fa-solid fa-paper-plane"></i>`;
        });
}

function clearForm() {
    hodSelect.value = "";
    reasonSelect.value = "";
    startDateInput.value = "";
    endDateInput.value = "";
    descriptionInput.value = "";

    hodSelectBtn.innerHTML = `
        <span class="hod-placeholder">-- Select HOD --</span>
        <i class="fa-solid fa-chevron-down"></i>
    `;

    clearAllWarnings();
}

function openSuccessModal() {
    successModal.classList.add("active");
}

function closeSuccessModal() {
    successModal.classList.remove("active");
}

function attachValidationListeners() {
    const allInputs = document.querySelectorAll("input, select, textarea");

    allInputs.forEach((input) => {
        input.addEventListener("input", () => removeWarning(input));
        input.addEventListener("change", () => removeWarning(input));
        input.addEventListener("click", () => removeWarning(input));
    });
}

function showWarning(inputElement) {
    const wrapper = inputElement.closest(".input-group");
    if (!wrapper) return;

    if (!wrapper.querySelector(".warning-lottie-container")) {
        const warningDiv = document.createElement("div");
        warningDiv.className = "warning-lottie-container";
        warningDiv.innerHTML = `
            <dotlottie-wc
                src="https://lottie.host/fad9e472-ac97-44a6-977c-2fa673fdf405/O04RSXfJ4e.lottie"
                style="width: 50px; height: 50px"
                autoplay
                loop
            ></dotlottie-wc>
        `;
        wrapper.appendChild(warningDiv);
    }

    inputElement.classList.add("error-glow");
}

function removeWarning(inputElement) {
    const wrapper = inputElement.closest(".input-group");
    if (!wrapper) return;

    const warning = wrapper.querySelector(".warning-lottie-container");
    if (warning) {
        warning.remove();
    }

    inputElement.classList.remove("error-glow");
}

function clearAllWarnings() {
    const allInputs = document.querySelectorAll("input, select, textarea");
    allInputs.forEach((input) => removeWarning(input));
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}