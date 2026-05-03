const user = JSON.parse(localStorage.getItem("user"));
let resolvedStudentId = null;

if (!user) {
    window.location.href = "index.html";
}

window.addEventListener("DOMContentLoaded", function () {
    loadRequests();
});

async function loadRequests() {
    try {
        const studentId = await getStudentIdForRequests();
        const res = await fetch(`/request/student/${studentId}`);

        if (!res.ok) throw new Error("Failed to load requests");

        const data = await res.json();
        const table = document.getElementById("requestTable");
        table.innerHTML = "";

        if (!Array.isArray(data) || data.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-row">No requests found.</td>
                </tr>
            `;
            return;
        }

        data.forEach((req) => {
            const hodName = req.hod?.username ? escapeHtml(req.hod.username) : "-";
            const endDate = formatDate(req.endDate);
            const dueDate = formatDate(req.certificateDueDate);
            const statusBadge = getRequestStatusHtml(req);
            const certificateStatus = getCertificateStatusHtml(req);
            const documentAction = getDocumentActionHtml(req);

            table.innerHTML += `
                <tr>
                    <td data-label="Event / Reason">${escapeHtml(req.reason || "-")}</td>
                    <td data-label="HOD">${hodName}</td>
                    <td data-label="Status">${statusBadge}</td>
                    <td data-label="End Date">${endDate}</td>
                    <td data-label="Certificate Due">${dueDate}</td>
                    <td data-label="Certificate">${certificateStatus}</td>
                    <td data-label="Document">${documentAction}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
        document.getElementById("requestTable").innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">Unable to load requests.</td>
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

async function downloadRequestPdf(requestId, event) {
    if (event) event.preventDefault();

    try {
        const studentId = await getStudentIdForRequests();
        const res = await fetch(`/request/student/${studentId}`);

        if (!res.ok) throw new Error("Failed to fetch request details");

        const requests = await res.json();
        const req = requests.find((item) => Number(item.id) === Number(requestId));

        if (!req) {
            alert("Request not found.");
            return;
        }

        if (String(req.status || "").toUpperCase() !== "APPROVED") {
            alert("PDF is available only after approval.");
            return;
        }

        if (isGatePassReason(req.reason)) {
            generateGatePassPdf(req);
        } else {
            generatePermissionLetterPdf(req);
        }
    } catch (err) {
        console.error(err);
        alert("Unable to generate PDF.");
    }
}

function isGatePassReason(reason) {
    const value = String(reason || "")
        .toLowerCase()
        .trim()
        .replace(/[_-]/g, " ")
        .replace(/\s+/g, " ");

    return value === "personal leave" || value === "bank purpose" || value === "bank purposes";
}

function getDocumentTypeText(req) {
    return isGatePassReason(req.reason) ? "Gate Pass" : "Permission Letter";
}

function getRequestStatusHtml(req) {
    const status = String(req.status || "").toUpperCase();

    if (status === "APPROVED") {
        return `
            <span class="status-badge badge-approved">
                <i class="fa-solid fa-check"></i> Approved
            </span>
        `;
    }

    if (status === "REJECTED") {
        const remark = req.rejectionRemark
            ? `<div class="request-remark">Remark: ${escapeHtml(req.rejectionRemark)}</div>`
            : "";

        return `
            <div class="request-status-wrap">
                <span class="status-badge badge-rejected">
                    <i class="fa-solid fa-xmark"></i> Rejected
                </span>
                ${remark}
            </div>
        `;
    }

    return `
        <span class="status-badge badge-pending">
            <i class="fa-solid fa-clock-rotate-left"></i> Pending
        </span>
    `;
}

function getCertificateStatusHtml(req) {
    if (!req.certificate) {
        return `<span class="not-uploaded-text">Not Uploaded</span>`;
    }

    const certStatus = String(req.certificate.status || "").toUpperCase();

    if (certStatus === "VERIFIED") {
        return `
            <span class="certificate-badge verified-badge">
                <i class="fa-solid fa-circle-check"></i> Verified
            </span>
        `;
    }

    if (certStatus === "REJECTED") {
        const remark = req.certificate.rejectionRemark
            ? `<div class="certificate-remark">Remark: ${escapeHtml(req.certificate.rejectionRemark)}</div>`
            : "";

        return `
            <div class="certificate-status-wrap">
                <span class="certificate-badge rejected-badge">
                    <i class="fa-solid fa-circle-xmark"></i> Rejected
                </span>
                ${remark}
            </div>
        `;
    }

    return `
        <span class="certificate-badge">
            <i class="fa-solid fa-cloud-arrow-up"></i> Uploaded
        </span>
    `;
}

function getDocumentActionHtml(req) {
    const status = String(req.status || "").toUpperCase();

    if (status !== "APPROVED") {
        return `<span class="not-uploaded-text">Available after approval</span>`;
    }

    const documentType = getDocumentTypeText(req);

    return `
        <div class="document-action-wrap">
            <span class="document-type-text">${documentType}</span>
            <button class="document-download-btn" onclick="downloadRequestPdf(${Number(req.id)}, event)">
                <i class="fa-solid fa-file-pdf"></i>
                Download
            </button>
        </div>
    `;
}


function generatePermissionLetterPdf(req) {
    const jspdfLib = window.jspdf;

    if (!jspdfLib || !jspdfLib.jsPDF) {
        alert("PDF library not loaded.");
        return;
    }

    const { jsPDF } = jspdfLib;
    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 18;
    const cardX = 15;
    const cardY = 15;
    const cardW = pageWidth - 30;
    const cardH = pageHeight - 30;

    const studentName = getStudentName(req);
    const rollNo = getStudentRollNo(req);
    const branch = getStudentBranch(req);
    const section = getStudentSection(req);
    const reason = req.reason || "Permission";
    const description = req.description || reason;
    const startDate = formatDateForPdf(req.startDate);
    const endDate = formatDateForPdf(req.endDate);
    const generatedDate = formatDateForPdf(new Date().toISOString());

    const logoUrl = "/images/iare-logo.png";
    let y = 22;

    doc.setFillColor(244, 246, 251);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "F");

    doc.setDrawColor(225, 230, 240);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "S");

    const logoImg = new Image();

    const addMixedText = (parts, x, yValue) => {
        let currentX = x;
        parts.forEach(part => {
            doc.setFont("helvetica", part.bold ? "bold" : "normal");
            doc.text(part.text, currentX, yValue);
            currentX += doc.getTextWidth(part.text);
        });
    };

    const finalizePdf = (includeLogo) => {
        if (includeLogo) {
            doc.addImage(logoImg, "PNG", 42, y, 126, 26);
            y += 36;
        } else {
            y += 8;
        }

        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.8);
        doc.line(margin + 5, y, pageWidth - margin - 5, y);

        y += 12;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.text("PERMISSION LETTER", pageWidth / 2, y, { align: "center" });

        y += 11;

        doc.setFontSize(10);
        doc.text(`Date: ${generatedDate}`, pageWidth - margin - 5, y, { align: "right" });

        y += 13;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        doc.text("To,", margin + 5, y);
        y += 6;

        doc.text("The Head of the Department,", margin + 5, y);
        y += 6;

        doc.text(branch !== "-" ? branch : "Department", margin + 5, y);
        y += 11;

        doc.text("Respected Sir/Madam,", margin + 5, y);
        y += 10;

        doc.setFillColor(241, 245, 255);
        doc.setDrawColor(37, 99, 235);
        doc.roundedRect(margin + 5, y - 5, pageWidth - 2 * margin - 10, 14, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Subject:", margin + 10, y + 1);

        const subject = `Request for Permission - ${reason}`;
        const subjectLines = doc.splitTextToSize(subject, 112);
        doc.text(subjectLines, margin + 31, y + 1);

        y += 18;

        addMixedText([
            { text: "I am writing to inform you that I, " },
            { text: studentName, bold: true },
            { text: ", Roll Number " },
            { text: rollNo, bold: true }
        ], margin + 5, y);

        y += 6;

        const classText = section !== "-" ? `${branch} - ${section}` : branch;

        addMixedText([
            { text: "from " },
            { text: classText, bold: true },
            { text: ", request permission for " },
            { text: `"${reason}"`, bold: true },
            { text: "." }
        ], margin + 5, y);

        y += 11;

        addMixedText([
            { text: "The permission is required from " },
            { text: startDate, bold: true },
            { text: " to " },
            { text: endDate, bold: true },
            { text: "." }
        ], margin + 5, y);

        y += 11;

        doc.setFont("helvetica", "bold");
        doc.text("Reason / Description:", margin + 5, y);

        y += 6;

        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(description, pageWidth - 2 * margin - 10);
        doc.text(descLines, margin + 5, y);
        y += descLines.length * 5.5 + 6;

        const para =
            "Due to this, I may be unable to attend my regular college classes during the mentioned period. " +
            "I kindly request you to grant me permission and attendance for the same.";

        const paraLines = doc.splitTextToSize(para, pageWidth - 2 * margin - 10);
        doc.text(paraLines, margin + 5, y);
        y += paraLines.length * 5.5 + 8;

        doc.text("Thank you.", margin + 5, y);
        y += 10;

        doc.text("Sincerely,", margin + 5, y);
        y += 7;

        doc.setFont("helvetica", "bold");
        doc.text(studentName, margin + 5, y);

        y += 6;
        doc.text(`Roll No: ${rollNo}`, margin + 5, y);

        const signY = y + 15;

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);

        doc.line(margin + 8, signY, margin + 70, signY);
        doc.line(pageWidth - margin - 70, signY, pageWidth - margin - 8, signY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        doc.text("Student Signature", margin + 39, signY + 6, { align: "center" });
        doc.text("HOD Signature & Stamp", pageWidth - margin - 39, signY + 6, { align: "center" });

        doc.setFontSize(8);
        doc.text("Generated by Sanchara Portal", pageWidth / 2, pageHeight - 22, { align: "center" });

        const safeRollNo = String(rollNo).replace(/[^\w-]/g, "_");
        const fileName = `Permission_Letter_${safeRollNo}_${req.id}.pdf`;

        doc.save(fileName);
    };

    logoImg.onload = () => finalizePdf(true);

    logoImg.onerror = () => {
        alert("Logo not loading. Check /images/iare-logo.png");
        finalizePdf(false);
    };

    logoImg.src = logoUrl;
}

function generateGatePassPdf(req) {
    const jspdfLib = window.jspdf;

    if (!jspdfLib || !jspdfLib.jsPDF) {
        alert("PDF library not loaded.");
        return;
    }

    const { jsPDF } = jspdfLib;
    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 18;
    const cardX = 15;
    const cardY = 15;
    const cardW = pageWidth - 30;
    const cardH = pageHeight - 30;

    const studentName = getStudentName(req);
    const rollNo = getStudentRollNo(req);
    const branch = getStudentBranch(req);
    const section = getStudentSection(req);
    const reason = req.reason || "Gate Pass";
    const description = req.description || reason;
    const startDate = formatDateForPdf(req.startDate);
    const endDate = formatDateForPdf(req.endDate);
    const generatedDate = formatDateForPdf(new Date().toISOString());

    const logoUrl = "/images/iare-logo.png";
    let y = 22;

    doc.setFillColor(244, 246, 251);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "F");

    doc.setDrawColor(225, 230, 240);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "S");

    const logoImg = new Image();

    const addRow = (label, value) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin + 8, y);

        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(String(value || "-"), pageWidth - 2 * margin - 65);
        doc.text(lines, margin + 58, y);

        y += Math.max(8, lines.length * 6);
    };

    const finalizePdf = (includeLogo) => {
        if (includeLogo) {
            doc.addImage(logoImg, "PNG", 42, y, 126, 26);
            y += 36;
        } else {
            y += 8;
        }

        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.8);
        doc.line(margin + 5, y, pageWidth - margin - 5, y);

        y += 13;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("GATE PASS", pageWidth / 2, y, { align: "center" });

        y += 10;

        doc.setFontSize(10);
        doc.text(`Date: ${generatedDate}`, pageWidth - margin - 5, y, { align: "right" });

        y += 15;

        doc.setFillColor(241, 245, 255);
        doc.setDrawColor(37, 99, 235);
        doc.roundedRect(margin + 5, y - 6, pageWidth - 2 * margin - 10, 84, 3, 3, "FD");

        y += 4;

        doc.setFontSize(10);
        addRow("Student Name:", studentName);
        addRow("Roll Number:", rollNo);
        addRow("Branch/Class:", section !== "-" ? `${branch} - ${section}` : branch);
        addRow("Reason:", reason);
        addRow("From Date:", startDate);
        addRow("To Date:", endDate);

        y += 12;

        doc.setFont("helvetica", "bold");
        doc.text("Description:", margin + 5, y);

        y += 7;

        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(description, pageWidth - 2 * margin - 10);
        doc.text(descLines, margin + 5, y);
        y += descLines.length * 5.5 + 12;

        const note =
            "This gate pass is issued based on the approved student request. The student is permitted for the above mentioned reason and period.";

        const noteLines = doc.splitTextToSize(note, pageWidth - 2 * margin - 10);
        doc.text(noteLines, margin + 5, y);
        y += noteLines.length * 5.5 + 18;

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);

        doc.line(margin + 8, y, margin + 70, y);
        doc.line(pageWidth - margin - 70, y, pageWidth - margin - 8, y);

        doc.setFontSize(9);
        doc.text("Student Signature", margin + 39, y + 6, { align: "center" });
        doc.text("HOD Signature & Stamp", pageWidth - margin - 39, y + 6, { align: "center" });

        doc.setFontSize(8);
        doc.text("Generated by Sanchara Portal", pageWidth / 2, pageHeight - 22, { align: "center" });

        const safeRollNo = String(rollNo).replace(/[^\w-]/g, "_");
        const fileName = `Gate_Pass_${safeRollNo}_${req.id}.pdf`;

        doc.save(fileName);
    };

    logoImg.onload = () => finalizePdf(true);

    logoImg.onerror = () => {
        alert("Logo not loading. Check /images/iare-logo.png");
        finalizePdf(false);
    };

    logoImg.src = logoUrl;
}

function getStudentName(req) {
    if (req.student?.name) return req.student.name;
    if (user?.username) return user.username;
    return "-";
}

function getStudentRollNo(req) {
    if (req.student?.rollNo) return req.student.rollNo;
    if (req.student?.rollNumber) return req.student.rollNumber;
    return "-";
}

function getStudentBranch(req) {
    if (req.student?.branch) return formatBranch(req.student.branch);
    return "-";
}

function getStudentSection(req) {
    if (req.student?.section) return req.student.section;
    if (req.student?.sec) return req.student.sec;
    return "-";
}

function formatBranch(branch) {
    if (!branch) return "-";

    const value = String(branch).trim().toUpperCase();

    const branchMap = {
        CSE: "Computer Science and Engineering",
        CSC: "Computer Science and Engineering",
        ECE: "Electronics and Communication Engineering",
        EEE: "Electrical and Electronics Engineering",
        MECH: "Mechanical Engineering",
        CIVIL: "Civil Engineering",
        IT: "Information Technology"
    };

    return branchMap[value] || branch;
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (isNaN(date.getTime())) return escapeHtml(value);

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);

    return `${dd}-${mm}-${yy}`;
}

function formatDateForPdf(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());

    return `${dd}/${mm}/${yyyy}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
