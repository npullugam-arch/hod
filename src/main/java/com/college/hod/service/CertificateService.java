package com.college.hod.service;

import com.college.hod.entity.Certificate;
import org.springframework.web.multipart.MultipartFile;

public interface CertificateService {

    Certificate uploadCertificate(Long requestId, MultipartFile file);

    Certificate verifyCertificate(Long certificateId);

    Certificate rejectCertificate(Long certificateId, String remark);

    void deleteCertificateByRequestId(Long requestId);

    Certificate getCertificateById(Long certificateId);
}