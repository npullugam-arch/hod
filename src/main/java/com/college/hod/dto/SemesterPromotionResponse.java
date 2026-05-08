package com.college.hod.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SemesterPromotionResponse {
    private int currentSemester;
    private int newSemester;
    private long updatedStudents;
    private String message;
}
