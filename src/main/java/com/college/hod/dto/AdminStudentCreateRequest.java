package com.college.hod.dto;

import lombok.Data;

@Data
public class AdminStudentCreateRequest {
    private String name;
    private String email;
    private String section;
    private String username;
    private String password;
    private Long hodId;

    private String rollNo;
    private String fatherName;
    private String gender;
    private String branch;
    private Integer deptId;
    private Integer sem;
    private String sec;
    private Integer sectionId;
    private String admissionType;
    private String caste;

    private String studentPhoneNumber;
    private String parentPhoneNumber;
    private String dateOfBirth;

    private String studentStatus;
    private String subCaste;
    private String religion;
    private String feeCategory;
    private String cetRank;
    private String sscMarks;
    private String sscPercentage;
    private String interMarks;
    private String interPercentage;
    private String ugMarks;
    private String ugPercentage;
    private String dateOfJoining;
    private String motherName;
    private String motherPhone;
    private String currentAddress;
    private String permanentAddress;
    private String aadhar;
    private String fatherOccupation;
    private String occupationType;
    private String income;
    private String moles;
    private String placeOfBirth;
    private String currentDno;
    private String currentStreet;
    private String currentVillageTown;
    private String currentMandal;
    private String currentDistrict;
    private String currentState;
    private String currentPincode;
    private String permanentDno;
    private String permanentStreet;
    private String permanentVillageTown;
    private String permanentMandal;
    private String permanentDistrict;
    private String permanentState;
    private String permanentPincode;
    private String domicileState;
    private String sscState;
    private String interState;
}
