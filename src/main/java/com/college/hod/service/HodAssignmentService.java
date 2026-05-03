package com.college.hod.service;

import com.college.hod.dto.HodAssignmentRequest;
import com.college.hod.entity.Hod;
import com.college.hod.entity.HodAssignment;
import com.college.hod.repository.HodAssignmentRepository;
import com.college.hod.repository.HodRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HodAssignmentService {

    @Autowired
    private HodAssignmentRepository assignmentRepository;

    @Autowired
    private HodRepository hodRepository;

    public HodAssignment assignSection(HodAssignmentRequest request) {

        if (assignmentRepository.existsByHodIdAndDepartmentIgnoreCaseAndSemAndSectionIgnoreCase(
                request.getHodId(),
                request.getDepartment(),
                request.getSem(),
                request.getSection()
        )) {
            throw new RuntimeException("This section is already assigned to this HOD");
        }

        Hod hod = hodRepository.findById(request.getHodId())
                .orElseThrow(() -> new RuntimeException("HOD not found"));

        HodAssignment assignment = new HodAssignment();
        assignment.setHod(hod);
        assignment.setDepartment(request.getDepartment());
        assignment.setSem(request.getSem());
        assignment.setSection(request.getSection());

        return assignmentRepository.save(assignment);
    }

    public List<HodAssignment> getAssignmentsByHod(Long hodId) {
        return assignmentRepository.findByHodId(hodId);
    }

    public List<HodAssignment> getAllAssignments() {
        return assignmentRepository.findAll();
    }

    public void deleteAssignment(Long id) {
        assignmentRepository.deleteById(id);
    }
}