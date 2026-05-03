package com.college.hod.controller;

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
