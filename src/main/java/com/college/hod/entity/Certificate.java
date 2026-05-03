package com.college.hod.entity;

import com.college.hod.enums.CertificateStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "certificate",
        indexes = {
                @Index(name = "idx_certificate_status", columnList = "status"),
                @Index(name = "idx_certificate_request_id", columnList = "request_id")
        }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Path where certificate file is stored
    @Column(name = "file_path")
    private String filePath;

    @Enumerated(EnumType.STRING)
    private CertificateStatus status;

    @Column(name = "rejection_remark", columnDefinition = "TEXT")
    private String rejectionRemark;

    @Column(name = "rejected_at")
    private LocalDate rejectedAt;

    // Each certificate belongs to one request
    @OneToOne
    @JoinColumn(name = "request_id")
    @JsonIgnoreProperties({"certificate", "student", "hod"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Request request;
}
