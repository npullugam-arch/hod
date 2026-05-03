package com.college.hod.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminStudentListItem {
    private Long id;
    private String name;
    private String rollNo;
    private String branch;
    private String section;
    private String sec;
    private Integer sem;
    private String studentPhoneNumber;
    private String email;
    private String photoUrl;
}
