package com.college.hod.repository;

import com.college.hod.entity.Hod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HodRepository extends JpaRepository<Hod, Long> {

    Optional<Hod> findByEmployeeId(String employeeId);

    Optional<Hod> findByUser_Id(Long userId);

    boolean existsByEmployeeId(String employeeId);
}
