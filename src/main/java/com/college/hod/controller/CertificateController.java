package com.college.hod.controller;

import com.college.hod.entity.Certificate;
import com.college.hod.repository.CertificateRepository;
import com.college.hod.service.CertificateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/certificate")
@CrossOrigin("*")
public class CertificateController {

    @Autowired
    private CertificateService certificateService;

    @Autowired
    private CertificateRepository certificateRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    // Upload or replace certificate file
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Certificate uploadCertificate(@RequestParam Long requestId,
                                         @RequestParam("file") MultipartFile file) {

        return certificateService.uploadCertificate(requestId, file);
    }

    // Verify certificate
    @PostMapping("/verify/{id}")
    public Certificate verifyCertificate(@PathVariable Long id) {
        return certificateService.verifyCertificate(id);
    }

    // Reject certificate with remark
    @PostMapping("/reject/{id}")
    public Certificate rejectCertificate(@PathVariable Long id,
                                         @RequestParam String remark) {
        return certificateService.rejectCertificate(id, remark);
    }

    @GetMapping("/view/{id}")
    public ResponseEntity<Resource> viewCertificate(@PathVariable Long id) {
        Certificate certificate = certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

        String fileName = extractFileName(certificate.getFilePath());
        if (fileName == null || fileName.isBlank()) {
            throw new RuntimeException("Certificate file not found");
        }

        try {
            Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = uploadRoot.resolve(fileName).normalize();

            if (!filePath.startsWith(uploadRoot) || !Files.exists(filePath) || !Files.isReadable(filePath)) {
                throw new RuntimeException("Certificate file not found");
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                    .contentType(resolveMediaType(contentType, fileName))
                    .body(resource);
        } catch (MalformedURLException e) {
            throw new RuntimeException("Certificate file not found", e);
        } catch (Exception e) {
            throw new RuntimeException("Certificate file not found", e);
        }
    }

    // Delete certificate by request id
    @DeleteMapping("/request/{requestId}")
    public String deleteCertificateByRequestId(@PathVariable Long requestId) {
        certificateService.deleteCertificateByRequestId(requestId);
        return "Certificate deleted successfully";
    }

    private String extractFileName(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return null;
        }

        if (fileUrl.startsWith("/uploads/")) {
            return fileUrl.substring("/uploads/".length());
        }

        int lastSlash = fileUrl.lastIndexOf("/");
        if (lastSlash >= 0 && lastSlash < fileUrl.length() - 1) {
            return fileUrl.substring(lastSlash + 1);
        }

        return fileUrl;
    }

    private MediaType resolveMediaType(String contentType, String fileName) {
        try {
            if (contentType != null && !contentType.isBlank()) {
                return MediaType.parseMediaType(contentType);
            }
        } catch (Exception ignored) {
        }

        String lowerFileName = fileName == null ? "" : fileName.toLowerCase();
        if (lowerFileName.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        }
        if (lowerFileName.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lowerFileName.endsWith(".jpg") || lowerFileName.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }

        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
