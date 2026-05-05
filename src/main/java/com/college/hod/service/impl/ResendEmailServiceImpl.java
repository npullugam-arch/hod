package com.college.hod.service.impl;

import com.college.hod.service.ResendEmailService;
import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ResendEmailServiceImpl implements ResendEmailService {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailServiceImpl.class);

    private final String apiKey;
    private final String fromEmail;

    public ResendEmailServiceImpl(
            @Value("${resend.api-key:}") String apiKey,
            @Value("${resend.from-email:Sanchara Portal <onboarding@resend.dev>}") String fromEmail
    ) {
        this.apiKey = apiKey;
        this.fromEmail = fromEmail;
    }

    @Override
    public void sendEmail(String toEmail, String subject, String htmlBody) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            throw new RuntimeException("Student email is not available");
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("RESEND_API_KEY is missing in environment variables");
        }

        try {
            log.info("Sending reminder email via Resend to: {}", toEmail.trim());

            Resend resend = new Resend(apiKey.trim());

            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(fromEmail)
                    .to(toEmail.trim())
                    .subject(subject)
                    .html(htmlBody)
                    .build();

            CreateEmailResponse response = resend.emails().send(params);

            log.info("Reminder email sent via Resend successfully. Email id: {}", response.getId());
        } catch (Exception e) {
            throw new RuntimeException("Failed to send reminder email via Resend: " + e.getMessage(), e);
        }
    }
}
