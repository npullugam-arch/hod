package com.college.hod.controller;

import com.college.hod.dto.CertificateTrackingListItem;
import com.college.hod.entity.Hod;
import com.college.hod.dto.PaginatedResponse;
import com.college.hod.dto.PendingRequestListItem;
import com.college.hod.dto.RequestSummaryResponse;
import com.college.hod.dto.StudentCertificatePendingItem;
import com.college.hod.entity.Request;
import com.college.hod.repository.HodRepository;
import com.college.hod.service.RequestService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/request")
@CrossOrigin(origins = "*")
public class RequestController {

    @Autowired
    private RequestService requestService;

    @Autowired
    private HodRepository hodRepository;

    @PostMapping("/create")
    public Request createRequest(@RequestBody Request request) {
        return requestService.createRequest(request);
    }

    @PutMapping("/approve/{id}")
    public Request approveRequest(@PathVariable Long id) {
        return requestService.approveRequest(id);
    }

    @PutMapping("/reject/{id}")
    public Request rejectRequest(@PathVariable Long id,
                                 @RequestParam String remark) {
        return requestService.rejectRequest(id, remark);
    }

    @GetMapping("/all")
    public List<Request> getAllRequests() {
        return requestService.getAllRequests();
    }

    @GetMapping("/student/{studentId}")
    public List<Request> getRequestsByStudent(@PathVariable Long studentId) {
        return requestService.getRequestsByStudent(studentId);
    }

    @GetMapping("/student/{studentId}/summary")
    public RequestSummaryResponse getStudentSummary(@PathVariable Long studentId) {
        return requestService.getStudentDashboardSummary(studentId);
    }

    @GetMapping("/student/{studentId}/certificate-pending")
    public List<StudentCertificatePendingItem> getStudentCertificatePending(@PathVariable Long studentId) {
        return requestService.getStudentCertificatePendingItems(studentId);
    }

    @GetMapping("/hod/{hodId}")
    public List<Request> getRequestsByHod(@PathVariable Long hodId) {
        return requestService.getRequestsByHod(hodId);
    }

    @GetMapping("/hod/{hodId}/pending")
    public PaginatedResponse<PendingRequestListItem> getPendingRequests(
            @PathVariable Long hodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return requestService.getPendingRequestsPage(hodId, page, size);
    }

    @GetMapping("/hod/{hodId}/certificate-tracking")
    public PaginatedResponse<CertificateTrackingListItem> getCertificateTracking(
            @PathVariable Long hodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        return requestService.getCertificateTrackingPage(hodId, page, size, search);
    }

    @GetMapping("/hods")
    public List<HodOptionResponse> getAllHods() {

        List<Hod> hods = hodRepository.findAll();
        List<HodOptionResponse> responseList = new ArrayList<>();

        for (Hod hod : hods) {
            if (hod.getUser() == null) {
                continue;
            }

            HodOptionResponse response = new HodOptionResponse();

            response.setId(hod.getUser().getId()); // IMPORTANT: request needs User ID
            response.setHodId(hod.getId());
            response.setEmployeeId(hod.getEmployeeId());
            response.setUsername(hod.getEmployeeId());
            response.setName(hod.getName());
            response.setDepartment(hod.getDepartment());
            response.setDesignation(hod.getDesignation());
            response.setEmail(hod.getEmailId());

            if (hod.getPhoto() != null && !hod.getPhoto().trim().isEmpty()) {
                response.setPhoto(hod.getPhoto());
            } else {
                response.setPhoto("https://www.iare.ac.in/sites/default/files/" + hod.getEmployeeId() + "_0.png");
            }

            responseList.add(response);
        }

        return responseList;
    }

    @Data
    public static class HodOptionResponse {
        private Long id;
        private Long hodId;
        private String employeeId;
        private String username;
        private String name;
        private String department;
        private String designation;
        private String email;
        private String photo;
    }
}
