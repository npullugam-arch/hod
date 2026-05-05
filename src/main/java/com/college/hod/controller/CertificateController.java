package com.college.hod.controller;

import com.college.hod.entity.Certificate;
import com.college.hod.service.CertificateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@RestController
@RequestMapping("/certificate")
@CrossOrigin("*")
public class CertificateController {

    @Autowired
    private CertificateService certificateService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Certificate uploadCertificate(@RequestParam Long requestId,
                                         @RequestParam("file") MultipartFile file) {
        return certificateService.uploadCertificate(requestId, file);
    }

    @PostMapping("/verify/{id}")
    public Certificate verifyCertificate(@PathVariable Long id) {
        return certificateService.verifyCertificate(id);
    }

    @PostMapping("/reject/{id}")
    public Certificate rejectCertificate(@PathVariable Long id,
                                         @RequestParam String remark) {
        return certificateService.rejectCertificate(id, remark);
    }

    @GetMapping("/view/{id}")
    public ResponseEntity<byte[]> viewCertificate(@PathVariable Long id) {
        try {
            Certificate certificate = certificateService.getCertificateById(id);

            String fileUrl = certificate.getFilePath();
            if (fileUrl == null || fileUrl.isBlank()) {
                throw new RuntimeException("Certificate file not found");
            }

            URL url = new URL(fileUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(20000);
            connection.setInstanceFollowRedirects(true);

            byte[] fileBytes;
            try (InputStream inputStream = connection.getInputStream()) {
                fileBytes = inputStream.readAllBytes();
            }

            String fileName = extractFileName(fileUrl);
            String remoteContentType = connection.getContentType();
            MediaType mediaType = resolveMediaType(remoteContentType, fileName);
            String inlineFileName = resolveInlineFileName(fileName, mediaType);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + inlineFileName + "\"")
                    .body(fileBytes);

        } catch (Exception e) {
            throw new RuntimeException("Unable to open certificate file", e);
        }
    }

    @DeleteMapping("/request/{requestId}")
    public String deleteCertificateByRequestId(@PathVariable Long requestId) {
        certificateService.deleteCertificateByRequestId(requestId);
        return "Certificate deleted successfully";
    }

    private String extractFileName(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return "certificate";
        }

        int lastSlash = fileUrl.lastIndexOf("/");
        if (lastSlash >= 0 && lastSlash < fileUrl.length() - 1) {
            return fileUrl.substring(lastSlash + 1);
        }

        return "certificate";
    }

    private MediaType resolveMediaType(String contentType, String fileName) {
        try {
            if (contentType != null && !contentType.isBlank()) {
                return MediaType.parseMediaType(contentType);
            }
        } catch (Exception ignored) {
        }

        String lower = fileName == null ? "" : fileName.toLowerCase();

        if (lower.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        }

        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }

        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }

        return MediaType.APPLICATION_OCTET_STREAM;
    }

    private String resolveInlineFileName(String fileName, MediaType mediaType) {
        String safeName = (fileName == null || fileName.isBlank()) ? "certificate" : fileName;
        String lowerName = safeName.toLowerCase();

        if (MediaType.APPLICATION_PDF.includes(mediaType) && !lowerName.endsWith(".pdf")) {
            return safeName + ".pdf";
        }

        if (MediaType.IMAGE_JPEG.includes(mediaType)
                && !lowerName.endsWith(".jpg")
                && !lowerName.endsWith(".jpeg")) {
            return safeName + ".jpg";
        }

        if (MediaType.IMAGE_PNG.includes(mediaType) && !lowerName.endsWith(".png")) {
            return safeName + ".png";
        }

        return safeName;
    }
}
