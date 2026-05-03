const API_BASE = "";

document.addEventListener("DOMContentLoaded", () => {
    loadHods();
    loadAssignments();
});

async function loadHods() {
    const hodSelect = document.getElementById("hodSelect");

    try {
        const res = await fetch(`${API_BASE}/admin/hods`);
        const hods = await res.json();

        hodSelect.innerHTML = `<option value="">Select HOD</option>`;

        hods.forEach(hod => {
            const option = document.createElement("option");
            option.value = hod.id;
            option.textContent = `${hod.name || "No Name"} - ${hod.department || ""}`;
            hodSelect.appendChild(option);
        });

    } catch (error) {
        showStatus("Failed to load HODs", true);
    }
}

async function assignSection() {
    const hodId = document.getElementById("hodSelect").value;
    const department = document.getElementById("department").value.trim();
    const sem = document.getElementById("sem").value;
    const section = document.getElementById("section").value.trim();

    if (!hodId || !department || !sem || !section) {
        showStatus("Please fill all fields", true);
        return;
    }

    const payload = {
        hodId: Number(hodId),
        department,
        sem: Number(sem),
        section
    };

    try {
        const res = await fetch(`${API_BASE}/admin/hod-assignment`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });

        const data = await res.text();

        if (!res.ok) {
            showStatus(data, true);
            return;
        }

        showStatus("Section assigned successfully", false);

        document.getElementById("department").value = "";
        document.getElementById("sem").value = "";
        document.getElementById("section").value = "";

        loadAssignments();

    } catch (error) {
        showStatus("Assignment failed", true);
    }
}

async function loadAssignments() {
    const tbody = document.getElementById("assignmentTable");

    try {
        const res = await fetch(`${API_BASE}/admin/hod-assignment`);
        const assignments = await res.json();

        tbody.innerHTML = "";

        if (!assignments.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">No assignments found</td>
                </tr>
            `;
            return;
        }

        assignments.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${item.hod?.name || "-"}</td>
                <td>${item.department || "-"}</td>
                <td>${item.sem || "-"}</td>
                <td>${item.section || "-"}</td>
                <td>
                    <button class="delete-btn" onclick="deleteAssignment(${item.id})">
                        Delete
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

    } catch (error) {
        showStatus("Failed to load assignments", true);
    }
}

async function deleteAssignment(id) {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
        const res = await fetch(`${API_BASE}/admin/hod-assignment/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) {
            const msg = await res.text();
            showStatus(msg, true);
            return;
        }

        showStatus("Assignment deleted successfully", false);
        loadAssignments();

    } catch (error) {
        showStatus("Delete failed", true);
    }
}

function showStatus(message, isError) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.style.color = isError ? "#dc2626" : "#16a34a";
}