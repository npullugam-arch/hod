package com.college.hod.controller;

import com.college.hod.dto.AdminHodUpdateRequest;
import com.college.hod.dto.AdminPasswordUpdateRequest;
import com.college.hod.dto.AdminStudentCreateRequest;
import com.college.hod.dto.AdminStudentPasswordUpdateRequest;
import com.college.hod.dto.AdminStudentUpdateRequest;
import com.college.hod.dto.ExcelUploadResponse;
import com.college.hod.dto.HodAssignmentRequest;
import com.college.hod.dto.SemesterPromotionRequest;
import com.college.hod.entity.Hod;
import com.college.hod.entity.Student;
import com.college.hod.service.AdminService;
import com.college.hod.service.HodAssignmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private HodAssignmentService hodAssignmentService;

    @GetMapping("/hods")
    public ResponseEntity<?> getAllHods() {
        return ResponseEntity.ok(adminService.getAllHods());
    }

    @PutMapping("/update-password")
    public ResponseEntity<?> updateAdminPassword(@RequestBody AdminPasswordUpdateRequest request) {
        try {
            adminService.updateAdminPassword(request);
            return ResponseEntity.ok("Admin password updated successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/hod/{hodId}")
    public ResponseEntity<?> getHodById(@PathVariable Long hodId) {
        try {
            return ResponseEntity.ok(adminService.getHodById(hodId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/hod/{hodId}")
    public ResponseEntity<?> updateHodDetails(
            @PathVariable Long hodId,
            @RequestBody AdminHodUpdateRequest request
    ) {
        try {
            Hod updatedHod = adminService.updateHodDetails(hodId, request);
            return ResponseEntity.ok(updatedHod);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/hod/{hodId}/password")
    public ResponseEntity<?> getHodPassword(@PathVariable Long hodId) {
        try {
            return ResponseEntity.ok(adminService.getHodPassword(hodId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/hod/{hodId}/password")
    public ResponseEntity<?> updateHodPassword(
            @PathVariable Long hodId,
            @RequestBody AdminStudentPasswordUpdateRequest request
    ) {
        try {
            adminService.updateHodPassword(hodId, request);
            return ResponseEntity.ok("HOD password updated successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping(value = "/hod/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadHodsExcel(@RequestParam("file") MultipartFile file) {
        try {
            ExcelUploadResponse response = adminService.uploadHodsExcel(file);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/student/create")
    public ResponseEntity<?> createStudent(@RequestBody AdminStudentCreateRequest request) {
        try {
            Student savedStudent = adminService.createStudent(request);
            return ResponseEntity.ok(savedStudent);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping(value = "/student/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadStudentsExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("hodId") Long hodId
    ) {
        try {
            ExcelUploadResponse response = adminService.uploadStudentsExcel(file, hodId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/students")
    public ResponseEntity<?> getStudents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) Integer sem,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) String sec,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        try {
            String effectiveSec = sec != null && !sec.trim().isEmpty() ? sec : section;
            return ResponseEntity.ok(adminService.getStudentsPage(
                    page,
                    size,
                    search,
                    branch,
                    sem,
                    effectiveSec,
                    sortBy,
                    sortDir
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getStudentById(@PathVariable Long studentId) {
        try {
            return ResponseEntity.ok(adminService.getStudentById(studentId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/student/{studentId}")
    public ResponseEntity<?> updateStudentDetails(
            @PathVariable Long studentId,
            @RequestBody AdminStudentUpdateRequest request
    ) {
        try {
            Student updatedStudent = adminService.updateStudentDetails(studentId, request);
            return ResponseEntity.ok(updatedStudent);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/student/{studentId}/password")
    public ResponseEntity<?> getStudentPassword(@PathVariable Long studentId) {
        try {
            return ResponseEntity.ok(adminService.getStudentPassword(studentId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/student/{studentId}/password")
    public ResponseEntity<?> updateStudentPassword(
            @PathVariable Long studentId,
            @RequestBody AdminStudentPasswordUpdateRequest request
    ) {
        try {
            adminService.updateStudentPassword(studentId, request);
            return ResponseEntity.ok("Student password updated successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/promote-semester")
    public ResponseEntity<?> promoteSemester(@RequestBody SemesterPromotionRequest request) {
        try {
            return ResponseEntity.ok(adminService.promoteSemester(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ================= HOD ASSIGNMENT APIs =================

    @PostMapping("/hod-assignment")
    public ResponseEntity<?> assignHodSection(@RequestBody HodAssignmentRequest request) {
        try {
            return ResponseEntity.ok(hodAssignmentService.assignSection(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/hod-assignment")
    public ResponseEntity<?> getAllHodAssignments() {
        try {
            return ResponseEntity.ok(hodAssignmentService.getAllAssignments());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/hod-assignment/{hodId}")
    public ResponseEntity<?> getAssignmentsByHod(@PathVariable Long hodId) {
        try {
            return ResponseEntity.ok(hodAssignmentService.getAssignmentsByHod(hodId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/hod-assignment/{assignmentId}")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long assignmentId) {
        try {
            hodAssignmentService.deleteAssignment(assignmentId);
            return ResponseEntity.ok("Assignment deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
