package com.college.hod.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import com.college.hod.enums.RequestStatus;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "request")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Request {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String reason;
    private String description;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "request_date")
    private LocalDate requestDate;

    @Column(name = "approval_date")
    private LocalDate approvalDate;

    @Column(name = "certificate_due_date")
    private LocalDate certificateDueDate;

    @Column(name = "rejection_remark", columnDefinition = "TEXT")
    private String rejectionRemark;

    @Enumerated(EnumType.STRING)
    private RequestStatus status;

    @ManyToOne
    @JoinColumn(name = "student_id")
    @JsonIgnoreProperties({"user", "hod"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Student student;

    @ManyToOne
    @JoinColumn(name = "hod_id")
    @JsonIgnoreProperties({"password"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User hod;

    @OneToOne(mappedBy = "request")
    @JsonIgnoreProperties({"request"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Certificate certificate;
}