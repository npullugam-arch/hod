package com.college.hod.dto;

import lombok.Data;

@Data
public class SemesterPromotionRequest {
    private Integer currentSemester;
    private Integer newSemester;
}
