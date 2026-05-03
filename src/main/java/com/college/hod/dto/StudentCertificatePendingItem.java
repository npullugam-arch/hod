package com.college.hod.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentCertificatePendingItem {
    private Long requestId;
    private String reason;
    private LocalDate endDate;
    private LocalDate certificateDueDate;
    private String hodUsername;
    private String hodName;
}
