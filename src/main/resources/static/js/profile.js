const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "index.html";
}

window.addEventListener("DOMContentLoaded", () => {
    loadProfileData();
});

async function loadProfileData() {
    try {
        setStatus("Loading profile...", false);

        const userId = user?.id;

        if (!userId) {
            throw new Error("User ID not found. Please login again.");
        }

        const response = await fetch(`/student/user/${userId}`);

        if (!response.ok) {
            throw new Error("Unable to load student profile details.");
        }

        const student = await response.json();

        fillProfile(student);
        setStatus("", false);

    } catch (error) {
        console.error("Profile load error:", error);

        const fallbackStudent = {
            name: user?.name || user?.username || "Student",
            username: user?.username || "-",
            email: user?.email || "-",
            id: "-",
            rollNo: "-",
            fatherName: "-",
            gender: "-",
            branch: "-",
            sem: "-",
            section: "-",
            caste: "-",
            studentPhoneNumber: "-",
            parentPhoneNumber: "-",
            dateOfBirth: "-"
        };

        fillProfile(fallbackStudent, true);
        setStatus(error.message || "Failed to load profile details.", true);
    }
}

function fillProfile(student, isFallback = false) {
    const displayName = student?.name || user?.username || "Student";
    const displayRole = formatRole(user?.role || "STUDENT");
    const displayUserId = user?.id || "-";
    const displayStudentId = student?.id || "-";
    const displayUsername = student?.username || user?.username || "-";
    const displayRollNo = student?.rollNo || student?.rollNumber || "-";
    const displayEmail = student?.email || user?.email || "-";
    const displayFatherName = student?.fatherName || "-";
    const displayGender = formatGender(student?.gender);
    const displayBranch = formatBranch(student?.branch);
    const displaySem = student?.sem || student?.semester || "-";
    const displaySection = student?.section || student?.sec || "-";
    const displayCaste = student?.caste || "-";
    const displayStudentPhone = student?.studentPhoneNumber || "-";
    const displayParentPhone = student?.parentPhoneNumber || "-";
    const displayDob = formatDateOfBirth(student?.dateOfBirth);
    const initial = String(displayName).charAt(0).toUpperCase();

    setText("profileName", displayName);
    setText("profileRole", displayRole);
    setText("profileUserId", displayUserId);
    setText("profileStudentId", displayStudentId);
    setText("profileStudentIdTop", displayStudentId);
    setText("profileUsername", displayUsername);
    setText("profileEmail", displayEmail);
    setText("profileRollNumber", displayRollNo);
    setText("profileFatherName", displayFatherName);
    setText("profileGender", displayGender);
    setText("profileBranch", displayBranch);
    setText("profileBranchTop", `${student?.branch || "-"} - ${displaySection}`);
    setText("profileSem", displaySem);
    setText("profileSemTop", displaySem);
    setText("profileSection", displaySection);
    setText("profileCaste", displayCaste);
    setText("profileStudentPhone", displayStudentPhone);
    setText("profileParentPhone", displayParentPhone);
    setText("profileDob", displayDob);

    if (isFallback) {
        showAvatar(initial);
    } else {
        setProfileImage(displayRollNo, initial);
    }
}

function setProfileImage(rollNo, initial) {
    const avatarEl = document.getElementById("profileAvatar");
    const imageEl = document.getElementById("profileImage");

    if (!imageEl || !avatarEl) return;

    if (!rollNo || rollNo === "-") {
        showAvatar(initial);
        return;
    }

    const cleanRollNo = String(rollNo).trim().toUpperCase();
    const imageUrl = `https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${cleanRollNo}/${cleanRollNo}.jpg`;

    imageEl.onload = function () {
        imageEl.style.display = "block";
        avatarEl.style.display = "none";
    };

    imageEl.onerror = function () {
        showAvatar(initial);
    };

    imageEl.src = imageUrl;
}

function showAvatar(initial) {
    const avatarEl = document.getElementById("profileAvatar");
    const imageEl = document.getElementById("profileImage");

    if (!avatarEl || !imageEl) return;

    avatarEl.textContent = initial || "S";
    avatarEl.style.display = "flex";
    imageEl.style.display = "none";
    imageEl.removeAttribute("src");
}

function formatGender(gender) {
    if (!gender || gender === "-") return "-";

    const value = String(gender).trim().toUpperCase();

    if (value === "M") return "Male";
    if (value === "F") return "Female";
    if (value === "MALE") return "Male";
    if (value === "FEMALE") return "Female";

    return gender;
}

function formatBranch(branch) {
    if (!branch || branch === "-") return "-";

    const value = String(branch).trim().toUpperCase();

    const branchMap = {
        "CSC": "Computer Science and Engineering",
        "CSE": "Computer Science and Engineering",
        "ECE": "Electronics and Communication Engineering",
        "EEE": "Electrical and Electronics Engineering",
        "MECH": "Mechanical Engineering",
        "CIVIL": "Civil Engineering",
        "IT": "Information Technology"
    };

    return branchMap[value] || branch;
}

function formatRole(role) {
    if (!role) return "-";
    return String(role).toUpperCase();
}

function formatDateOfBirth(dob) {
    if (!dob || dob === "-") return "-";

    const raw = String(dob).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split("-");
        return `${Number(day)} ${getMonthName(month)} ${year}`;
    }

    const parsedDate = new Date(raw);
    if (!isNaN(parsedDate.getTime())) {
        const day = parsedDate.getDate();
        const month = parsedDate.toLocaleString("en-US", { month: "long" });
        const year = parsedDate.getFullYear();
        return `${day} ${month} ${year}`;
    }

    return raw
        .replace(/(\b\d{1,2}\b)(\s+\1\b)+/g, "$1")
        .replace(/(\b\d{4}\b)(\s+\1\b)+/g, "$1")
        .replace(/[-/]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getMonthName(month) {
    const months = {
        "01": "January",
        "02": "February",
        "03": "March",
        "04": "April",
        "05": "May",
        "06": "June",
        "07": "July",
        "08": "August",
        "09": "September",
        "10": "October",
        "11": "November",
        "12": "December"
    };

    return months[month] || month;
}

function setStatus(message, isError) {
    const statusEl = document.getElementById("profileStatus");
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.style.display = message ? "block" : "none";
    statusEl.style.color = isError ? "#b91c1c" : "#166534";
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value || "-";
    }
}