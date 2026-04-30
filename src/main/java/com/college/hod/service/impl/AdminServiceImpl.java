package com.college.hod.service.impl;

import com.college.hod.dto.AdminHodUpdateRequest;
import com.college.hod.dto.AdminStudentCreateRequest;
import com.college.hod.dto.AdminStudentPasswordUpdateRequest;
import com.college.hod.dto.AdminStudentUpdateRequest;
import com.college.hod.dto.ExcelUploadResponse;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

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
    public ExcelUploadResponse uploadHodsExcel(MultipartFile file) {
        throw new RuntimeException("HOD Excel upload is not implemented yet");
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
        Set<String> excelUsernames = new HashSet<>();
        Set<String> excelRollNumbers = new HashSet<>();
        Set<String> excelEmails = new HashSet<>();

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
            int successCount = 0;

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

                    if (excelUsernames.contains(username.toLowerCase())) {
                        throw new RuntimeException("Duplicate username/roll no in same Excel");
                    }

                    if (excelRollNumbers.contains(rollNo.trim().toLowerCase())) {
                        throw new RuntimeException("Duplicate roll no in same Excel");
                    }

                    if (studentEmail != null && !studentEmail.isBlank()
                            && excelEmails.contains(studentEmail.trim().toLowerCase())) {
                        throw new RuntimeException("Duplicate email in same Excel: " + studentEmail);
                    }

                    if (userRepository.existsByUsername(username)) {
                        throw new RuntimeException("Username already exists: " + username);
                    }

                    if (studentRepository.existsByRollNo(rollNo.trim())) {
                        throw new RuntimeException("Roll No already exists: " + rollNo);
                    }

                    if (studentEmail != null && !studentEmail.isBlank()
                            && userRepository.existsByEmail(studentEmail.trim())) {
                        throw new RuntimeException("Email already exists: " + studentEmail);
                    }

                    User user = new User();
                    user.setUsername(username);
                    user.setPassword(password);
                    user.setEmail(blankToNull(studentEmail));
                    user.setRole(Role.STUDENT);
                    user.setPasswordChanged(false);
                    User savedUser = userRepository.save(user);

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

                    student.setUser(savedUser);
                    student.setHod(hod);

                    studentRepository.save(student);

                    excelUsernames.add(username.toLowerCase());
                    excelRollNumbers.add(rollNo.trim().toLowerCase());

                    if (studentEmail != null && !studentEmail.isBlank()) {
                        excelEmails.add(studentEmail.trim().toLowerCase());
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
    public List<Student> getAllStudents(String search, String branch, String section, Integer sem) {
        return studentRepository.findAll()
                .stream()
                .filter(student -> matchesSearch(student, search))
                .filter(student -> matchesBranch(student, branch))
                .filter(student -> matchesSection(student, section))
                .filter(student -> matchesSem(student, sem))
                .sorted(Comparator.comparing(student -> safeValue(student.getName()).toLowerCase()))
                .collect(Collectors.toList());
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

    private boolean matchesSearch(Student student, String search) {
        String value = safeValue(search).trim().toLowerCase();
        if (value.isEmpty()) {
            return true;
        }

        return safeValue(student.getName()).toLowerCase().contains(value)
                || safeValue(student.getRollNo()).toLowerCase().contains(value)
                || safeValue(student.getBranch()).toLowerCase().contains(value)
                || safeValue(student.getSection()).toLowerCase().contains(value)
                || safeValue(student.getSec()).toLowerCase().contains(value)
                || safeValue(student.getEmail()).toLowerCase().contains(value)
                || safeValue(student.getStudentPhoneNumber()).toLowerCase().contains(value)
                || safeValue(student.getParentPhoneNumber()).toLowerCase().contains(value)
                || safeValue(student.getAadhar()).toLowerCase().contains(value);
    }

    private boolean matchesBranch(Student student, String branch) {
        String value = safeValue(branch).trim().toLowerCase();
        if (value.isEmpty()) {
            return true;
        }
        return safeValue(student.getBranch()).trim().toLowerCase().equals(value);
    }

    private boolean matchesSection(Student student, String section) {
        String value = safeValue(section).trim().toLowerCase();
        if (value.isEmpty()) {
            return true;
        }

        String studentSection = safeValue(student.getSection()).trim().toLowerCase();
        String studentSec = safeValue(student.getSec()).trim().toLowerCase();

        return studentSection.equals(value) || studentSec.equals(value);
    }

    private boolean matchesSem(Student student, Integer sem) {
        if (sem == null) {
            return true;
        }
        return Objects.equals(student.getSem(), sem);
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

    private String getCellByHeader(Row row, Map<String, Integer> headerMap, String headerName) {
        Integer index = headerMap.get(normalizeHeader(headerName));
        if (index == null || row == null) {
            return null;
        }
        return getCellString(row.getCell(index));
    }

    private String normalizeHeader(String value) {
        return value == null ? "" : value.trim().toLowerCase().replaceAll("\\s+", " ");
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
}
