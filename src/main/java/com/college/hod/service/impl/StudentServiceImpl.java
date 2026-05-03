package com.college.hod.service.impl;

import com.college.hod.dto.HodStudentListItem;
import com.college.hod.dto.PaginatedResponse;
import com.college.hod.entity.Hod;
import com.college.hod.entity.Student;
import com.college.hod.repository.HodRepository;
import com.college.hod.repository.StudentRepository;
import com.college.hod.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentServiceImpl implements StudentService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private HodRepository hodRepository;

    @Override
    public Student getStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }

    @Override
    public Student getStudentByUserId(Long userId) {
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Student not found for user id: " + userId));
    }

    @Override
    public List<Student> getStudentsByHod(Long hodId) {

        Hod resolvedHod = resolveHod(hodId);

        return studentRepository.findStudentsByHodAssignments(resolvedHod.getId());
    }

    @Override
    public PaginatedResponse<HodStudentListItem> getStudentsPageByHod(
            Long hodId,
            int page,
            int size,
            String search,
            String branch,
            Integer sem,
            String sec
    ) {
        Hod resolvedHod = resolveHod(hodId);
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.ASC, "name")
        );

        Page<HodStudentListItem> resultPage = studentRepository.findStudentsByHodAssignmentsPage(
                resolvedHod.getId(),
                safeString(search),
                safeString(branch),
                sem,
                safeString(sec),
                pageable
        );

        return new PaginatedResponse<>(
                resultPage.getContent(),
                resultPage.getNumber(),
                resultPage.getSize(),
                resultPage.getTotalElements(),
                resultPage.getTotalPages(),
                resultPage.isLast()
        );
    }

    @Override
    public long countStudentsByHod(Long hodId) {
        Hod resolvedHod = resolveHod(hodId);
        return studentRepository.countStudentsByHodAssignments(resolvedHod.getId());
    }

    private Hod resolveHod(Long hodId) {
        return hodRepository.findById(hodId)
                .or(() -> hodRepository.findByUser_Id(hodId))
                .orElseThrow(() -> new RuntimeException("HOD not found"));
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }
}
