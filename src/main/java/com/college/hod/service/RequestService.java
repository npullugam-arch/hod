package com.college.hod.service;

import com.college.hod.entity.Request;
import com.college.hod.entity.User;

import java.util.List;

public interface RequestService {

    Request createRequest(Request request);

    Request approveRequest(Long requestId);

    Request rejectRequest(Long requestId, String remark);

    List<Request> getAllRequests();

    List<Request> getRequestsByStudent(Long studentId);

    List<Request> getRequestsByHod(Long hodId);

    List<Request> getPendingRequests(Long hodId);

    List<User> getAllHods();
}
