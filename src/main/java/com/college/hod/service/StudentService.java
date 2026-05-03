package com.college.hod.service;

import com.college.hod.entity.Student;
import java.util.List;

public interface StudentService {

    Student getStudentById(Long id);

    Student getStudentByUserId(Long userId);

    List<Student> getStudentsByHod(Long hodId);
}