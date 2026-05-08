package com.college.hod.service;

import com.college.hod.dto.CertificateTrackingListItem;
import com.college.hod.dto.PaginatedResponse;
import com.college.hod.dto.PendingRequestListItem;
import com.college.hod.dto.RequestSummaryResponse;
import com.college.hod.dto.StudentCertificatePendingItem;
import com.college.hod.entity.Request;
import com.college.hod.entity.User;

import java.util.List;

public interface RequestService {

    Request createRequest(Request request);

    Request approveRequest(Long requestId);

    Request rejectRequest(Long requestId, String remark);

    Request clearExpiredRequest(Long requestId);

    List<Request> getAllRequests();

    List<Request> getRequestsByStudent(Long studentId);

    List<Request> getRequestsByHod(Long hodId);

    List<Request> getPendingRequests(Long hodId);

    PaginatedResponse<PendingRequestListItem> getPendingRequestsPage(Long hodId, int page, int size);

    PaginatedResponse<CertificateTrackingListItem> getCertificateTrackingPage(Long hodId, int page, int size, String search);

    RequestSummaryResponse getHodDashboardSummary(Long hodId, long assignedStudentsCount);

    RequestSummaryResponse getStudentDashboardSummary(Long studentId);

    List<StudentCertificatePendingItem> getStudentCertificatePendingItems(Long studentId);

    List<User> getAllHods();
}
