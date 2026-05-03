package com.college.hod.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestSummaryResponse {
    private long totalCount;
    private long pendingCount;
    private long approvedCount;
    private long rejectedCount;
    private long certificatePendingCount;
    private long assignedStudentsCount;
}
