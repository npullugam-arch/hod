const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");

window.onload = loadDetails;

function loadDetails() {
    showSkeleton();

    fetch(`/student/${studentId}`)
        .then(res => res.json())
        .then(data => {
            setTimeout(() => {
                document.getElementById("detailsContainer").innerHTML = `
                    <div class="student-card">
                        <div class="student-header">
                            <div class="photo-box">
                                <img src="${data.photoUrl || ''}" alt="Student Photo">
                            </div>

                            <div>
                                <h2>${data.name || '-'}</h2>
                                <p class="student-subtitle">Student Details Overview</p>
                            </div>
                        </div>

                        <div class="details-table">
                            <div class="detail-row">
                                <div class="label">Roll Number</div>
                                <div class="value">${data.rollNo || '-'}</div>
                            </div>

                            <div class="detail-row">
                                <div class="label">Email</div>
                                <div class="value">${data.email || '-'}</div>
                            </div>

                            <div class="detail-row">
                                <div class="label">Branch</div>
                                <div class="value">${data.branch || '-'}</div>
                            </div>

                            <div class="detail-row">
                                <div class="label">Section</div>
                                <div class="value">${data.section || '-'}</div>
                            </div>

                            <div class="detail-row">
                                <div class="label">Phone Number</div>
                                <div class="value">${data.studentPhoneNumber || '-'}</div>
                            </div>

                            <div class="detail-row">
                                <div class="label">Father Name</div>
                                <div class="value">${data.fatherName || '-'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }, 700);
        });
}

function showSkeleton() {
    document.getElementById("detailsContainer").innerHTML = `
        <div class="skeleton-card">
            <div class="skeleton-top">
                <div class="skeleton-photo"></div>
                <div>
                    <div class="skeleton-line big"></div>
                    <div class="skeleton-line small"></div>
                </div>
            </div>

            <div class="skeleton-table">
                <div></div><div></div><div></div>
                <div></div><div></div><div></div>
            </div>
        </div>
    `;
}

function goBack() {
    window.location.href = "hod-students.html";
}