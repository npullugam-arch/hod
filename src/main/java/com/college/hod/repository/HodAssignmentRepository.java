package com.college.hod.repository;

import com.college.hod.entity.HodAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HodAssignmentRepository extends JpaRepository<HodAssignment, Long> {

    List<HodAssignment> findByHodId(Long hodId);

    boolean existsByHodIdAndDepartmentIgnoreCaseAndSemAndSectionIgnoreCase(
            Long hodId,
            String department,
            Integer sem,
            String section
    );
}