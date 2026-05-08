package com.college.hod.service.impl;

import com.college.hod.dto.CertificateTrackingListItem;
import com.college.hod.dto.PaginatedResponse;
import com.college.hod.dto.PendingRequestListItem;
import com.college.hod.dto.RequestSummaryResponse;
import com.college.hod.dto.StudentCertificatePendingItem;
import com.college.hod.entity.Request;
import com.college.hod.entity.Student;
import com.college.hod.entity.User;
import com.college.hod.enums.RequestStatus;
import com.college.hod.enums.Role;
import com.college.hod.repository.RequestRepository;
import com.college.hod.repository.StudentRepository;
import com.college.hod.repository.UserRepository;
import com.college.hod.service.RequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class RequestServiceImpl implements RequestService {

    private static final Set<String> CERTIFICATE_REQUIRED_REASONS = Set.of(
            "HACKATHON",
            "SEMINAR",
            "MEDICAL LEAVE",
            "SPORTS EVENT",
            "WORKSHOP / TRAINING",
            "INTERNSHIP"
    );

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Override
    public Request createRequest(Request request) {

        if (request.getStudent() == null || request.getStudent().getId() == null) {
            throw new RuntimeException("Student ID is required");
        }

        if (request.getHod() == null || request.getHod().getId() == null) {
            throw new RuntimeException("HOD selection is required");
        }

        if (request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new RuntimeException("Reason is required");
        }

        User hodUser = userRepository.findById(request.getHod().getId())
                .orElseThrow(() -> new RuntimeException("Selected HOD not found"));

        if (hodUser.getRole() != Role.HOD) {
            throw new RuntimeException("Selected user is not an HOD");
        }

        Student student = resolveStudentForCreate(request.getStudent());

        request.setReason(request.getReason().trim());
        request.setStudent(student);
        request.setHod(hodUser);
        request.setStatus(RequestStatus.PENDING);
        request.setRequestDate(LocalDate.now());
        request.setApprovalDate(null);
        request.setCertificateDueDate(null);
        request.setRejectionRemark(null);
        request.setHiddenFromPending(false);

        return requestRepository.save(request);
    }

    @Override
    public Request approveRequest(Long requestId) {
        Request req = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        validatePendingActionAllowed(req);
        req.setStatus(RequestStatus.APPROVED);
        req.setApprovalDate(LocalDate.now());
        req.setRejectionRemark(null);
        req.setHiddenFromPending(false);

        if (req.getEndDate() != null && isCertificateRequired(req.getReason())) {
            req.setCertificateDueDate(req.getEndDate().plusDays(3));
        } else {
            req.setCertificateDueDate(null);
        }

        return requestRepository.save(req);
    }

    @Override
    public Request rejectRequest(Long requestId, String remark) {
        Request req = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (remark == null || remark.trim().isEmpty()) {
            throw new RuntimeException("Rejection remark is required");
        }

        validatePendingActionAllowed(req);
        req.setStatus(RequestStatus.REJECTED);
        req.setRejectionRemark(remark.trim());
        req.setCertificateDueDate(null);
        req.setHiddenFromPending(false);

        return requestRepository.save(req);
    }

    @Override
    public Request clearExpiredRequest(Long requestId) {
        Request req = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        expirePendingRequestIfNeeded(req);

        if (req.getStatus() != RequestStatus.EXPIRED) {
            throw new RuntimeException("Only expired requests can be removed from pending view.");
        }

        req.setHiddenFromPending(true);
        return requestRepository.saveAndFlush(req);
    }

    @Override
    public List<Request> getAllRequests() {
        List<Request> requests = requestRepository.findAllWithDetails();
        expirePendingRequestsIfNeeded(requests);
        return requests;
    }

    @Override
    public List<Request> getRequestsByStudent(Long studentId) {
        Student student = resolveStudentForHistory(studentId);

        Long actualStudentId = student.getId();
        Long userId = student.getUser() != null ? student.getUser().getId() : null;
        String rollNo = clean(student.getRollNo());
        String email = clean(student.getEmail());

        List<Request> requests = requestRepository.findCompleteHistoryByStudent(
                actualStudentId,
                userId,
                rollNo,
                email
        );

        expirePendingRequestsIfNeeded(requests);
        return requests;
    }

    @Override
    public List<Request> getRequestsByHod(Long hodId) {
        List<Request> requests = requestRepository.findByHodId(hodId);
        expirePendingRequestsIfNeeded(requests);
        return requests;
    }

    @Override
    public List<Request> getPendingRequests(Long hodId) {
        expirePendingRequestsForHod(hodId);
        List<Request> pendingRequests = new ArrayList<>(requestRepository.findByHodIdAndStatusAndHiddenFromPendingFalse(hodId, RequestStatus.PENDING));
        pendingRequests.addAll(requestRepository.findByHodIdAndStatusAndHiddenFromPendingFalse(hodId, RequestStatus.EXPIRED));
        return pendingRequests;
    }

    @Override
    public PaginatedResponse<PendingRequestListItem> getPendingRequestsPage(Long hodId, int page, int size) {
        expirePendingRequestsForHod(hodId);

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "requestDate").and(Sort.by(Sort.Direction.DESC, "id"))
        );

        Page<PendingRequestListItem> resultPage = requestRepository.findPendingRequestPageByHodId(hodId, pageable);
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
    public PaginatedResponse<CertificateTrackingListItem> getCertificateTrackingPage(Long hodId, int page, int size, String search) {
        expirePendingRequestsForHod(hodId);

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "endDate").and(Sort.by(Sort.Direction.DESC, "id"))
        );

        Page<CertificateTrackingListItem> resultPage = requestRepository.findCertificateTrackingPageByHodId(
                hodId,
                CERTIFICATE_REQUIRED_REASONS,
                search == null ? "" : search.trim(),
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
    public RequestSummaryResponse getHodDashboardSummary(Long hodId, long assignedStudentsCount) {
        expirePendingRequestsForHod(hodId);
        long total = requestRepository.countByHodId(hodId);
        long pending = requestRepository.countByHodIdAndStatus(hodId, RequestStatus.PENDING);
        long approved = requestRepository.countByHodIdAndStatus(hodId, RequestStatus.APPROVED);
        long rejected = requestRepository.countByHodIdAndStatus(hodId, RequestStatus.REJECTED);
        long certificatePending = requestRepository.countCertificatePendingByHodId(hodId, CERTIFICATE_REQUIRED_REASONS);

        return new RequestSummaryResponse(total, pending, approved, rejected, certificatePending, assignedStudentsCount);
    }

    @Override
    public RequestSummaryResponse getStudentDashboardSummary(Long studentId) {
        Student student = resolveStudentForHistory(studentId);
        expirePendingRequestsForStudent(student.getId());
        long total = requestRepository.countByStudentId(student.getId());
        long pending = requestRepository.countByStudentIdAndStatus(student.getId(), RequestStatus.PENDING);
        long approved = requestRepository.countByStudentIdAndStatus(student.getId(), RequestStatus.APPROVED);
        long rejected = requestRepository.countByStudentIdAndStatus(student.getId(), RequestStatus.REJECTED);
        long certificatePending = requestRepository.countCertificatePendingByStudentId(student.getId(), CERTIFICATE_REQUIRED_REASONS);

        return new RequestSummaryResponse(total, pending, approved, rejected, certificatePending, 0);
    }

    @Override
    public List<StudentCertificatePendingItem> getStudentCertificatePendingItems(Long studentId) {
        Student student = resolveStudentForHistory(studentId);
        return requestRepository.findStudentCertificatePendingItems(student.getId(), CERTIFICATE_REQUIRED_REASONS);
    }

    @Override
    public List<User> getAllHods() {
        return userRepository.findByRole(Role.HOD);
    }

    private Student resolveStudentForHistory(Long studentId) {
        return studentRepository.findById(studentId)
                .or(() -> studentRepository.findByUserId(studentId))
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }

    private Student resolveStudentForCreate(Student requestStudent) {
        Long studentId = requestStudent.getId();
        Long studentUserId = requestStudent.getUser() != null ? requestStudent.getUser().getId() : null;

        if (studentUserId != null) {
            Student student = studentRepository.findById(studentId)
                    .orElseThrow(() -> new RuntimeException("Student not found"));

            Long actualUserId = student.getUser() != null ? student.getUser().getId() : null;

            if (!studentUserId.equals(actualUserId)) {
                throw new RuntimeException("Student mapping mismatch");
            }

            return student;
        }

        return studentRepository.findByUserId(studentId)
                .or(() -> studentRepository.findById(studentId))
                .orElseGet(() -> createStudentFromUser(studentId));
    }

    private Student createStudentFromUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        if (user.getRole() != Role.STUDENT) {
            throw new RuntimeException("Student not found");
        }

        Student student = new Student();
        student.setName(user.getUsername());
        student.setEmail(user.getEmail());
        student.setUser(user);

        return studentRepository.save(student);
    }

    private void validatePendingActionAllowed(Request request) {
        expirePendingRequestIfNeeded(request);

        if (request.getStatus() == RequestStatus.EXPIRED) {
            throw new RuntimeException("This permission request expired because approval was not completed before the scheduled start date.");
        }

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new RuntimeException("Only pending requests can be updated.");
        }
    }

    private void expirePendingRequestsForHod(Long hodId) {
        List<Request> expirableRequests = requestRepository.findByHodIdAndStatusAndStartDateBefore(
                hodId,
                RequestStatus.PENDING,
                LocalDate.now()
        );
        expirePendingRequestsIfNeeded(expirableRequests);
    }

    private void expirePendingRequestsForStudent(Long studentId) {
        List<Request> expirableRequests = requestRepository.findByStudentIdAndStatusAndStartDateBefore(
                studentId,
                RequestStatus.PENDING,
                LocalDate.now()
        );
        expirePendingRequestsIfNeeded(expirableRequests);
    }

    private void expirePendingRequestIfNeeded(Request request) {
        if (!shouldExpirePendingRequest(request)) {
            return;
        }

        request.setStatus(RequestStatus.EXPIRED);
        request.setHiddenFromPending(false);
        requestRepository.save(request);
    }

    @Transactional
    protected void expirePendingRequestsIfNeeded(List<Request> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }

        List<Request> expiredRequests = requests.stream()
                .filter(this::shouldExpirePendingRequest)
                .peek(request -> {
                    request.setStatus(RequestStatus.EXPIRED);
                    request.setHiddenFromPending(false);
                })
                .toList();

        if (!expiredRequests.isEmpty()) {
            requestRepository.saveAll(expiredRequests);
        }
    }

    private boolean shouldExpirePendingRequest(Request request) {
        return request != null
                && request.getStatus() == RequestStatus.PENDING
                && request.getStartDate() != null
                && LocalDate.now().isAfter(request.getStartDate());
    }

    private boolean isCertificateRequired(String reason) {
        return CERTIFICATE_REQUIRED_REASONS.contains(normalizeReason(reason));
    }

    private String normalizeReason(String reason) {
        return String.valueOf(reason == null ? "" : reason)
                .trim()
                .replaceAll("\\s+", " ")
                .toUpperCase();
    }

    private String clean(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
