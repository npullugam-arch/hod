package com.college.hod.dto;

import lombok.Data;

@Data
public class AdminStudentPasswordUpdateRequest {
    private String newPassword;
    private String confirmPassword;
}