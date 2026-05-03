package com.college.hod.service;

import com.college.hod.dto.HodStudentListItem;
import com.college.hod.dto.PaginatedResponse;
import com.college.hod.entity.Student;
import java.util.List;

public interface StudentService {

    Student getStudentById(Long id);

    Student getStudentByUserId(Long userId);

    List<Student> getStudentsByHod(Long hodId);

    PaginatedResponse<HodStudentListItem> getStudentsPageByHod(
            Long hodId,
            int page,
            int size,
            String search,
            String branch,
            Integer sem,
            String sec
    );

    long countStudentsByHod(Long hodId);
}
