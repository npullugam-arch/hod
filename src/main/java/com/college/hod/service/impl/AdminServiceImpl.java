package com.college.hod.service.impl;

import com.college.hod.dto.AdminHodUpdateRequest;
import com.college.hod.dto.AdminStudentCreateRequest;
import com.college.hod.dto.AdminStudentListItem;
import com.college.hod.dto.AdminStudentPasswordUpdateRequest;
import com.college.hod.dto.AdminStudentUpdateRequest;
import com.college.hod.dto.ExcelUploadResponse;
import com.college.hod.dto.PaginatedResponse;
import com.college.hod.entity.Hod;
import com.college.hod.entity.Student;
import com.college.hod.entity.User;
import com.college.hod.enums.Role;
import com.college.hod.repository.HodRepository;
import com.college.hod.repository.StudentRepository;
import com.college.hod.repository.UserRepository;
import com.college.hod.service.AdminService;
import jakarta.transaction.Transactional;
import org.apache.poi.ss.usermodel.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class AdminServiceImpl implements AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private HodRepository hodRepository;

    @Override
    @Transactional
    public Student createStudent(AdminStudentCreateRequest request) {
        validateManualStudentRequest(request);

        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new RuntimeException("Username already exists");
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()
                && userRepository.existsByEmail(request.getEmail().trim())) {
            throw new RuntimeException("Email already exists");
        }

        if (request.getRollNo() != null && !request.getRollNo().trim().isEmpty()
                && studentRepository.existsByRollNo(request.getRollNo().trim())) {
            throw new RuntimeException("Roll No already exists");
        }

        Hod hod = hodRepository.findById(request.getHodId())
                .orElseThrow(() -> new RuntimeException("HOD not found"));

        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setPassword(request.getPassword().trim());
        user.setEmail(blankToNull(request.getEmail()));
        user.setRole(Role.STUDENT);
        user.setPasswordChanged(false);
        User savedUser = userRepository.save(user);

        Student student = new Student();
        applyCreateRequestToStudent(student, request);
        student.setUser(savedUser);
        student.setHod(hod);

        return studentRepository.save(student);
    }

    @Override
    @Transactional
    public ExcelUploadResponse uploadHodsExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Please upload a valid Excel file");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || (!fileName.toLowerCase().endsWith(".xlsx") && !fileName.toLowerCase().endsWith(".xls"))) {
            throw new RuntimeException("Only .xlsx or .xls files are allowed");
        }

        ExcelUploadResponse response = new ExcelUploadResponse();
        List<String> errors = new ArrayList<>();
        Set<String> excelUsernames = new HashSet<>();
        Set<String> excelEmployeeIds = new HashSet<>();
        Set<String> excelEmails = new HashSet<>();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);

            if (sheet.getPhysicalNumberOfRows() < 2) {
                throw new RuntimeException("Excel sheet does not contain HOD rows");
            }

            int headerRowIndex = resolveHeaderRowIndex(sheet, "emp id", "name");
            Row headerRow = sheet.getRow(headerRowIndex);
            Map<String, Integer> headerMap = buildHeaderMap(headerRow);

            validateRequiredHeaderAliases(headerMap, List.of("Emp ID", "Employee ID"), List.of("Name", "HOD Name"));

            int lastRowNum = sheet.getLastRowNum();
            int totalDataRows = 0;
            int successCount = 0;

            for (int rowIndex = headerRowIndex + 1; rowIndex <= lastRowNum; rowIndex++) {
                Row row = sheet.getRow(rowIndex);

                if (isRowEmpty(row)) {
                    continue;
                }

                totalDataRows++;

                try {
                    String employeeId = getCellByHeaderAliases(row, headerMap, "Emp ID", "Employee ID");
                    String hodName = getCellByHeaderAliases(row, headerMap, "Name", "HOD Name");
                    String username = getCellByHeaderAliases(row, headerMap, "Username", "User Name", "Login ID");
                    String email = getCellByHeaderAliases(row, headerMap, "Email Id", "Email", "Mail ID");

                    if (employeeId == null || employeeId.isBlank()) {
                        throw new RuntimeException("Emp ID is missing");
                    }

                    if (hodName == null || hodName.isBlank()) {
                        throw new RuntimeException("Name is missing");
                    }

                    String normalizedEmployeeId = employeeId.trim();
                    String finalUsername = (username == null || username.isBlank())
                            ? normalizedEmployeeId
                            : username.trim();
                    String finalPassword = normalizedEmployeeId;

                    if (excelUsernames.contains(finalUsername.toLowerCase())) {
                        throw new RuntimeException("Duplicate username in same Excel");
                    }

                    if (excelEmployeeIds.contains(normalizedEmployeeId.toLowerCase())) {
                        throw new RuntimeException("Duplicate Emp ID in same Excel");
                    }

                    if (email != null && !email.isBlank() && excelEmails.contains(email.trim().toLowerCase())) {
                        throw new RuntimeException("Duplicate email in same Excel: " + email);
                    }

                    if (userRepository.existsByUsername(finalUsername)) {
                        throw new RuntimeException("Username already exists: " + finalUsername);
                    }

                    if (hodRepository.existsByEmployeeId(normalizedEmployeeId)) {
                        throw new RuntimeException("Emp ID already exists: " + normalizedEmployeeId);
                    }

                    if (email != null && !email.isBlank() && userRepository.existsByEmail(email.trim())) {
                        throw new RuntimeException("Email already exists: " + email);
                    }

                    User user = new User();
                    user.setUsername(finalUsername);
                    user.setPassword(finalPassword);
                    user.setEmail(blankToNull(email));
                    user.setRole(Role.HOD);
                    user.setPasswordChanged(false);
                    User savedUser = userRepository.save(user);

                    Hod hod = new Hod();
                    hod.setPhoto(blankToNull(firstNonBlank(
                            getCellByHeaderAliases(row, headerMap, "Photo URL", "Photo", "Image URL"),
                            buildDefaultHodPhotoUrl(normalizedEmployeeId)
                    )));
                    hod.setEmployeeId(normalizedEmployeeId);
                    hod.setName(blankToNull(hodName));
                    hod.setDepartment(blankToNull(getCellByHeaderAliases(row, headerMap, "Department", "Dept")));
                    hod.setDesignation(blankToNull(getCellByHeaderAliases(row, headerMap, "Designation")));
                    hod.setPhdAwarded(blankToNull(getCellByHeaderAliases(row, headerMap, "Ph.D Awarded", "Phd Awarded", "PHD Awarded")));
                    hod.setDateOfJoining(blankToNull(getCellByHeaderAliases(row, headerMap, "Date Of Joining", "DOJ")));
                    hod.setPhoneNumber(blankToNull(getCellByHeaderAliases(row, headerMap, "Phone Number", "Phone")));
                    hod.setEmailId(blankToNull(email));
                    hod.setReligion(blankToNull(getCellByHeaderAliases(row, headerMap, "Religion")));
                    hod.setCasteCategory(blankToNull(getCellByHeaderAliases(row, headerMap, "Caste Category", "Caste")));
                    hod.setBloodGroup(blankToNull(getCellByHeaderAliases(row, headerMap, "Blood Group")));
                    hod.setPresentFlatno(blankToNull(getCellByHeaderAliases(row, headerMap, "Present Flat No", "Present Flatno")));
                    hod.setPresentTown(blankToNull(getCellByHeaderAliases(row, headerMap, "Present Town")));
                    hod.setPresentDistrict(blankToNull(getCellByHeaderAliases(row, headerMap, "Present District")));
                    hod.setPresentState(blankToNull(getCellByHeaderAliases(row, headerMap, "Present State")));
                    hod.setPresentPincode(blankToNull(getCellByHeaderAliases(row, headerMap, "Present Pincode")));
                    hod.setPermanentFlatno(blankToNull(getCellByHeaderAliases(row, headerMap, "Permanent Flat No", "Permanent Flatno")));
                    hod.setPermanentTown(blankToNull(getCellByHeaderAliases(row, headerMap, "Permanent Town")));
                    hod.setPermanentDistrict(blankToNull(getCellByHeaderAliases(row, headerMap, "Permanent District")));
                    hod.setPermanentState(blankToNull(getCellByHeaderAliases(row, headerMap, "Permanent State")));
                    hod.setPermanentPincode(blankToNull(getCellByHeaderAliases(row, headerMap, "Permanent Pincode")));
                    hod.setJntuUid(blankToNull(getCellByHeaderAliases(row, headerMap, "JNTU UID", "JNTU Id", "JNTUID")));
                    hod.setStatus(blankToNull(getCellByHeaderAliases(row, headerMap, "Status")));
                    hod.setUser(savedUser);

                    hodRepository.save(hod);

                    excelUsernames.add(finalUsername.toLowerCase());
                    excelEmployeeIds.add(normalizedEmployeeId.toLowerCase());

                    if (email != null && !email.isBlank()) {
                        excelEmails.add(email.trim().toLowerCase());
                    }

                    successCount++;
                } catch (Exception ex) {
                    errors.add("Row " + (rowIndex + 1) + ": " + ex.getMessage());
                }
            }

            response.setTotalRows(totalDataRows);
            response.setSuccessCount(successCount);
            response.setFailedCount(totalDataRows - successCount);
            response.setErrors(errors);
            return response;
        } catch (Exception e) {
            throw new RuntimeException("Failed to process Excel file: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public ExcelUploadResponse uploadStudentsExcel(MultipartFile file, Long hodId) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Please upload a valid Excel file");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || (!fileName.toLowerCase().endsWith(".xlsx") && !fileName.toLowerCase().endsWith(".xls"))) {
            throw new RuntimeException("Only .xlsx or .xls files are allowed");
        }

        Hod hod = hodRepository.findById(hodId)
                .orElseThrow(() -> new RuntimeException("HOD not found"));

        ExcelUploadResponse response = new ExcelUploadResponse();
        List<String> errors = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);

            if (sheet.getPhysicalNumberOfRows() < 3) {
                throw new RuntimeException("Excel sheet does not contain student rows");
            }

            Row headerRow = sheet.getRow(1);
            Map<String, Integer> headerMap = buildHeaderMap(headerRow);

            validateRequiredHeaders(headerMap, "Roll No", "Student Name");

            int lastRowNum = sheet.getLastRowNum();
            int totalDataRows = 0;
            List<PendingStudentUploadRow> pendingRows = new ArrayList<>();
            Set<String> excelUsernames = new HashSet<>();
            Set<String> excelRollNumbers = new HashSet<>();
            Set<String> excelEmails = new HashSet<>();

            for (int rowIndex = 2; rowIndex <= lastRowNum; rowIndex++) {
                Row row = sheet.getRow(rowIndex);

                if (isRowEmpty(row)) {
                    continue;
                }

                totalDataRows++;

                try {
                    String rollNo = getCellByHeader(row, headerMap, "Roll No");
                    String studentName = getCellByHeader(row, headerMap, "Student Name");
                    String studentEmail = getCellByHeader(row, headerMap, "Student Email Id");

                    if (rollNo == null || rollNo.isBlank()) {
                        throw new RuntimeException("Roll No is missing");
                    }

                    if (studentName == null || studentName.isBlank()) {
                        throw new RuntimeException("Student Name is missing");
                    }

                    String username = rollNo.trim();
                    String password = rollNo.trim();
                    String normalizedUsername = username.toLowerCase();
                    String normalizedRollNo = rollNo.trim().toLowerCase();
                    String normalizedEmail = studentEmail != null && !studentEmail.isBlank()
                            ? studentEmail.trim().toLowerCase()
                            : null;

                    if (excelUsernames.contains(normalizedUsername)) {
                        throw new RuntimeException("Duplicate username/roll no in same Excel");
                    }

                    if (excelRollNumbers.contains(normalizedRollNo)) {
                        throw new RuntimeException("Duplicate roll no in same Excel");
                    }

                    if (normalizedEmail != null && excelEmails.contains(normalizedEmail)) {
                        throw new RuntimeException("Duplicate email in same Excel: " + studentEmail);
                    }

                    Student student = new Student();
                    student.setName(blankToNull(studentName));
                    student.setRollNo(blankToNull(rollNo));
                    student.setEmail(blankToNull(studentEmail));

                    student.setGender(blankToNull(getCellByHeader(row, headerMap, "Gender")));
                    student.setStudentStatus(blankToNull(getCellByHeader(row, headerMap, "Status")));
                    student.setCaste(blankToNull(getCellByHeader(row, headerMap, "Cast")));
                    student.setSubCaste(blankToNull(getCellByHeader(row, headerMap, "Sub Cast")));
                    student.setReligion(blankToNull(getCellByHeader(row, headerMap, "Religion")));
                    student.setBranch(blankToNull(getCellByHeader(row, headerMap, "Branch")));
                    student.setSem(toInteger(getCellByHeader(row, headerMap, "Semester")));
                    student.setAdmissionType(blankToNull(getCellByHeader(row, headerMap, "Admission Category")));
                    student.setFeeCategory(blankToNull(getCellByHeader(row, headerMap, "Fee Category")));
                    student.setCetRank(blankToNull(getCellByHeader(row, headerMap, "CET Rank")));
                    student.setSscMarks(blankToNull(getCellByHeader(row, headerMap, "SSC Marks")));
                    student.setSscPercentage(blankToNull(getCellByHeader(row, headerMap, "SSC %")));
                    student.setInterMarks(blankToNull(getCellByHeader(row, headerMap, "Inter Marks")));
                    student.setInterPercentage(blankToNull(getCellByHeader(row, headerMap, "Inter %")));
                    student.setUgMarks(blankToNull(getCellByHeader(row, headerMap, "UG Marks")));
                    student.setUgPercentage(blankToNull(getCellByHeader(row, headerMap, "UG %")));
                    student.setDateOfBirth(blankToNull(getCellByHeader(row, headerMap, "DOB")));
                    student.setDateOfJoining(blankToNull(getCellByHeader(row, headerMap, "DOJ")));
                    student.setFatherName(blankToNull(getCellByHeader(row, headerMap, "Father Name")));
                    student.setMotherName(blankToNull(getCellByHeader(row, headerMap, "Mother Name")));
                    student.setStudentPhoneNumber(blankToNull(getCellByHeader(row, headerMap, "Student Phone")));
                    student.setParentPhoneNumber(blankToNull(getCellByHeader(row, headerMap, "Parent Phone")));
                    student.setMotherPhone(blankToNull(getCellByHeader(row, headerMap, "Mother Phone")));
                    student.setCurrentAddress(blankToNull(getCellByHeader(row, headerMap, "Current Address")));
                    student.setPermanentAddress(blankToNull(getCellByHeader(row, headerMap, "Permanent Address")));
                    student.setAadhar(blankToNull(getCellByHeader(row, headerMap, "Aadhar")));
                    student.setFatherOccupation(blankToNull(getCellByHeader(row, headerMap, "Father Occupation")));
                    student.setOccupationType(blankToNull(getCellByHeader(row, headerMap, "Occupation Type")));
                    student.setIncome(blankToNull(getCellByHeader(row, headerMap, "Income")));
                    student.setSection(blankToNull(getCellByHeader(row, headerMap, "Section")));
                    student.setSec(blankToNull(getCellByHeader(row, headerMap, "Section")));
                    student.setMoles(blankToNull(getCellByHeader(row, headerMap, "Moles")));
                    student.setPlaceOfBirth(blankToNull(getCellByHeader(row, headerMap, "place_of_birth")));
                    student.setCurrentDno(blankToNull(getCellByHeader(row, headerMap, "current_dno")));
                    student.setCurrentStreet(blankToNull(getCellByHeader(row, headerMap, "current_street")));
                    student.setCurrentVillageTown(blankToNull(getCellByHeader(row, headerMap, "current_village_town")));
                    student.setCurrentMandal(blankToNull(getCellByHeader(row, headerMap, "current_mandal")));
                    student.setCurrentDistrict(blankToNull(getCellByHeader(row, headerMap, "current_district")));
                    student.setCurrentState(blankToNull(getCellByHeader(row, headerMap, "current_state")));
                    student.setCurrentPincode(blankToNull(getCellByHeader(row, headerMap, "current_pincode")));
                    student.setPermanentDno(blankToNull(getCellByHeader(row, headerMap, "permanent_dno")));
                    student.setPermanentStreet(blankToNull(getCellByHeader(row, headerMap, "permanent_street")));
                    student.setPermanentVillageTown(blankToNull(getCellByHeader(row, headerMap, "permanent_village_town")));
                    student.setPermanentMandal(blankToNull(getCellByHeader(row, headerMap, "permanent_mandal")));
                    student.setPermanentDistrict(blankToNull(getCellByHeader(row, headerMap, "permanent_district")));
                    student.setPermanentState(blankToNull(getCellByHeader(row, headerMap, "permanent_state")));
                    student.setPermanentPincode(blankToNull(getCellByHeader(row, headerMap, "permanent_pincode")));
                    student.setDomicileState(blankToNull(getCellByHeader(row, headerMap, "domicile State")));
                    student.setSscState(blankToNull(getCellByHeader(row, headerMap, "SSC State")));
                    student.setInterState(blankToNull(getCellByHeader(row, headerMap, "Inter State")));
                    student.setHod(hod);

                    User user = new User();
                    user.setUsername(username);
                    user.setPassword(password);
                    user.setEmail(blankToNull(studentEmail));
                    user.setRole(Role.STUDENT);
                    user.setPasswordChanged(false);

                    pendingRows.add(new PendingStudentUploadRow(rowIndex, username, normalizedUsername, rollNo.trim(),
                            normalizedRollNo, studentEmail, normalizedEmail, user, student));

                    excelUsernames.add(normalizedUsername);
                    excelRollNumbers.add(normalizedRollNo);

                    if (normalizedEmail != null) {
                        excelEmails.add(normalizedEmail);
                    }

                } catch (Exception ex) {
                    errors.add("Row " + (rowIndex + 1) + ": " + ex.getMessage());
                }
            }

            Set<String> existingUsernames = excelUsernames.isEmpty()
                    ? Collections.emptySet()
                    : userRepository.findExistingUsernames(excelUsernames);
            Set<String> existingRollNos = excelRollNumbers.isEmpty()
                    ? Collections.emptySet()
                    : studentRepository.findExistingRollNos(excelRollNumbers);
            Set<String> existingEmails = excelEmails.isEmpty()
                    ? Collections.emptySet()
                    : userRepository.findExistingEmails(excelEmails);

            List<PendingStudentUploadRow> validRows = new ArrayList<>();

            for (PendingStudentUploadRow pendingRow : pendingRows) {
                if (existingUsernames.contains(pendingRow.normalizedUsername)) {
                    errors.add("Row " + (pendingRow.rowIndex + 1) + ": Username already exists: " + pendingRow.username);
                    continue;
                }

                if (existingRollNos.contains(pendingRow.normalizedRollNo)) {
                    errors.add("Row " + (pendingRow.rowIndex + 1) + ": Roll No already exists: " + pendingRow.rollNo);
                    continue;
                }

                if (pendingRow.normalizedEmail != null && existingEmails.contains(pendingRow.normalizedEmail)) {
                    errors.add("Row " + (pendingRow.rowIndex + 1) + ": Email already exists: " + pendingRow.email);
                    continue;
                }

                validRows.add(pendingRow);
            }

            List<User> usersToSave = validRows.stream()
                    .map(pendingRow -> pendingRow.user)
                    .toList();

            List<User> savedUsers = userRepository.saveAll(usersToSave);

            List<Student> studentsToSave = new ArrayList<>();
            for (int i = 0; i < validRows.size(); i++) {
                PendingStudentUploadRow pendingRow = validRows.get(i);
                pendingRow.student.setUser(savedUsers.get(i));
                studentsToSave.add(pendingRow.student);
            }

            studentRepository.saveAll(studentsToSave);

            response.setTotalRows(totalDataRows);
            response.setSuccessCount(validRows.size());
            response.setFailedCount(totalDataRows - validRows.size());
            response.setErrors(errors);

            return response;

        } catch (Exception e) {
            throw new RuntimeException("Failed to process Excel file: " + e.getMessage());
        }
    }

    @Override
    public List<Hod> getAllHods() {
        return hodRepository.findAll();
    }

    

    @Override
    public Hod getHodById(Long hodId) {
        return hodRepository.findById(hodId)
                .orElseThrow(() -> new RuntimeException("HOD not found"));
    }

    @Override
    @Transactional
    public Hod updateHodDetails(Long hodId, AdminHodUpdateRequest request) {
        Hod hod = hodRepository.findById(hodId)
                .orElseThrow(() -> new RuntimeException("HOD not found"));

        User user = hod.getUser();
        if (user == null) {
            throw new RuntimeException("User account not found for this HOD");
        }

        String newUsername = trimValue(request.getUsername());
        String newEmployeeId = trimValue(request.getEmployeeId());
        String newEmail = blankToNull(request.getEmailId());

        if (newUsername == null || newUsername.isBlank()) {
            throw new RuntimeException("Username is required");
        }

        if (newEmployeeId == null || newEmployeeId.isBlank()) {
            throw new RuntimeException("Emp ID is required");
        }

        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new RuntimeException("HOD name is required");
        }

        Optional<User> existingUsernameUser = userRepository.findByUsername(newUsername);
        if (existingUsernameUser.isPresent() && !existingUsernameUser.get().getId().equals(user.getId())) {
            throw new RuntimeException("Username already exists");
        }

        Optional<Hod> existingEmployeeHod = hodRepository.findByEmployeeId(newEmployeeId);
        if (existingEmployeeHod.isPresent() && !existingEmployeeHod.get().getId().equals(hod.getId())) {
            throw new RuntimeException("Emp ID already exists");
        }

        if (newEmail != null) {
            Optional<User> existingEmailUser = userRepository.findByEmail(newEmail);
            if (existingEmailUser.isPresent() && !existingEmailUser.get().getId().equals(user.getId())) {
                throw new RuntimeException("Email already exists");
            }
        }

        user.setUsername(newUsername);
        user.setEmail(newEmail);

        applyUpdateRequestToHod(hod, request);
        hod.setEmployeeId(newEmployeeId);
        hod.setEmailId(newEmail);

        userRepository.save(user);
        return hodRepository.save(hod);
    }

    @Override
    public Map<String, Object> getHodPassword(Long hodId) {
        Hod hod = hodRepository.findById(hodId)
                .orElseThrow(() -> new RuntimeException("HOD not found"));

        User user = hod.getUser();
        if (user == null) {
            throw new RuntimeException("User account not found for this HOD");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("hodId", hod.getId());
        response.put("userId", user.getId());
        response.put("username", user.getUsername());
        response.put("currentPassword", user.getPassword());

        return response;
    }

    @Override
    @Transactional
    public void updateHodPassword(Long hodId, AdminStudentPasswordUpdateRequest request) {
        Hod hod = hodRepository.findById(hodId)
                .orElseThrow(() -> new RuntimeException("HOD not found"));

        User user = hod.getUser();
        if (user == null) {
            throw new RuntimeException("User account not found for this HOD");
        }

        String newPassword = trimValue(request.getNewPassword());
        String confirmPassword = trimValue(request.getConfirmPassword());

        if (newPassword == null || newPassword.isBlank()) {
            throw new RuntimeException("New password is required");
        }

        if (confirmPassword == null || confirmPassword.isBlank()) {
            throw new RuntimeException("Confirm password is required");
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new RuntimeException("New password and confirm password do not match");
        }

        user.setPassword(newPassword);
        user.setPasswordChanged(true);
        userRepository.save(user);
    }

    @Override
    public PaginatedResponse<AdminStudentListItem> getStudentsPage(
            int page,
            int size,
            String search,
            String branch,
            Integer sem,
            String sec,
            String sortBy,
            String sortDir
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        String normalizedSortBy = resolveStudentSortBy(sortBy);
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, normalizedSortBy));

        Page<AdminStudentListItem> resultPage = studentRepository.findAdminStudentCards(
                safeString(search),
                safeString(branch),
                sem,
                safeString(sec),
                pageable
        );

        return new PaginatedResponse<>(
                resultPage.getContent(),
                resultPage.getNumber(),
                resultPage.getSize(),
                resultPage.getTotalElements(),
                resultPage.getTotalPages(),
                resultPage.isLast()
        );
    }

    @Override
    public Student getStudentById(Long studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }

    @Override
    @Transactional
    public Student updateStudentDetails(Long studentId, AdminStudentUpdateRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        User user = student.getUser();
        if (user == null) {
            throw new RuntimeException("User account not found for this student");
        }

        String newUsername = trimValue(request.getUsername());
        String newRollNo = trimValue(request.getRollNo());
        String newEmail = blankToNull(request.getEmail());

        if (newUsername == null || newUsername.isBlank()) {
            throw new RuntimeException("Username is required");
        }

        if (newRollNo == null || newRollNo.isBlank()) {
            throw new RuntimeException("Roll Number is required");
        }

        Optional<User> existingUsernameUser = userRepository.findByUsername(newUsername);
        if (existingUsernameUser.isPresent() && !existingUsernameUser.get().getId().equals(user.getId())) {
            throw new RuntimeException("Username already exists");
        }

        Optional<Student> existingRollStudent = studentRepository.findByRollNo(newRollNo);
        if (existingRollStudent.isPresent() && !existingRollStudent.get().getId().equals(student.getId())) {
            throw new RuntimeException("Roll Number already exists");
        }

        if (newEmail != null) {
            Optional<User> existingEmailUser = userRepository.findByEmail(newEmail);
            if (existingEmailUser.isPresent() && !existingEmailUser.get().getId().equals(user.getId())) {
                throw new RuntimeException("Email already exists");
            }
        }

        user.setUsername(newUsername);
        user.setEmail(newEmail);

        applyUpdateRequestToStudent(student, request);
        student.setEmail(newEmail);
        student.setRollNo(newRollNo);

        userRepository.save(user);
        return studentRepository.save(student);
    }

    @Override
    public Map<String, Object> getStudentPassword(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        User user = student.getUser();
        if (user == null) {
            throw new RuntimeException("User account not found for this student");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("studentId", student.getId());
        response.put("userId", user.getId());
        response.put("username", user.getUsername());
        response.put("currentPassword", user.getPassword());

        return response;
    }

    @Override
    @Transactional
    public void updateStudentPassword(Long studentId, AdminStudentPasswordUpdateRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        User user = student.getUser();
        if (user == null) {
            throw new RuntimeException("User account not found for this student");
        }

        String newPassword = trimValue(request.getNewPassword());
        String confirmPassword = trimValue(request.getConfirmPassword());

        if (newPassword == null || newPassword.isBlank()) {
            throw new RuntimeException("New password is required");
        }

        if (confirmPassword == null || confirmPassword.isBlank()) {
            throw new RuntimeException("Confirm password is required");
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new RuntimeException("New password and confirm password do not match");
        }

        user.setPassword(newPassword);
        user.setPasswordChanged(true);
        userRepository.save(user);
    }


    private void applyUpdateRequestToHod(Hod hod, AdminHodUpdateRequest request) {
        hod.setPhoto(blankToNull(request.getPhoto()));
        hod.setEmployeeId(blankToNull(request.getEmployeeId()));
        hod.setName(blankToNull(request.getName()));
        hod.setDepartment(blankToNull(request.getDepartment()));
        hod.setDesignation(blankToNull(request.getDesignation()));
        hod.setPhdAwarded(blankToNull(request.getPhdAwarded()));
        hod.setDateOfJoining(blankToNull(request.getDateOfJoining()));
        hod.setPhoneNumber(blankToNull(request.getPhoneNumber()));
        hod.setEmailId(blankToNull(request.getEmailId()));
        hod.setReligion(blankToNull(request.getReligion()));
        hod.setCasteCategory(blankToNull(request.getCasteCategory()));
        hod.setBloodGroup(blankToNull(request.getBloodGroup()));
        hod.setPresentFlatno(blankToNull(request.getPresentFlatno()));
        hod.setPresentTown(blankToNull(request.getPresentTown()));
        hod.setPresentDistrict(blankToNull(request.getPresentDistrict()));
        hod.setPresentState(blankToNull(request.getPresentState()));
        hod.setPresentPincode(blankToNull(request.getPresentPincode()));
        hod.setPermanentFlatno(blankToNull(request.getPermanentFlatno()));
        hod.setPermanentTown(blankToNull(request.getPermanentTown()));
        hod.setPermanentDistrict(blankToNull(request.getPermanentDistrict()));
        hod.setPermanentState(blankToNull(request.getPermanentState()));
        hod.setPermanentPincode(blankToNull(request.getPermanentPincode()));
        hod.setJntuUid(blankToNull(request.getJntuUid()));
        hod.setStatus(blankToNull(request.getStatus()));
    }


    private void applyCreateRequestToStudent(Student student, AdminStudentCreateRequest request) {
        student.setName(trimValue(request.getName()));
        student.setEmail(blankToNull(request.getEmail()));
        student.setSection(blankToNull(request.getSection()));
        student.setRollNo(blankToNull(request.getRollNo()));
        student.setFatherName(blankToNull(request.getFatherName()));
        student.setGender(blankToNull(request.getGender()));
        student.setBranch(blankToNull(request.getBranch()));
        student.setDeptId(request.getDeptId());
        student.setSem(request.getSem());
        student.setSec(blankToNull(request.getSec()));
        student.setSectionId(request.getSectionId());
        student.setAdmissionType(blankToNull(request.getAdmissionType()));
        student.setCaste(blankToNull(request.getCaste()));
        student.setStudentPhoneNumber(blankToNull(request.getStudentPhoneNumber()));
        student.setParentPhoneNumber(blankToNull(request.getParentPhoneNumber()));
        student.setDateOfBirth(blankToNull(request.getDateOfBirth()));

        student.setStudentStatus(blankToNull(request.getStudentStatus()));
        student.setSubCaste(blankToNull(request.getSubCaste()));
        student.setReligion(blankToNull(request.getReligion()));
        student.setFeeCategory(blankToNull(request.getFeeCategory()));
        student.setCetRank(blankToNull(request.getCetRank()));
        student.setSscMarks(blankToNull(request.getSscMarks()));
        student.setSscPercentage(blankToNull(request.getSscPercentage()));
        student.setInterMarks(blankToNull(request.getInterMarks()));
        student.setInterPercentage(blankToNull(request.getInterPercentage()));
        student.setUgMarks(blankToNull(request.getUgMarks()));
        student.setUgPercentage(blankToNull(request.getUgPercentage()));
        student.setDateOfJoining(blankToNull(request.getDateOfJoining()));
        student.setMotherName(blankToNull(request.getMotherName()));
        student.setMotherPhone(blankToNull(request.getMotherPhone()));
        student.setCurrentAddress(blankToNull(request.getCurrentAddress()));
        student.setPermanentAddress(blankToNull(request.getPermanentAddress()));
        student.setAadhar(blankToNull(request.getAadhar()));
        student.setFatherOccupation(blankToNull(request.getFatherOccupation()));
        student.setOccupationType(blankToNull(request.getOccupationType()));
        student.setIncome(blankToNull(request.getIncome()));
        student.setMoles(blankToNull(request.getMoles()));
        student.setPlaceOfBirth(blankToNull(request.getPlaceOfBirth()));
        student.setCurrentDno(blankToNull(request.getCurrentDno()));
        student.setCurrentStreet(blankToNull(request.getCurrentStreet()));
        student.setCurrentVillageTown(blankToNull(request.getCurrentVillageTown()));
        student.setCurrentMandal(blankToNull(request.getCurrentMandal()));
        student.setCurrentDistrict(blankToNull(request.getCurrentDistrict()));
        student.setCurrentState(blankToNull(request.getCurrentState()));
        student.setCurrentPincode(blankToNull(request.getCurrentPincode()));
        student.setPermanentDno(blankToNull(request.getPermanentDno()));
        student.setPermanentStreet(blankToNull(request.getPermanentStreet()));
        student.setPermanentVillageTown(blankToNull(request.getPermanentVillageTown()));
        student.setPermanentMandal(blankToNull(request.getPermanentMandal()));
        student.setPermanentDistrict(blankToNull(request.getPermanentDistrict()));
        student.setPermanentState(blankToNull(request.getPermanentState()));
        student.setPermanentPincode(blankToNull(request.getPermanentPincode()));
        student.setDomicileState(blankToNull(request.getDomicileState()));
        student.setSscState(blankToNull(request.getSscState()));
        student.setInterState(blankToNull(request.getInterState()));
    }

    private void applyUpdateRequestToStudent(Student student, AdminStudentUpdateRequest request) {
        student.setName(trimValue(request.getName()));
        student.setEmail(blankToNull(request.getEmail()));
        student.setSection(blankToNull(request.getSection()));
        student.setFatherName(blankToNull(request.getFatherName()));
        student.setGender(blankToNull(request.getGender()));
        student.setBranch(blankToNull(request.getBranch()));
        student.setDeptId(request.getDeptId());
        student.setSem(request.getSem());
        student.setSec(blankToNull(request.getSection()));
        student.setSectionId(request.getSectionId());
        student.setAdmissionType(blankToNull(request.getAdmissionType()));
        student.setCaste(blankToNull(request.getCaste()));
        student.setStudentPhoneNumber(blankToNull(request.getStudentPhoneNumber()));
        student.setParentPhoneNumber(blankToNull(request.getParentPhoneNumber()));
        student.setDateOfBirth(blankToNull(request.getDateOfBirth()));

        student.setStudentStatus(blankToNull(request.getStudentStatus()));
        student.setSubCaste(blankToNull(request.getSubCaste()));
        student.setReligion(blankToNull(request.getReligion()));
        student.setFeeCategory(blankToNull(request.getFeeCategory()));
        student.setCetRank(blankToNull(request.getCetRank()));
        student.setSscMarks(blankToNull(request.getSscMarks()));
        student.setSscPercentage(blankToNull(request.getSscPercentage()));
        student.setInterMarks(blankToNull(request.getInterMarks()));
        student.setInterPercentage(blankToNull(request.getInterPercentage()));
        student.setUgMarks(blankToNull(request.getUgMarks()));
        student.setUgPercentage(blankToNull(request.getUgPercentage()));
        student.setDateOfJoining(blankToNull(request.getDateOfJoining()));
        student.setMotherName(blankToNull(request.getMotherName()));
        student.setMotherPhone(blankToNull(request.getMotherPhone()));
        student.setCurrentAddress(blankToNull(request.getCurrentAddress()));
        student.setPermanentAddress(blankToNull(request.getPermanentAddress()));
        student.setAadhar(blankToNull(request.getAadhar()));
        student.setFatherOccupation(blankToNull(request.getFatherOccupation()));
        student.setOccupationType(blankToNull(request.getOccupationType()));
        student.setIncome(blankToNull(request.getIncome()));
        student.setMoles(blankToNull(request.getMoles()));
        student.setPlaceOfBirth(blankToNull(request.getPlaceOfBirth()));
        student.setCurrentDno(blankToNull(request.getCurrentDno()));
        student.setCurrentStreet(blankToNull(request.getCurrentStreet()));
        student.setCurrentVillageTown(blankToNull(request.getCurrentVillageTown()));
        student.setCurrentMandal(blankToNull(request.getCurrentMandal()));
        student.setCurrentDistrict(blankToNull(request.getCurrentDistrict()));
        student.setCurrentState(blankToNull(request.getCurrentState()));
        student.setCurrentPincode(blankToNull(request.getCurrentPincode()));
        student.setPermanentDno(blankToNull(request.getPermanentDno()));
        student.setPermanentStreet(blankToNull(request.getPermanentStreet()));
        student.setPermanentVillageTown(blankToNull(request.getPermanentVillageTown()));
        student.setPermanentMandal(blankToNull(request.getPermanentMandal()));
        student.setPermanentDistrict(blankToNull(request.getPermanentDistrict()));
        student.setPermanentState(blankToNull(request.getPermanentState()));
        student.setPermanentPincode(blankToNull(request.getPermanentPincode()));
        student.setDomicileState(blankToNull(request.getDomicileState()));
        student.setSscState(blankToNull(request.getSscState()));
        student.setInterState(blankToNull(request.getInterState()));
    }

    private void validateManualStudentRequest(AdminStudentCreateRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new RuntimeException("Student name is required");
        }

        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new RuntimeException("Username is required");
        }

        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new RuntimeException("Password is required");
        }

        if (request.getHodId() == null) {
            throw new RuntimeException("HOD selection is required");
        }
    }

    private Map<String, Integer> buildHeaderMap(Row headerRow) {
        if (headerRow == null) {
            throw new RuntimeException("Header row is missing. Expected headers in row 2.");
        }

        Map<String, Integer> headerMap = new HashMap<>();

        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            String header = getCellString(headerRow.getCell(i));
            if (header != null && !header.isBlank()) {
                headerMap.put(normalizeHeader(header), i);
            }
        }

        return headerMap;
    }

    private void validateRequiredHeaders(Map<String, Integer> headerMap, String... requiredHeaders) {
        for (String header : requiredHeaders) {
            if (!headerMap.containsKey(normalizeHeader(header))) {
                throw new RuntimeException("Required Excel column missing: " + header);
            }
        }
    }

    private void validateRequiredHeaderAliases(Map<String, Integer> headerMap, List<String>... headerAliases) {
        for (List<String> aliases : headerAliases) {
            boolean found = aliases.stream().anyMatch(alias -> headerMap.containsKey(normalizeHeader(alias)));
            if (!found) {
                throw new RuntimeException("Required Excel column missing: " + aliases.get(0));
            }
        }
    }

    private String getCellByHeader(Row row, Map<String, Integer> headerMap, String headerName) {
        Integer index = headerMap.get(normalizeHeader(headerName));
        if (index == null || row == null) {
            return null;
        }
        return getCellString(row.getCell(index));
    }

    private String getCellByHeaderAliases(Row row, Map<String, Integer> headerMap, String... headerNames) {
        for (String headerName : headerNames) {
            String value = getCellByHeader(row, headerMap, headerName);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String normalizeHeader(String value) {
        return value == null ? "" : value.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private int resolveHeaderRowIndex(Sheet sheet, String... expectedHeaders) {
        int lastRowNum = Math.min(sheet.getLastRowNum(), 4);

        for (int rowIndex = 0; rowIndex <= lastRowNum; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null) {
                continue;
            }

            Map<String, Integer> headerMap = buildHeaderMap(row);
            boolean matches = Arrays.stream(expectedHeaders)
                    .allMatch(expected -> headerMap.containsKey(normalizeHeader(expected)));

            if (matches) {
                return rowIndex;
            }
        }

        return 1;
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;

        for (int cellIndex = 0; cellIndex < row.getLastCellNum(); cellIndex++) {
            Cell cell = row.getCell(cellIndex);
            String value = getCellString(cell);
            if (value != null && !value.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;

        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                if (DateUtil.isCellDateFormatted(cell)) {
                    return new SimpleDateFormat("dd-MM-yyyy").format(cell.getDateCellValue());
                }

                double numericValue = cell.getNumericCellValue();
                if (numericValue == Math.floor(numericValue)) {
                    return String.valueOf((long) numericValue);
                }
                return String.valueOf(numericValue);
            }

            if (cell.getCellType() == CellType.STRING) {
                return blankToNull(cell.getStringCellValue());
            }

            if (cell.getCellType() == CellType.BOOLEAN) {
                return String.valueOf(cell.getBooleanCellValue());
            }

            if (cell.getCellType() == CellType.FORMULA) {
                try {
                    if (DateUtil.isCellDateFormatted(cell)) {
                        return new SimpleDateFormat("dd-MM-yyyy").format(cell.getDateCellValue());
                    }

                    double numericValue = cell.getNumericCellValue();
                    if (numericValue == Math.floor(numericValue)) {
                        return String.valueOf((long) numericValue);
                    }
                    return String.valueOf(numericValue);
                } catch (Exception numericException) {
                    try {
                        return blankToNull(cell.getStringCellValue());
                    } catch (Exception stringException) {
                        return blankToNull(cell.toString());
                    }
                }
            }

            return blankToNull(cell.toString());

        } catch (Exception e) {
            return null;
        }
    }

    private Integer toInteger(String value) {
        if (value == null || value.isBlank()) return null;

        try {
            return Integer.parseInt(value.trim().replace(".0", ""));
        } catch (Exception e) {
            return null;
        }
    }

    private String blankToNull(String value) {
        return (value == null || value.trim().isEmpty()) ? null : value.trim();
    }

    private String trimValue(String value) {
        return value == null ? null : value.trim();
    }

    private String safeValue(String value) {
        return value == null ? "" : value;
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private String resolveStudentSortBy(String sortBy) {
        Set<String> allowedSortFields = Set.of("id", "name", "rollNo", "branch", "sem", "section", "sec", "email");
        if (sortBy == null || !allowedSortFields.contains(sortBy)) {
            return "name";
        }
        return sortBy;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return null;
    }

    private String buildDefaultHodPhotoUrl(String employeeId) {
        if (employeeId == null || employeeId.isBlank()) {
            return null;
        }
        return "https://www.iare.ac.in/sites/default/files/" + employeeId.trim() + "_0.png";
    }

    private static class PendingStudentUploadRow {
        private final int rowIndex;
        private final String username;
        private final String normalizedUsername;
        private final String rollNo;
        private final String normalizedRollNo;
        private final String email;
        private final String normalizedEmail;
        private final User user;
        private final Student student;

        private PendingStudentUploadRow(
                int rowIndex,
                String username,
                String normalizedUsername,
                String rollNo,
                String normalizedRollNo,
                String email,
                String normalizedEmail,
                User user,
                Student student
        ) {
            this.rowIndex = rowIndex;
            this.username = username;
            this.normalizedUsername = normalizedUsername;
            this.rollNo = rollNo;
            this.normalizedRollNo = normalizedRollNo;
            this.email = email;
            this.normalizedEmail = normalizedEmail;
            this.user = user;
            this.student = student;
        }
    }
}
