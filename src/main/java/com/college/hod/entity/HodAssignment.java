package com.college.hod.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "hod_assignment")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class HodAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String department;

    private Integer sem;

    private String section;

    @ManyToOne
    @JoinColumn(name = "hod_id", nullable = false)
    @JsonIgnoreProperties({"user"})
    private Hod hod;
}