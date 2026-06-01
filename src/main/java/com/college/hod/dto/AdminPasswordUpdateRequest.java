package com.college.hod.dto;

import lombok.Data;

@Data
public class AdminPasswordUpdateRequest {
    private Long adminUserId;
    private String currentPassword;
    private String secretCode;
    private String newPassword;
    private String confirmPassword;
}
