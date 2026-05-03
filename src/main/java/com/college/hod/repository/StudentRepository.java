package com.college.hod.repository;

import com.college.hod.dto.AdminStudentListItem;
import com.college.hod.dto.HodStudentListItem;
import com.college.hod.entity.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface StudentRepository extends JpaRepository<Student, Long> {

    List<Student> findByHodId(Long hodId);

    List<Student> findByHod_DepartmentIgnoreCase(String department);

    List<Student> findByBranchIgnoreCase(String branch);

    Optional<Student> findByUserId(Long userId);

    Optional<Student> findByRollNo(String rollNo);

    boolean existsByRollNo(String rollNo);

    @Query("""
        SELECT new com.college.hod.dto.AdminStudentListItem(
            s.id,
            s.name,
            s.rollNo,
            s.branch,
            s.section,
            s.sec,
            s.sem,
            s.studentPhoneNumber,
            s.email,
            s.photoUrl
        )
        FROM Student s
        WHERE (:search = '' OR
            LOWER(COALESCE(s.name, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.rollNo, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.email, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.branch, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.section, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.sec, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.studentPhoneNumber, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            STR(s.sem) LIKE CONCAT('%', :search, '%')
        )
        AND (:branch = '' OR LOWER(COALESCE(s.branch, '')) = LOWER(:branch))
        AND (:sem IS NULL OR s.sem = :sem)
        AND (:sec = '' OR LOWER(COALESCE(s.section, '')) = LOWER(:sec) OR LOWER(COALESCE(s.sec, '')) = LOWER(:sec))
    """)
    Page<AdminStudentListItem> findAdminStudentCards(
            @Param("search") String search,
            @Param("branch") String branch,
            @Param("sem") Integer sem,
            @Param("sec") String sec,
            Pageable pageable
    );

    @Query("SELECT LOWER(s.rollNo) FROM Student s WHERE LOWER(s.rollNo) IN :rollNos")
    Set<String> findExistingRollNos(@Param("rollNos") Set<String> rollNos);

    @Query("""
        SELECT new com.college.hod.dto.HodStudentListItem(
            s.id,
            s.name,
            s.rollNo,
            s.branch,
            s.section,
            s.sec,
            s.sem,
            s.studentPhoneNumber,
            s.email,
            s.photoUrl
        )
        FROM Student s
        WHERE EXISTS (
            SELECT a FROM HodAssignment a
            WHERE a.hod.id = :hodId
            AND LOWER(a.department) = LOWER(s.branch)
            AND a.sem = s.sem
            AND LOWER(a.section) = LOWER(s.sec)
        )
        AND (:search = '' OR
            LOWER(COALESCE(s.name, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.rollNo, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.email, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.branch, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.section, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.sec, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(COALESCE(s.studentPhoneNumber, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
            STR(s.sem) LIKE CONCAT('%', :search, '%')
        )
        AND (:branch = '' OR LOWER(COALESCE(s.branch, '')) = LOWER(:branch))
        AND (:sem IS NULL OR s.sem = :sem)
        AND (:sec = '' OR LOWER(COALESCE(s.section, '')) = LOWER(:sec) OR LOWER(COALESCE(s.sec, '')) = LOWER(:sec))
    """)
    Page<HodStudentListItem> findStudentsByHodAssignmentsPage(
            @Param("hodId") Long hodId,
            @Param("search") String search,
            @Param("branch") String branch,
            @Param("sem") Integer sem,
            @Param("sec") String sec,
            Pageable pageable
    );

    @Query("""
        SELECT COUNT(s)
        FROM Student s
        WHERE EXISTS (
            SELECT a FROM HodAssignment a
            WHERE a.hod.id = :hodId
            AND LOWER(a.department) = LOWER(s.branch)
            AND a.sem = s.sem
            AND LOWER(a.section) = LOWER(s.sec)
        )
    """)
    long countStudentsByHodAssignments(@Param("hodId") Long hodId);

    @Query("""
        SELECT s FROM Student s
        WHERE EXISTS (
            SELECT a FROM HodAssignment a
            WHERE a.hod.id = :hodId
            AND LOWER(a.department) = LOWER(s.branch)
            AND a.sem = s.sem
            AND LOWER(a.section) = LOWER(s.sec)
        )
    """)
    List<Student> findStudentsByHodAssignments(@Param("hodId") Long hodId);
}
