package com.college.hod.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Hod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 500)
    private String photo;

    @Column(name = "employee_id", unique = true, length = 50)
    private String employeeId;

    private String name;
    private String department;
    private String designation;

    @Column(name = "phd_awarded", length = 50)
    private String phdAwarded;

    @Column(name = "date_of_joining", length = 30)
    private String dateOfJoining;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "email_id", length = 150)
    private String emailId;

    private String religion;

    @Column(name = "caste_category")
    private String casteCategory;

    @Column(name = "blood_group")
    private String bloodGroup;

    @Column(name = "present_flatno")
    private String presentFlatno;

    @Column(name = "present_town")
    private String presentTown;

    @Column(name = "present_district")
    private String presentDistrict;

    @Column(name = "present_state")
    private String presentState;

    @Column(name = "present_pincode", length = 20)
    private String presentPincode;

    @Column(name = "permanent_flatno")
    private String permanentFlatno;

    @Column(name = "permanent_town")
    private String permanentTown;

    @Column(name = "permanent_district")
    private String permanentDistrict;

    @Column(name = "permanent_state")
    private String permanentState;

    @Column(name = "permanent_pincode", length = 20)
    private String permanentPincode;

    @Column(name = "jntu_uid", length = 100)
    private String jntuUid;

    private String status;

    @OneToOne
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;
}