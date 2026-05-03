package com.college.hod.service.impl;

import com.college.hod.entity.Hod;
import com.college.hod.entity.Student;
import com.college.hod.repository.HodRepository;
import com.college.hod.repository.StudentRepository;
import com.college.hod.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
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

        Hod resolvedHod = hodRepository.findById(hodId)
                .or(() -> hodRepository.findByUser_Id(hodId))
                .orElseThrow(() -> new RuntimeException("HOD not found"));

        return studentRepository.findStudentsByHodAssignments(resolvedHod.getId());
    }
}