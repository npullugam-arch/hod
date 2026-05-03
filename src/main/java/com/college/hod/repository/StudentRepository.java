package com.college.hod.repository;

import com.college.hod.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {

    List<Student> findByHodId(Long hodId);

    List<Student> findByHod_DepartmentIgnoreCase(String department);

    List<Student> findByBranchIgnoreCase(String branch);

    Optional<Student> findByUserId(Long userId);

    Optional<Student> findByRollNo(String rollNo);

    boolean existsByRollNo(String rollNo);

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