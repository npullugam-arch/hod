package com.college.hod.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Table(name = "student")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Old / common fields
    @Column(length = 150)
    private String name;

    @Column(length = 150)
    private String email;

    @Column(length = 50)
    private String section;

    @Column(unique = true, length = 30)
    private String rollNo;

    @Column(length = 150)
    private String fatherName;

    @Column(length = 30)
    private String gender;

    @Column(length = 100)
    private String branch;

    private Integer deptId;
    private Integer sem;

    @Column(length = 50)
    private String sec;

    private Integer sectionId;

    @Column(length = 100)
    private String admissionType;

    @Column(length = 100)
    private String caste;

    @Column(name = "student_phone_number", length = 30)
    private String studentPhoneNumber;

    @Column(name = "parent_phone_number", length = 30)
    private String parentPhoneNumber;

    @Column(name = "date_of_birth", length = 30)
    private String dateOfBirth;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    // New Excel columns
    @Column(length = 50)
    private String studentStatus;

    @Column(length = 100)
    private String subCaste;

    @Column(length = 100)
    private String religion;

    @Column(length = 100)
    private String feeCategory;

    @Column(length = 50)
    private String cetRank;

    @Column(length = 50)
    private String sscMarks;

    @Column(length = 50)
    private String sscPercentage;

    @Column(length = 50)
    private String interMarks;

    @Column(length = 50)
    private String interPercentage;

    @Column(length = 50)
    private String ugMarks;

    @Column(length = 50)
    private String ugPercentage;

    @Column(length = 30)
    private String dateOfJoining;

    @Column(length = 150)
    private String motherName;

    @Column(length = 30)
    private String motherPhone;

    @Column(length = 500)
    private String currentAddress;

    @Column(length = 500)
    private String permanentAddress;

    @Column(length = 30)
    private String aadhar;

    @Column(length = 150)
    private String fatherOccupation;

    @Column(length = 100)
    private String occupationType;

    @Column(length = 50)
    private String income;

    @Column(length = 300)
    private String moles;

    @Column(length = 150)
    private String placeOfBirth;

    @Column(length = 100)
    private String currentDno;

    @Column(length = 150)
    private String currentStreet;

    @Column(length = 150)
    private String currentVillageTown;

    @Column(length = 150)
    private String currentMandal;

    @Column(length = 150)
    private String currentDistrict;

    @Column(length = 150)
    private String currentState;

    @Column(length = 20)
    private String currentPincode;

    @Column(length = 100)
    private String permanentDno;

    @Column(length = 150)
    private String permanentStreet;

    @Column(length = 150)
    private String permanentVillageTown;

    @Column(length = 150)
    private String permanentMandal;

    @Column(length = 150)
    private String permanentDistrict;

    @Column(length = 150)
    private String permanentState;

    @Column(length = 20)
    private String permanentPincode;

    @Column(length = 150)
    private String domicileState;

    @Column(length = 150)
    private String sscState;

    @Column(length = 150)
    private String interState;

    @OneToOne
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne
    @JoinColumn(name = "hod_id")
    @JsonIgnoreProperties({"user"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Hod hod;
}
