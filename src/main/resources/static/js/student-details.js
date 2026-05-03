const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");

window.onload = loadDetails;

function loadDetails() {
    fetch(`/student/${studentId}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("detailsContainer").innerHTML = `
                <img src="${data.photoUrl || ''}" width="100"/>
                <h2>${data.name}</h2>
                <p>Roll: ${data.rollNo}</p>
                <p>Email: ${data.email}</p>
                <p>Branch: ${data.branch}</p>
                <p>Section: ${data.section}</p>
                <p>Phone: ${data.studentPhoneNumber}</p>
                <p>Father: ${data.fatherName}</p>
            `;
        });
}

function goBack() {
    window.location.href = "hod-students.html";
}