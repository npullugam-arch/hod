package com.college.hod.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PendingRequestListItem {
    private Long id;
    private String reason;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate requestDate;
    private Long studentId;
    private String studentName;
    private String studentRollNo;
    private String studentEmail;
    private String studentBranch;
    private String studentSection;
    private String studentSec;
    private Integer studentSem;
    private String studentGender;
    private String studentDateOfBirth;
    private String studentPhoneNumber;
    private String parentPhoneNumber;
    private String fatherName;
    private String admissionType;
    private String caste;
    private String studentPhotoUrl;
}
