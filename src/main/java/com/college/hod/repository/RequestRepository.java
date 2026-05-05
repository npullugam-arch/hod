package com.college.hod.repository;

import com.college.hod.dto.CertificateTrackingListItem;
import com.college.hod.dto.PendingRequestListItem;
import com.college.hod.dto.StudentCertificatePendingItem;
import com.college.hod.entity.Request;
import com.college.hod.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

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

    long countByHodId(Long hodId);

    long countByHodIdAndStatus(Long hodId, RequestStatus status);

    @Query("""
        SELECT COUNT(r)
        FROM Request r
        LEFT JOIN r.certificate c
        WHERE r.hod.id = :hodId
          AND r.status = com.college.hod.enums.RequestStatus.APPROVED
          AND UPPER(TRIM(r.reason)) IN :certificateReasons
          AND (c IS NULL OR c.filePath IS NULL OR c.filePath = '')
    """)
    long countCertificatePendingByHodId(
            @Param("hodId") Long hodId,
            @Param("certificateReasons") Set<String> certificateReasons
    );

    long countByStudentId(Long studentId);

    long countByStudentIdAndStatus(Long studentId, RequestStatus status);

    @Query("""
        SELECT COUNT(r)
        FROM Request r
        LEFT JOIN r.certificate c
        WHERE r.student.id = :studentId
          AND r.status = com.college.hod.enums.RequestStatus.APPROVED
          AND UPPER(TRIM(r.reason)) IN :certificateReasons
          AND (c IS NULL OR c.filePath IS NULL OR c.filePath = '')
    """)
    long countCertificatePendingByStudentId(
            @Param("studentId") Long studentId,
            @Param("certificateReasons") Set<String> certificateReasons
    );

    @Query("""
        SELECT new com.college.hod.dto.PendingRequestListItem(
            r.id,
            r.reason,
            r.description,
            r.startDate,
            r.endDate,
            r.requestDate,
            s.id,
            s.name,
            s.rollNo,
            s.email,
            s.branch,
            s.section,
            s.sec,
            s.sem,
            s.gender,
            s.dateOfBirth,
            s.studentPhoneNumber,
            s.parentPhoneNumber,
            s.fatherName,
            s.admissionType,
            s.caste,
            CASE
                WHEN s.rollNo IS NULL OR TRIM(s.rollNo) = '' THEN ''
                ELSE CONCAT(
                    'https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/',
                    UPPER(REPLACE(TRIM(s.rollNo), ' ', '')),
                    '/',
                    UPPER(REPLACE(TRIM(s.rollNo), ' ', '')),
                    '.jpg'
                )
            END
        )
        FROM Request r
        JOIN r.student s
        WHERE r.hod.id = :hodId
          AND r.status = com.college.hod.enums.RequestStatus.PENDING
    """)
    Page<PendingRequestListItem> findPendingRequestPageByHodId(
            @Param("hodId") Long hodId,
            Pageable pageable
    );

    @Query("""
        SELECT new com.college.hod.dto.CertificateTrackingListItem(
            r.id,
            r.reason,
            r.endDate,
            r.requestDate,
            r.certificateDueDate,
            c.id,
            c.filePath,
            c.status,
            c.rejectionRemark,
            s.id,
            s.name,
            s.rollNo,
            s.email,
            s.branch,
            s.section,
            s.sec,
            s.sem,
            s.gender,
            s.dateOfBirth,
            s.studentPhoneNumber,
            s.parentPhoneNumber,
            s.fatherName,
            s.admissionType,
            s.caste,
            CASE
                WHEN s.rollNo IS NULL OR TRIM(s.rollNo) = '' THEN ''
                ELSE CONCAT(
                    'https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/',
                    UPPER(REPLACE(TRIM(s.rollNo), ' ', '')),
                    '/',
                    UPPER(REPLACE(TRIM(s.rollNo), ' ', '')),
                    '.jpg'
                )
            END
        )
        FROM Request r
        JOIN r.student s
        LEFT JOIN r.certificate c
        WHERE r.hod.id = :hodId
          AND r.status = com.college.hod.enums.RequestStatus.APPROVED
          AND UPPER(TRIM(r.reason)) IN :certificateReasons
          AND (:search = '' OR
            LOWER(COALESCE(s.name, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.rollNo, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(r.reason, '')) LIKE LOWER(CONCAT('%', :search, '%'))
          )
    """)
    Page<CertificateTrackingListItem> findCertificateTrackingPageByHodId(
            @Param("hodId") Long hodId,
            @Param("certificateReasons") Set<String> certificateReasons,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("""
        SELECT new com.college.hod.dto.StudentCertificatePendingItem(
            r.id,
            r.reason,
            r.endDate,
            r.certificateDueDate,
            h.username,
            h.username
        )
        FROM Request r
        LEFT JOIN r.certificate c
        LEFT JOIN r.hod h
        WHERE r.student.id = :studentId
          AND r.status = com.college.hod.enums.RequestStatus.APPROVED
          AND UPPER(TRIM(r.reason)) IN :certificateReasons
          AND (c IS NULL OR c.filePath IS NULL OR c.filePath = '')
        ORDER BY r.certificateDueDate ASC, r.id DESC
    """)
    List<StudentCertificatePendingItem> findStudentCertificatePendingItems(
            @Param("studentId") Long studentId,
            @Param("certificateReasons") Set<String> certificateReasons
    );

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
