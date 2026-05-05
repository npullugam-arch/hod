package com.college.hod.service;

public interface ResendEmailService {

    void sendEmail(String toEmail, String subject, String htmlBody);
}
