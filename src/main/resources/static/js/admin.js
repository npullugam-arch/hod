document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!user || user.role !== "ADMIN") {
        alert("Please login as Admin");
        window.location.href = "index.html";
        return;
    }

    const adminName = document.getElementById("adminName");
    const adminRole = document.getElementById("adminRole");
    const adminInitial = document.getElementById("adminInitial");
    const logoutBtn = document.getElementById("logoutBtn");

    const menuButtons = document.querySelectorAll(".menu-btn");
    const sections = document.querySelectorAll(".content-card");

    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const adminFrame = document.getElementById("adminFrame");

    const hodId = document.getElementById("hodId");
    const excelHodId = document.getElementById("excelHodId");

    const manualStudentForm = document.getElementById("manualStudentForm");
    const manualStatus = document.getElementById("manualStatus");

    const uploadBtn = document.getElementById("uploadBtn");
    const excelFile = document.getElementById("excelFile");
    const excelStatus = document.getElementById("excelStatus");
    const uploadSummary = document.getElementById("uploadSummary");

    const hodUploadBtn = document.getElementById("hodUploadBtn");
    const hodExcelFile = document.getElementById("hodExcelFile");
    const hodExcelStatus = document.getElementById("hodExcelStatus");
    const hodUploadSummary = document.getElementById("hodUploadSummary");
    const promotionForm = document.getElementById("promotionForm");
    const currentSemester = document.getElementById("currentSemester");
    const newSemester = document.getElementById("newSemester");
    const promotionStatus = document.getElementById("promotionStatus");
    const adminPasswordForm = document.getElementById("adminPasswordForm");
    const adminPasswordStatus = document.getElementById("adminPasswordStatus");
    const adminCurrentPassword = document.getElementById("adminCurrentPassword");
    const adminSecretCode = document.getElementById("adminSecretCode");
    const adminNewPassword = document.getElementById("adminNewPassword");
    const adminConfirmPassword = document.getElementById("adminConfirmPassword");

    adminName.textContent = user.username || "Admin";
    adminRole.textContent = user.role || "ADMIN";
    adminInitial.textContent = (user.username || "A").charAt(0).toUpperCase();

    function setStatus(element, message, type) {
        if (!element) return;
        element.textContent = message;
        element.className = "status-box show " + type;
    }

    function clearStatus(element) {
        if (!element) return;
        element.textContent = "";
        element.className = "status-box";
    }

    function hideAllSections() {
        sections.forEach((section) => {
            section.classList.remove("active");
        });
    }

    function setActiveMenu(targetSection) {
        menuButtons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.section === targetSection);
        });
    }

    function showSection(sectionId, title, subtitle) {
        hideAllSections();

        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add("active");
        }

        if (pageTitle) pageTitle.textContent = title;
        if (pageSubtitle) pageSubtitle.textContent = subtitle;

        setActiveMenu(sectionId);

        if (adminFrame && sectionId !== "iframeSection") {
            adminFrame.removeAttribute("src");
        }
    }

    function openIframePage(pageUrl, menuKey, title, subtitle) {
        hideAllSections();

        const iframeSection = document.getElementById("iframeSection");
        if (iframeSection) {
            iframeSection.classList.add("active");
        }

        if (adminFrame) {
            const resolvedPageUrl = new URL(pageUrl, window.location.href);
            adminFrame.src = resolvedPageUrl.pathname + "?t=" + new Date().getTime();
        }

        if (pageTitle) pageTitle.textContent = title;
        if (pageSubtitle) pageSubtitle.textContent = subtitle;

        setActiveMenu(menuKey);
    }

    window.showAdminSection = function (sectionId) {
        if (sectionId === "dashboardSection") {
            showSection(
                "dashboardSection",
                "Admin Dashboard",
                "Manage students, HODs, Excel uploads, section assignments, and records."
            );
        } else if (sectionId === "manualSection") {
            showSection(
                "manualSection",
                "Manual Student Create",
                "Create a student account manually with complete details."
            );
        } else if (sectionId === "excelSection") {
            showSection(
                "excelSection",
                "Student Excel Upload",
                "Upload student Excel sheets for bulk student creation."
            );
        } else if (sectionId === "hodExcelSection") {
            showSection(
                "hodExcelSection",
                "HOD Excel Upload",
                "Upload HOD Excel sheets for bulk HOD creation."
            );
        } else if (sectionId === "promotionSection") {
            showSection(
                "promotionSection",
                "Semester Promotion",
                "Promote all students from one semester to the next with a single academic action."
            );
        } else if (sectionId === "updatePasswordSection") {
            showSection(
                "updatePasswordSection",
                "Update Password",
                "Change the logged-in admin password with current password and secret code verification."
            );
        }
    };

    window.openStudentsPage = function () {
        openIframePage(
            "admin-student.html",
            "studentsPage",
            "Students",
            "Search students, update details, and update student passwords."
        );
    };

    window.openHodPage = function () {
        openIframePage(
            "admin-HOD.html",
            "hodPage",
            "HOD Dashboard",
            "Manage HOD details, HOD records, and HOD accounts."
        );
    };

    window.openHodAssignmentPage = function () {
        openIframePage(
            "admin-hod-assignment.html",
            "hodAssignmentPage",
            "HOD Section Management",
            "Assign department, semester, and section access to each HOD."
        );
    };

    menuButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const sectionKey = btn.dataset.section;

            if (sectionKey === "dashboardSection") {
                window.showAdminSection("dashboardSection");
            } else if (sectionKey === "manualSection") {
                window.showAdminSection("manualSection");
            } else if (sectionKey === "excelSection") {
                window.showAdminSection("excelSection");
            } else if (sectionKey === "hodExcelSection") {
                window.showAdminSection("hodExcelSection");
            } else if (sectionKey === "promotionSection") {
                window.showAdminSection("promotionSection");
            } else if (sectionKey === "updatePasswordSection") {
                window.showAdminSection("updatePasswordSection");
            } else if (sectionKey === "studentsPage") {
                window.openStudentsPage();
            } else if (sectionKey === "hodPage") {
                window.openHodPage();
            } else if (sectionKey === "hodAssignmentPage") {
                window.openHodAssignmentPage();
            }
        });
    });

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "index.html";
    });

    async function loadHods() {
        try {
            const response = await fetch("/admin/hods");

            if (!response.ok) {
                throw new Error("Failed to load HODs");
            }

            const hods = await response.json();

            if (hodId) {
                hodId.innerHTML = `<option value="">Select HOD</option>`;
            }

            if (excelHodId) {
                excelHodId.innerHTML = `<option value="">Select HOD</option>`;
            }

            hods.forEach((hod) => {
                const name = hod.name || (hod.user && hod.user.username) || `HOD ${hod.id}`;
                const empId = hod.employeeId ? ` - ${hod.employeeId}` : "";

                if (hodId) {
                    const option1 = document.createElement("option");
                    option1.value = hod.id;
                    option1.textContent = `${name}${empId}`;
                    hodId.appendChild(option1);
                }

                if (excelHodId) {
                    const option2 = document.createElement("option");
                    option2.value = hod.id;
                    option2.textContent = `${name}${empId}`;
                    excelHodId.appendChild(option2);
                }
            });
        } catch (error) {
            setStatus(manualStatus, error.message, "error");
        }
    }

    manualStudentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearStatus(manualStatus);

        const payload = {
            name: document.getElementById("name").value.trim(),
            rollNo: document.getElementById("rollNo").value.trim(),
            email: document.getElementById("email").value.trim(),
            section: document.getElementById("section").value.trim(),
            username: document.getElementById("username").value.trim(),
            password: document.getElementById("password").value.trim(),
            fatherName: document.getElementById("fatherName").value.trim(),
            gender: document.getElementById("gender").value.trim(),
            branch: document.getElementById("branch").value.trim(),
            deptId: document.getElementById("deptId").value ? Number(document.getElementById("deptId").value) : null,
            sem: document.getElementById("sem").value ? Number(document.getElementById("sem").value) : null,
            sec: document.getElementById("sec").value.trim(),
            sectionId: document.getElementById("sectionId").value ? Number(document.getElementById("sectionId").value) : null,
            admissionType: document.getElementById("admissionType").value.trim(),
            caste: document.getElementById("caste").value.trim(),
            hodId: hodId.value ? Number(hodId.value) : null
        };

        try {
            const response = await fetch("/admin/student/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err || "Failed to create student");
            }

            const data = await response.json();
            setStatus(manualStatus, `Student created successfully. Student ID: ${data.id}`, "success");
            manualStudentForm.reset();
        } catch (error) {
            setStatus(manualStatus, error.message, "error");
        }
    });

    uploadBtn.addEventListener("click", async () => {
        clearStatus(excelStatus);
        uploadSummary.className = "summary-box";
        uploadSummary.innerHTML = "";

        if (!excelHodId.value) {
            setStatus(excelStatus, "Please select HOD", "error");
            return;
        }

        if (!excelFile.files.length) {
            setStatus(excelStatus, "Please choose student Excel file", "error");
            return;
        }

        const formData = new FormData();
        formData.append("file", excelFile.files[0]);
        formData.append("hodId", excelHodId.value);

        try {
            setStatus(excelStatus, "Uploading student Excel...", "info");

            const response = await fetch("/admin/student/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err || "Student Excel upload failed");
            }

            const result = await response.json();

            setStatus(excelStatus, "Student Excel processed successfully", "success");
            renderUploadSummary(uploadSummary, result);

            excelFile.value = "";
        } catch (error) {
            setStatus(excelStatus, error.message, "error");
        }
    });

    hodUploadBtn.addEventListener("click", async () => {
        clearStatus(hodExcelStatus);
        hodUploadSummary.className = "summary-box";
        hodUploadSummary.innerHTML = "";

        if (!hodExcelFile.files.length) {
            setStatus(hodExcelStatus, "Please choose HOD Excel file", "error");
            return;
        }

        const selectedFile = hodExcelFile.files[0];
        const fileName = selectedFile.name.toLowerCase();

        if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
            setStatus(hodExcelStatus, "Only .xlsx or .xls files are allowed", "error");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            setStatus(hodExcelStatus, "Uploading HOD Excel...", "info");

            const response = await fetch("/admin/hod/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err || "HOD Excel upload failed");
            }

            const result = await response.json();

            setStatus(hodExcelStatus, "HOD Excel processed successfully", "success");
            renderUploadSummary(hodUploadSummary, result);

            hodExcelFile.value = "";
            loadHods();
        } catch (error) {
            setStatus(hodExcelStatus, error.message, "error");
        }
    });

    if (promotionForm) {
        promotionForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            clearStatus(promotionStatus);

            const currentValue = Number(currentSemester?.value || 0);
            const nextValue = Number(newSemester?.value || 0);

            if (!currentValue || !nextValue) {
                setStatus(promotionStatus, "Please select both Current Semester and Promote To Semester.", "error");
                return;
            }

            const confirmed = window.confirm(
                `Are you sure you want to promote all students from Semester ${currentValue} to Semester ${nextValue}?`
            );

            if (!confirmed) {
                return;
            }

            try {
                setStatus(promotionStatus, "Running semester promotion...", "info");

                const response = await fetch("/admin/promote-semester", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        currentSemester: currentValue,
                        newSemester: nextValue
                    })
                });

                const responseText = await response.text();
                let result = null;

                try {
                    result = responseText ? JSON.parse(responseText) : null;
                } catch (parseError) {
                    result = null;
                }

                if (!response.ok) {
                    throw new Error(result?.message || responseText || "Semester promotion failed.");
                }

                clearAppDashboardCaches();
                setStatus(
                    promotionStatus,
                    result?.message || `Semester promotion completed successfully. ${result?.updatedStudents || 0} students were updated.`,
                    "success"
                );
                promotionForm.reset();
            } catch (error) {
                setStatus(promotionStatus, error.message || "Semester promotion failed.", "error");
            }
        });
    }

    if (adminPasswordForm) {
        adminPasswordForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            clearStatus(adminPasswordStatus);

            const currentPasswordValue = adminCurrentPassword?.value.trim() || "";
            const secretCodeValue = adminSecretCode?.value.trim() || "";
            const newPasswordValue = adminNewPassword?.value.trim() || "";
            const confirmPasswordValue = adminConfirmPassword?.value.trim() || "";

            if (!currentPasswordValue) {
                setStatus(adminPasswordStatus, "Please enter your current password.", "error");
                return;
            }

            if (!secretCodeValue) {
                setStatus(adminPasswordStatus, "Please enter the secret code.", "error");
                return;
            }

            if (!newPasswordValue) {
                setStatus(adminPasswordStatus, "New password should not be empty.", "error");
                return;
            }

            if (!confirmPasswordValue) {
                setStatus(adminPasswordStatus, "Please confirm your new password.", "error");
                return;
            }

            if (newPasswordValue !== confirmPasswordValue) {
                setStatus(adminPasswordStatus, "New password and confirm password do not match.", "error");
                return;
            }

            try {
                setStatus(adminPasswordStatus, "Updating admin password...", "info");

                const response = await fetch("/admin/update-password", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        adminUserId: user.id,
                        currentPassword: currentPasswordValue,
                        secretCode: secretCodeValue,
                        newPassword: newPasswordValue,
                        confirmPassword: confirmPasswordValue
                    })
                });

                const message = await response.text();

                if (!response.ok) {
                    throw new Error(message || "Failed to update admin password.");
                }

                setStatus(adminPasswordStatus, message || "Admin password updated successfully.", "success");
                adminPasswordForm.reset();
            } catch (error) {
                setStatus(adminPasswordStatus, error.message || "Server/API error while updating password.", "error");
            }
        });
    }

    function renderUploadSummary(container, result) {
        let html = `
            <p><strong>Total Rows:</strong> ${result.totalRows ?? 0}</p>
            <p><strong>Success Count:</strong> ${result.successCount ?? 0}</p>
            <p><strong>Failed Count:</strong> ${result.failedCount ?? 0}</p>
        `;

        if (result.errors && result.errors.length) {
            html += `<p><strong>Errors:</strong></p><ul>`;
            result.errors.forEach((err) => {
                html += `<li>${escapeHtml(err)}</li>`;
            });
            html += `</ul>`;
        }

        container.innerHTML = html;
        container.className = "summary-box show";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function clearAppDashboardCaches() {
        try {
            const prefixes = [
                "sanchara_dashboard_cache_",
                "sanchara_profile_cache_"
            ];

            for (let index = localStorage.length - 1; index >= 0; index -= 1) {
                const key = localStorage.key(index);
                if (key && prefixes.some(prefix => key.startsWith(prefix))) {
                    localStorage.removeItem(key);
                }
            }
        } catch (error) {
            console.warn("Dashboard cache clear failed after semester promotion:", error);
        }
    }

    window.showAdminSection("dashboardSection");
    loadHods();
});
