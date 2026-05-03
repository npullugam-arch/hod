const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");

let chartInstance = null;
let currentStudent = null;
let currentRequests = [];

document.addEventListener("DOMContentLoaded", () => {
    if (!studentId) {
        setStatus("Student ID not found");
        return;
    }

    setupDownloadModal();
    loadHistory();
});

async function loadHistory() {
    try {
        const studentResponse = await fetch(`/student/${studentId}`);

        if (!studentResponse.ok) {
            throw new Error("Failed to load student details");
        }

        currentStudent = await studentResponse.json();
        renderStudentProfile(currentStudent);

        const requestResponse = await fetch(`/request/student/${studentId}`);

        if (!requestResponse.ok) {
            throw new Error("Failed to load student request history");
        }

        const requests = await requestResponse.json();
        currentRequests = Array.isArray(requests) ? requests : [];

        renderStats(currentRequests);
        renderChart(currentRequests);
        renderRequests(currentRequests);
    } catch (error) {
        setStatus(error.message || "Something went wrong");
    }
}

function setupDownloadModal() {
    const modal = document.getElementById("downloadModal");
    const openBtn = document.getElementById("openDownloadModal");
    const closeBtn = document.getElementById("closeDownloadModal");
    const cancelBtn = document.getElementById("cancelDownloadBtn");
    const generateBtn = document.getElementById("generatePdfBtn");
    const rangeRadios = document.querySelectorAll("input[name='reportRange']");
    const customDateBox = document.getElementById("customDateBox");

    openBtn.addEventListener("click", () => {
        clearDownloadStatus();
        modal.classList.add("show");
    });

    closeBtn.addEventListener("click", () => modal.classList.remove("show"));
    cancelBtn.addEventListener("click", () => modal.classList.remove("show"));

    rangeRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            customDateBox.style.display = getSelectedRange() === "custom" ? "grid" : "none";
        });
    });

    generateBtn.addEventListener("click", generatePdfReport);
}

function renderStudentProfile(student) {
    const container = document.getElementById("studentProfile");

    const name = safeValue(student.name);
    const rollNo = safeValue(student.rollNo);
    const branch = safeValue(student.branch);
    const sem = safeValue(student.sem);
    const section = safeValue(student.section || student.sec);
    const phone = safeValue(student.studentPhoneNumber);
    const email = safeValue(student.email);
    const imageUrl = student.photoUrl || getStudentImageUrl(rollNo);
    const initial = name !== "-" ? name.charAt(0).toUpperCase() : "S";

    container.innerHTML = `
        <div class="profile-flex">
            <div class="student-avatar" id="avatarBox">${escapeHtml(initial)}</div>
            <img class="student-photo" id="studentPhoto" alt="${escapeHtml(name)}" style="display:none;" />

            <div class="profile-info">
                <h2>${escapeHtml(name)}</h2>
                <p>Roll No: ${escapeHtml(rollNo)}</p>
                <p>
                    Branch: ${escapeHtml(branch)}
                    <span class="separator">|</span>
                    Semester: ${escapeHtml(sem)}
                    <span class="separator">|</span>
                    Section: ${escapeHtml(section)}
                </p>
                <p>
                    Phone: ${escapeHtml(phone)}
                    <span class="separator">|</span>
                    Email: ${escapeHtml(email)}
                </p>
            </div>
        </div>
    `;

    const photo = document.getElementById("studentPhoto");
    const avatar = document.getElementById("avatarBox");

    if (imageUrl) {
        photo.onload = () => {
            photo.style.display = "block";
            avatar.style.display = "none";
        };

        photo.onerror = () => {
            photo.style.display = "none";
            avatar.style.display = "flex";
        };

        photo.src = imageUrl;
    }
}

function renderStats(requests) {
    const summary = buildSummary(requests);

    document.getElementById("stats").innerHTML = `
        ${statCard("Total Requests", summary.total, "")}
        ${statCard("Approved", summary.approved, "approved")}
        ${statCard("Rejected", summary.rejected, "rejected")}
        ${statCard("Pending", summary.pending, "pending")}
        ${statCard("Certificates", summary.certificateSubmitted, "cert")}
    `;
}

function statCard(label, value, extraClass) {
    return `
        <div class="stat-card ${extraClass}">
            <div class="label">${escapeHtml(label)}</div>
            <div class="value">${escapeHtml(value)}</div>
        </div>
    `;
}

function renderChart(requests) {
    const summary = buildSummary(requests);
    const ctx = document.getElementById("historyChart").getContext("2d");

    if (chartInstance) {
        chartInstance.destroy();
    }

    const gradient = (color1, color2) => {
        const g = ctx.createLinearGradient(0, 0, 0, 260);
        g.addColorStop(0, color1);
        g.addColorStop(1, color2);
        return g;
    };

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Approved", "Rejected", "Pending"],
            datasets: [{
                label: "Requests",
                data: [summary.approved, summary.rejected, summary.pending],
                backgroundColor: [
                    gradient("#34d399", "#059669"),
                    gradient("#f87171", "#dc2626"),
                    gradient("#fbbf24", "#d97706")
                ],
                borderRadius: 10,
                borderSkipped: false,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#111827",
                    padding: 12,
                    callbacks: {
                        label: context => ` Count: ${context.raw}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0,
                        color: "#6b7280"
                    },
                    grid: { color: "#f1f5f9" }
                },
                x: {
                    ticks: {
                        color: "#374151",
                        font: {
                            weight: "bold",
                            size: 13
                        }
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderRequests(requests) {
    const container = document.getElementById("requests");

    if (!requests.length) {
        container.innerHTML = `<div class="empty-state">No request history found.</div>`;
        return;
    }

    container.innerHTML = requests.map(r => {
        const status = safeValue(r.status).toLowerCase();
        const statusClass = ["approved", "rejected", "pending"].includes(status) ? status : "pending";
        const certificate = r.certificate;
        const certStatus = getCertificateStatus(r);

        const certLink = certificate?.filePath
            ? `<a class="btn-view" href="${escapeHtml(certificate.filePath)}" target="_blank">👁 View Certificate</a>`
            : "";

        const remark = safeValue(r.rejectionRemark || r.remark || r.rejectRemark || r.hodRemark || r.certificate?.rejectionRemark);

        return `
            <div class="req-card ${statusClass}">
                <div class="req-main">
                    <div class="req-header">
                        <div class="req-title-group">
                            <div class="req-title">${escapeHtml(safeValue(r.reason))}</div>
                            <div class="req-sub">${escapeHtml(safeValue(r.description))}</div>
                        </div>

                        <span class="badge ${statusClass}">
                            ${escapeHtml(safeValue(r.status))}
                        </span>
                    </div>

                    <div class="req-dates">
                        <div class="date-block">
                            <div class="lbl">Start</div>
                            <div class="val">${escapeHtml(formatDisplayDate(r.startDate))}</div>
                        </div>

                        <div class="date-divider"></div>

                        <div class="date-block">
                            <div class="lbl">End</div>
                            <div class="val">${escapeHtml(formatDisplayDate(r.endDate))}</div>
                        </div>

                        <div class="date-divider"></div>

                        <div class="date-block">
                            <div class="lbl">Days</div>
                            <div class="val">${escapeHtml(calculateDays(r.startDate, r.endDate))}</div>
                        </div>
                    </div>
                </div>

                <div class="req-footer">
                    <div class="cert-status">
                        Certificate Status:
                        <span>${escapeHtml(certStatus)}</span>
                    </div>

                    ${certLink}
                </div>

                ${remark !== "-" ? `
                    <div class="remark-box">
                        <span class="remark-label">HOD Remark:</span>
                        ${escapeHtml(remark)}
                    </div>
                ` : ""}
            </div>
        `;
    }).join("");
}

async function generatePdfReport() {
    clearDownloadStatus();

    if (!currentStudent) {
        setDownloadStatus("Student details not loaded yet", "error");
        return;
    }

    const rangeInfo = getReportRange();

    if (!rangeInfo.valid) {
        setDownloadStatus(rangeInfo.message, "error");
        return;
    }

    const filteredRequests = filterRequestsByDate(currentRequests, rangeInfo.fromDate, rangeInfo.toDate);
    const summary = buildSummary(filteredRequests);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    const studentName = safeValue(currentStudent.name);
    const rollNo = safeValue(currentStudent.rollNo);
    const branch = safeValue(currentStudent.branch);
    const sem = safeValue(currentStudent.sem);
    const section = safeValue(currentStudent.section || currentStudent.sec);
    const phone = safeValue(currentStudent.studentPhoneNumber);
    const email = safeValue(currentStudent.email);

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 34, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("SANCHÁRA - Student Permission History Report", margin, 14);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by Sanchara Permission Management Portal", margin, 23);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Student Details", margin, 46);

    await addStudentPhotoToPdf(doc, currentStudent, margin, 52);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const detailStartX = margin + 36;
    let y = 54;

    doc.text(`Name: ${studentName}`, detailStartX, y);
    y += 7;
    doc.text(`Roll No: ${rollNo}`, detailStartX, y);
    y += 7;
    doc.text(`Branch: ${branch} | Semester: ${sem} | Section: ${section}`, detailStartX, y);
    y += 7;
    doc.text(`Phone: ${phone}`, detailStartX, y);
    y += 7;
    doc.text(`Email: ${email}`, detailStartX, y);

    doc.setFont("helvetica", "bold");
    doc.text("Report Range:", margin, 90);
    doc.setFont("helvetica", "normal");
    doc.text(rangeInfo.label, margin + 28, 90);

    doc.setFont("helvetica", "bold");
    doc.text("Generated On:", margin, 97);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(new Date()), margin + 30, 97);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Overview", margin, 112);

    const boxY = 118;
    drawSummaryBox(doc, margin, boxY, "Total", summary.total);
    drawSummaryBox(doc, margin + 36, boxY, "Approved", summary.approved);
    drawSummaryBox(doc, margin + 72, boxY, "Rejected", summary.rejected);
    drawSummaryBox(doc, margin + 108, boxY, "Pending", summary.pending);
    drawSummaryBox(doc, margin + 144, boxY, "Certificates", summary.certificateSubmitted);

    const tableRows = filteredRequests.map((r, index) => [
        index + 1,
        safeValue(r.requestDate),
        safeValue(r.reason),
        safeValue(r.startDate),
        safeValue(r.endDate),
        calculateDays(r.startDate, r.endDate),
        safeValue(r.status),
        getCertificateStatus(r),
        safeValue(r.rejectionRemark || r.remark || r.rejectRemark || r.hodRemark || r.certificate?.rejectionRemark)
    ]);

    doc.autoTable({
        startY: 148,
        head: [[
            "#",
            "Request Date",
            "Reason",
            "Start",
            "End",
            "Days",
            "Status",
            "Certificate",
            "Remark"
        ]],
        body: tableRows.length ? tableRows : [[
            "-",
            "-",
            "No records found for selected range",
            "-",
            "-",
            "-",
            "-",
            "-",
            "-"
        ]],
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: "linebreak"
        },
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: [255, 255, 255],
            fontStyle: "bold"
        },
        alternateRowStyles: {
            fillColor: [245, 247, 251]
        },
        didDrawPage: function () {
            const pageHeight = doc.internal.pageSize.getHeight();

            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text("Generated by Sanchara Permission Management Portal", margin, pageHeight - 10);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin - 18, pageHeight - 10);
        }
    });

    let finalY = doc.lastAutoTable.finalY + 18;

    if (finalY > 260) {
        doc.addPage();
        finalY = 30;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("HOD Signature", margin, finalY);

    doc.line(margin, finalY + 18, margin + 55, finalY + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Verified by Department HOD", margin, finalY + 25);

    const cleanName = studentName.replace(/[^a-z0-9]/gi, "_");
    doc.save(`${cleanName}_${rollNo}_history_report.pdf`);

    document.getElementById("downloadModal").classList.remove("show");
}

function getSelectedRange() {
    const checked = document.querySelector("input[name='reportRange']:checked");
    return checked ? checked.value : "all";
}

function getReportRange() {
    const type = getSelectedRange();
    const today = new Date();

    if (type === "all") {
        return {
            valid: true,
            fromDate: null,
            toDate: null,
            label: "Entire History"
        };
    }

    if (type === "month") {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        return {
            valid: true,
            fromDate: toISODate(from),
            toDate: toISODate(to),
            label: `This Month (${formatDate(from)} to ${formatDate(to)})`
        };
    }

    if (type === "last3") {
        const from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        return {
            valid: true,
            fromDate: toISODate(from),
            toDate: toISODate(to),
            label: `Last 3 Months (${formatDate(from)} to ${formatDate(to)})`
        };
    }

    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;

    if (!fromDate || !toDate) {
        return {
            valid: false,
            message: "Please select both From Date and To Date"
        };
    }

    if (new Date(fromDate) > new Date(toDate)) {
        return {
            valid: false,
            message: "From Date cannot be after To Date"
        };
    }

    return {
        valid: true,
        fromDate,
        toDate,
        label: `Custom Range (${fromDate} to ${toDate})`
    };
}

function filterRequestsByDate(requests, fromDate, toDate) {
    if (!fromDate && !toDate) {
        return requests;
    }

    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return requests.filter(r => {
        const dateValue = r.requestDate || r.startDate || r.endDate;
        if (!dateValue) return false;

        const current = new Date(dateValue);

        if (from && current < from) return false;
        if (to && current > to) return false;

        return true;
    });
}

function buildSummary(requests) {
    const approved = countByStatus(requests, "APPROVED");
    const rejected = countByStatus(requests, "REJECTED");
    const pending = countByStatus(requests, "PENDING");
    const certificateSubmitted = requests.filter(r => r.certificate).length;
    const certificatePending = requests.filter(r => r.certificateDueDate && !r.certificate).length;

    return {
        total: requests.length,
        approved,
        rejected,
        pending,
        certificateSubmitted,
        certificatePending
    };
}

function drawSummaryBox(doc, x, y, label, value) {
    doc.setFillColor(245, 247, 251);
    doc.roundedRect(x, y, 31, 18, 3, 3, "F");

    doc.setTextColor(100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + 3, y + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), x + 3, y + 15);
}

async function addStudentPhotoToPdf(doc, student, x, y) {
    const rollNo = safeValue(student.rollNo);
    const imageUrl = student.photoUrl || getStudentImageUrl(rollNo);

    if (!imageUrl) {
        drawPhotoPlaceholder(doc, x, y);
        return;
    }

    try {
        const img = document.getElementById("studentPhoto");

        if (img && img.complete && img.naturalWidth > 0) {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            const base64 = canvas.toDataURL("image/jpeg", 0.9);
            doc.addImage(base64, "JPEG", x, y, 26, 26);
            return;
        }
    } catch (error) {
        console.error("Loaded page image PDF conversion failed:", error);
    }

    drawPhotoPlaceholder(doc, x, y);
}

function drawPhotoPlaceholder(doc, x, y) {
    doc.setFillColor(219, 234, 254);
    doc.circle(x + 13, y + 13, 13, "F");

    doc.setTextColor(37, 99, 235);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);

    const initial = currentStudent?.name ? currentStudent.name.charAt(0).toUpperCase() : "S";
    doc.text(initial, x + 9, y + 17);
}

function getCertificateStatus(request) {
    if (request.certificate?.status) return request.certificate.status;
    if (request.certificateDueDate) return "Pending";
    return "Not Required";
}

function countByStatus(requests, status) {
    return requests.filter(r => String(r.status || "").toUpperCase() === status).length;
}

function calculateDays(startDate, endDate) {
    if (!startDate || !endDate) return "-";

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";

    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : "-";
}

function getStudentImageUrl(rollNo) {
    if (!rollNo || rollNo === "-") return "";
    const cleanRollNo = String(rollNo).trim().toUpperCase();
    return `/student/photo/${cleanRollNo}`;
}

function safeValue(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return "-";
    }

    return String(value).trim();
}

function formatDisplayDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return safeValue(value);

    return date.toLocaleDateString("en-GB");
}

function formatDate(value) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function toISODate(date) {
    return date.toISOString().split("T")[0];
}

function setStatus(message) {
    const status = document.getElementById("pageStatus");
    status.textContent = message;
    status.className = "page-status show";
}

function setDownloadStatus(message, type) {
    const status = document.getElementById("downloadStatus");
    status.textContent = message;
    status.className = "modal-status show " + type;
}

function clearDownloadStatus() {
    const status = document.getElementById("downloadStatus");
    status.textContent = "";
    status.className = "modal-status";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function goBack() {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");

    if (from === "pending") {
        window.location.href = "pending-request.html";
    } else if (from === "students") {
        window.location.href = "hod-students.html";
    } else {
        window.location.href = "hod-students.html";
    }
}