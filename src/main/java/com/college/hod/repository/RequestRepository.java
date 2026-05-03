package com.college.hod.repository;

import com.college.hod.entity.Request;
import com.college.hod.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RequestRepository extends JpaRepository<Request, Long> {

    @Query("""
        SELECT DISTINCT r
        FROM Request r
        LEFT JOIN FETCH r.certificate c
        LEFT JOIN FETCH r.student s
        LEFT JOIN FETCH r.hod h
        ORDER BY r.id DESC
    """)
    List<Request> findAllWithDetails();

    List<Request> findByStudentId(Long studentId);

    List<Request> findByHodId(Long hodId);

    List<Request> findByHodIdAndStatus(Long hodId, RequestStatus status);

    @Query("""
        SELECT DISTINCT r
        FROM Request r
        LEFT JOIN FETCH r.certificate c
        LEFT JOIN FETCH r.student s
        LEFT JOIN FETCH r.hod h
        WHERE
            s.id = :studentId
            OR s.user.id = :userId
            OR (:rollNo IS NOT NULL AND LOWER(s.rollNo) = LOWER(:rollNo))
            OR (:email IS NOT NULL AND LOWER(s.email) = LOWER(:email))
        ORDER BY r.id DESC
    """)
    List<Request> findCompleteHistoryByStudent(
            @Param("studentId") Long studentId,
            @Param("userId") Long userId,
            @Param("rollNo") String rollNo,
            @Param("email") String email
    );
}
