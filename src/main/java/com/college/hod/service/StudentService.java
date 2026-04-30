package com.college.hod.service;

import com.college.hod.entity.Student;

public interface StudentService {
    Student getStudentById(Long id);
    Student getStudentByUserId(Long userId);
}