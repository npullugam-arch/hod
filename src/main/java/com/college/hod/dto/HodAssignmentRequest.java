package com.college.hod.dto;

import lombok.Data;

@Data
public class HodAssignmentRequest {
    private Long hodId;
    private String department;
    private Integer sem;
    private String section;
}