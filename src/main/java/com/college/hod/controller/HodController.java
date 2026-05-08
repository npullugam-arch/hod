package com.college.hod.controller;

import com.college.hod.dto.HodStudentListItem;
import com.college.hod.dto.PaginatedResponse;
import com.college.hod.dto.RequestSummaryResponse;
import com.college.hod.entity.Hod;
import com.college.hod.entity.Request;
import com.college.hod.entity.Student;
import com.college.hod.service.HodService;
import com.college.hod.service.RequestService;
import com.college.hod.service.StudentService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/hod")
@CrossOrigin("*")
public class HodController {

    @Autowired
    private HodService hodService;

    @Autowired
    private RequestService requestService;

    // ✅ NEW
    @Autowired
    private StudentService studentService;

    // ------------------- HOD DETAILS -------------------
    @GetMapping("/{id}")
    public Hod getHod(@PathVariable Long id) {
        return hodService.getHodById(id);
    }

    // ------------------- STUDENTS -------------------
    // ✅ VERY IMPORTANT API (used in frontend)
    @GetMapping("/{hodId}/students")
    public List<Student> getStudents(@PathVariable Long hodId) {
        return studentService.getStudentsByHod(hodId);
    }

    @GetMapping("/{hodId}/students-page")
    public PaginatedResponse<HodStudentListItem> getStudentsPage(
            @PathVariable Long hodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String branch,
            @RequestParam(required = false) Integer sem,
            @RequestParam(defaultValue = "") String sec
    ) {
        return studentService.getStudentsPageByHod(hodId, page, size, search, branch, sem, sec);
    }

    // ------------------- REQUESTS -------------------
    @GetMapping("/{hodId}/requests")
    public List<Request> getRequests(@PathVariable Long hodId) {
        return requestService.getRequestsByHod(hodId);
    }

    @GetMapping("/{hodId}/pending")
    public List<Request> getPending(@PathVariable Long hodId) {
        return requestService.getPendingRequests(hodId);
    }

    @GetMapping("/{hodId}/dashboard-summary")
    public RequestSummaryResponse getDashboardSummary(@PathVariable Long hodId) {
        long assignedStudentsCount = studentService.countStudentsByHod(hodId);
        return requestService.getHodDashboardSummary(hodId, assignedStudentsCount);
    }
}
