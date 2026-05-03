package com.college.hod.controller;

import com.college.hod.dto.HodStudentListItem;
import com.college.hod.dto.PaginatedResponse;
import com.college.hod.entity.Student;
import com.college.hod.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URL;

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
    public PaginatedResponse<HodStudentListItem> getStudentsByHod(
            @PathVariable Long hodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) Integer sem,
            @RequestParam(required = false) String sec
    ) {
        return studentService.getStudentsPageByHod(hodId, page, size, search, branch, sem, sec);
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
