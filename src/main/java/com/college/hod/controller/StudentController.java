package com.college.hod.controller;

import com.college.hod.entity.Student;
import com.college.hod.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/student")
@CrossOrigin("*")
public class StudentController {

    @Autowired
    private StudentService studentService;

    @GetMapping("/{id}")
    public Student getStudent(@PathVariable Long id) {
        return studentService.getStudentById(id);
    }

    @GetMapping("/user/{userId}")
    public Student getStudentByUserId(@PathVariable Long userId) {
        return studentService.getStudentByUserId(userId);
    }
}