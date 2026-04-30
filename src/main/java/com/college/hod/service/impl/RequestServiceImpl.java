package com.college.hod.service.impl;

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
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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

        Student student = resolveStudent(request.getStudent().getId());

        request.setReason(request.getReason().trim());
        request.setStudent(student);
        request.setHod(hodUser);
        request.setStatus(RequestStatus.PENDING);
        request.setRequestDate(LocalDate.now());
        request.setApprovalDate(null);
        request.setCertificateDueDate(null);
        request.setRejectionRemark(null);

        return requestRepository.save(request);
    }

    @Override
    public Request approveRequest(Long requestId) {
        Request req = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        req.setStatus(RequestStatus.APPROVED);
        req.setApprovalDate(LocalDate.now());
        req.setRejectionRemark(null);

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

        req.setStatus(RequestStatus.REJECTED);
        req.setRejectionRemark(remark.trim());
        req.setCertificateDueDate(null);

        return requestRepository.save(req);
    }

    @Override
    public List<Request> getRequestsByStudent(Long studentId) {
        Student student = resolveStudent(studentId);
        return requestRepository.findByStudentId(student.getId());
    }

    @Override
    public List<Request> getRequestsByHod(Long hodId) {
        return requestRepository.findByHodId(hodId);
    }

    @Override
    public List<Request> getPendingRequests(Long hodId) {
        return requestRepository.findByHodIdAndStatus(hodId, RequestStatus.PENDING);
    }

    @Override
    public List<User> getAllHods() {
        return userRepository.findByRole(Role.HOD);
    }

    private Student resolveStudent(Long studentOrUserId) {
        return studentRepository.findByUserId(studentOrUserId)
                .or(() -> studentRepository.findById(studentOrUserId))
                .orElseGet(() -> createStudentFromUser(studentOrUserId));
    }

    private Student createStudentFromUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        if (user.getRole() != Role.STUDENT) {
            throw new RuntimeException("Student not found");
        }

        Student student = new Student();
        student.setName(user.getUsername());
        student.setEmail(user.getUsername());
        student.setUser(user);

        return studentRepository.save(student);
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
}