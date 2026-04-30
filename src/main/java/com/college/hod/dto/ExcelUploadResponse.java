package com.college.hod.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExcelUploadResponse {
    private int totalRows;
    private int successCount;
    private int failedCount;
    private List<String> errors = new ArrayList<>();
}