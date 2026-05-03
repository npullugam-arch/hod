package com.college.hod.controller;

import com.college.hod.entity.Student;
import com.college.hod.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URL;
import java.util.List;

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

    @GetMapping("/hod/{hodId}")
    public List<Student> getStudentsByHod(@PathVariable Long hodId) {
        return studentService.getStudentsByHod(hodId);
    }

    @GetMapping("/photo/{rollNo}")
    public ResponseEntity<byte[]> getStudentPhoto(@PathVariable String rollNo) {
        try {
            String cleanRollNo = rollNo.trim().toUpperCase();

            String imageUrl = "https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/"
                    + cleanRollNo + "/" + cleanRollNo + ".jpg";

            URL url = new URL(imageUrl);
            byte[] imageBytes = url.openStream().readAllBytes();

            return ResponseEntity.ok()
                    .header("Content-Type", "image/jpeg")
                    .body(imageBytes);

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}