package com.college.hod.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.college.hod.entity.Certificate;
import com.college.hod.entity.Request;
import com.college.hod.enums.CertificateStatus;
import com.college.hod.repository.CertificateRepository;
import com.college.hod.repository.RequestRepository;
import com.college.hod.service.CertificateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class CertificateServiceImpl implements CertificateService {

    private static final long MAX_FILE_SIZE = 1 * 1024 * 1024;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "pdf"
    );

    private static final Set<String> IMAGE_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png"
    );

    private static final Set<String> CERTIFICATE_REQUIRED_REASONS = Set.of(
            "HACKATHON",
            "SEMINAR",
            "MEDICAL LEAVE",
            "SPORTS EVENT",
            "WORKSHOP / TRAINING",
            "INTERNSHIP"
    );

    @Autowired
    private CertificateRepository certificateRepository;

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private Cloudinary cloudinary;

    @Override
public Certificate getCertificateById(Long certificateId) {
    return certificateRepository.findById(certificateId)
            .orElseThrow(() -> new RuntimeException("Certificate not found"));
}

    @Override
    public Certificate uploadCertificate(Long requestId, MultipartFile file) {

        Request request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (request.getStatus() == null || !request.getStatus().name().equals("APPROVED")) {
            throw new RuntimeException("Certificate can be uploaded only for approved requests");
        }

        if (!isCertificateRequired(request.getReason())) {
           
            throw new RuntimeException("Certificate upload is not allowed for this request reason");
        }

        

        validateFile(file);

        String originalFileName = file.getOriginalFilename();
        String extension = getFileExtension(originalFileName).toLowerCase(Locale.ROOT);
        String resourceType = getCloudinaryResourceType(extension);

        try {
            Certificate cert = certificateRepository.findByRequestId(requestId)
                    .orElseGet(Certificate::new);

            String safeFileName = sanitizeFileName(removeExtension(originalFileName));
            String publicId = "certificate_" + requestId + "_" + UUID.randomUUID() + "_" + safeFileName;

            Map<String, Object> uploadOptions = ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "folder", "hod-certificates",
                    "use_filename", false,
                    "unique_filename", false,
                    "overwrite", true
            );

            if ("pdf".equals(extension)) {
                uploadOptions.put("public_id", publicId + ".pdf");
            } else {
                uploadOptions.put("public_id", publicId);
            }

            Map uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    uploadOptions
            );

            String fileUrl = (String) uploadResult.get("secure_url");

            if (fileUrl == null || fileUrl.isBlank()) {
                throw new RuntimeException("Cloudinary did not return file URL");
            }

            cert.setFilePath(fileUrl);
            cert.setStatus(CertificateStatus.SUBMITTED);
            cert.setRejectionRemark(null);
            cert.setRejectedAt(null);
            cert.setRequest(request);

            Certificate savedCertificate = certificateRepository.save(cert);

            request.setCertificate(savedCertificate);
            requestRepository.save(request);

            return savedCertificate;

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to upload certificate to Cloudinary: " + e.getMessage(), e);
        }
    }

    @Override
    public Certificate verifyCertificate(Long certificateId) {

        Certificate cert = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

        cert.setStatus(CertificateStatus.VERIFIED);
        cert.setRejectionRemark(null);
        cert.setRejectedAt(null);

        return certificateRepository.save(cert);
    }

    @Override
    public Certificate rejectCertificate(Long certificateId, String remark) {

        Certificate cert = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

        if (remark == null || remark.trim().isEmpty()) {
            throw new RuntimeException("Rejection remark is required");
        }

        cert.setStatus(CertificateStatus.REJECTED);
        cert.setRejectionRemark(remark.trim());
        cert.setRejectedAt(LocalDate.now());

        return certificateRepository.save(cert);
    }

    @Override
    public void deleteCertificateByRequestId(Long requestId) {

        Request request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        Certificate cert = certificateRepository.findByRequestId(requestId)
                .orElseThrow(() -> new RuntimeException("Certificate not found for this request"));

        request.setCertificate(null);
        requestRepository.save(request);

        certificateRepository.delete(cert);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Please select a file to upload");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File size must not be more than 1 MB");
        }

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.isBlank()) {
            throw new RuntimeException("Invalid file name");
        }

        String extension = getFileExtension(originalFileName).toLowerCase(Locale.ROOT);

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new RuntimeException("Only JPG, JPEG, PNG, and PDF files are allowed");
        }
    }

    private String getCloudinaryResourceType(String extension) {
        if (IMAGE_EXTENSIONS.contains(extension)) {
            return "image";
        }

        if ("pdf".equals(extension)) {
            return "raw";
        }

        return "auto";
    }

    private boolean isCertificateRequired(String reason) {
        return CERTIFICATE_REQUIRED_REASONS.contains(normalizeReason(reason));
    }

    private String normalizeReason(String reason) {
        return String.valueOf(reason == null ? "" : reason)
                .trim()
                .replaceAll("\\s+", " ")
                .toUpperCase();
    }

    private String getFileExtension(String fileName) {
        int lastDotIndex = fileName.lastIndexOf(".");
        if (lastDotIndex == -1 || lastDotIndex == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(lastDotIndex + 1);
    }

    private String removeExtension(String fileName) {
        if (fileName == null) return "certificate";

        int lastDotIndex = fileName.lastIndexOf(".");
        if (lastDotIndex == -1) {
            return fileName;
        }

        return fileName.substring(0, lastDotIndex);
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "certificate";
        }

        return fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
