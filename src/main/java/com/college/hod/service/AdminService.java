package com.college.hod.service;

import com.college.hod.dto.AdminHodUpdateRequest;
import com.college.hod.dto.AdminStudentCreateRequest;
import com.college.hod.dto.AdminStudentPasswordUpdateRequest;
import com.college.hod.dto.AdminStudentUpdateRequest;
import com.college.hod.dto.ExcelUploadResponse;
import com.college.hod.entity.Hod;
import com.college.hod.entity.Student;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface AdminService {

    Student createStudent(AdminStudentCreateRequest request);

    ExcelUploadResponse uploadStudentsExcel(MultipartFile file, Long hodId);

    ExcelUploadResponse uploadHodsExcel(MultipartFile file);

    List<Hod> getAllHods();

    Hod getHodById(Long hodId);

    Hod updateHodDetails(Long hodId, AdminHodUpdateRequest request);

    Map<String, Object> getHodPassword(Long hodId);

    void updateHodPassword(Long hodId, AdminStudentPasswordUpdateRequest request);

    List<Student> getAllStudents(String search, String branch, String section, Integer sem);

    Student getStudentById(Long studentId);

    Student updateStudentDetails(Long studentId, AdminStudentUpdateRequest request);

    Map<String, Object> getStudentPassword(Long studentId);

    void updateStudentPassword(Long studentId, AdminStudentPasswordUpdateRequest request);
}