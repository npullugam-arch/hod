package com.college.hod.service.impl;

import com.college.hod.entity.Notification;
import com.college.hod.entity.Request;
import com.college.hod.entity.Student;
import com.college.hod.entity.User;
import com.college.hod.enums.RequestStatus;
import com.college.hod.repository.NotificationRepository;
import com.college.hod.repository.RequestRepository;
import com.college.hod.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.net.ConnectException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Set<String> CERTIFICATE_REQUIRED_REASONS = Set.of(
            "HACKATHON",
            "SEMINAR",
            "MEDICAL LEAVE",
            "SPORTS EVENT",
            "WORKSHOP / TRAINING",
            "INTERNSHIP"
    );

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Override
    public void sendNotification(User user, String message) {
        sendNotification(user, message, null);
    }

    @Override
    public void sendNotification(User user, String message, Long relatedRequestId) {
        if (user == null) {
            throw new RuntimeException("User is required");
        }

        if (message == null || message.trim().isEmpty()) {
            throw new RuntimeException("Notification message is required");
        }

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setMessage(message.trim());
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRelatedRequestId(relatedRequestId);

        notificationRepository.save(notification);
    }

    @Override
    public void sendReminderForRequest(Long requestId) {
        Request request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        LocalDate today = LocalDate.now();

        if (request.getStatus() != RequestStatus.APPROVED) {
            throw new RuntimeException("Reminder can be sent only for approved requests");
        }

        if (!isCertificateRequired(request.getReason())) {
            throw new RuntimeException("This request reason does not require a certificate");
        }

        if (request.getCertificate() != null &&
                request.getCertificate().getFilePath() != null &&
                !request.getCertificate().getFilePath().isBlank()) {
            throw new RuntimeException("Certificate already submitted for this request");
        }

        if (request.getEndDate() == null) {
            throw new RuntimeException("Event end date is not available for this request");
        }

        if (request.getCertificateDueDate() == null) {
            throw new RuntimeException("Certificate due date is not available for this request");
        }

        if (today.isBefore(request.getEndDate())) {
            throw new RuntimeException("Reminder can be sent only after the event end date");
        }

        if (today.isAfter(request.getCertificateDueDate())) {
            throw new RuntimeException("Reminder cannot be sent after the certificate deadline");
        }

        Student student = request.getStudent();
        if (student == null || student.getUser() == null) {
            throw new RuntimeException("Student user not found for this request");
        }

        User studentUser = student.getUser();

        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay().minusNanos(1);

        boolean alreadySentToday = notificationRepository.existsByUserIdAndRelatedRequestIdAndCreatedAtBetween(
                studentUser.getId(),
                request.getId(),
                startOfDay,
                endOfDay
        );

        if (alreadySentToday) {
            throw new RuntimeException("Reminder already sent today for this request");
        }

        String studentName = (student.getName() != null && !student.getName().isBlank())
                ? student.getName()
                : studentUser.getUsername();

        String studentEmail = getStudentEmail(student, studentUser);

        if (studentEmail == null || studentEmail.isBlank()) {
            throw new RuntimeException("Student email is not available");
        }

        if (!isValidEmail(studentEmail)) {
            throw new RuntimeException("Student email is invalid in database: " + studentEmail);
        }

        String reasonText = request.getReason() != null ? request.getReason() : "your approved request";
        String dueDateText = request.getCertificateDueDate().toString();

        String emailSubject = "Reminder for Certificate Submission";

        String emailBody = "Dear " + studentName + ",\n\n"
                + "We hope you are doing well.\n\n"
                + "This is a reminder that you have not yet submitted the certificate for your approved request related to "
                + reasonText + ".\n\n"
                + "Kindly upload the required certificate on or before " + dueDateText
                + " to complete the verification process.\n\n"
                + "If you have already submitted it, please ignore this email.\n\n"
                + "Regards,\n"
                + "HOD Office\n"
                + "SANCHARA PORTAL";

        sendEmail(studentEmail, emailSubject, emailBody);

        String notificationMessage = "Dear " + studentName + ", your approved request for " + reasonText +
                " is in the certificate submission period ending on " + dueDateText + ". " +
                "You have not uploaded the required certificate yet. " +
                "Please upload the certificate as soon as possible.";

        sendNotification(studentUser, notificationMessage, request.getId());
    }

    @Override
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    @Override
    public Notification markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    private String getStudentEmail(Student student, User studentUser) {
        if (student.getEmail() != null && !student.getEmail().trim().isEmpty()) {
            return student.getEmail().trim();
        }

        if (studentUser.getEmail() != null && !studentUser.getEmail().trim().isEmpty()) {
            return studentUser.getEmail().trim();
        }

        return null;
    }

    private boolean isValidEmail(String email) {
        return EMAIL_PATTERN.matcher(email).matches();
    }

    private void sendEmail(String toEmail, String subject, String body) {
        if (fromEmail == null || fromEmail.isBlank()) {
            throw new RuntimeException("MAIL_USERNAME is missing in environment variables");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail.trim());
        message.setTo(toEmail.trim());
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
        } catch (MailException e) {
            if (shouldRetryWithSslFallback(e)) {
                sendEmailUsingSslFallback(message);
                return;
            }

            Throwable root = e;
            while (root.getCause() != null) {
                root = root.getCause();
            }

            throw new RuntimeException(
                    "Failed to send reminder email: " + e.getMessage()
                            + " | Root cause: " + root.getClass().getSimpleName()
                            + " - " + root.getMessage()
            );
        } catch (Exception e) {
            if (shouldRetryWithSslFallback(e)) {
                sendEmailUsingSslFallback(message);
                return;
            }

            Throwable root = e;
            while (root.getCause() != null) {
                root = root.getCause();
            }

            throw new RuntimeException(
                    "Failed to send reminder email: " + e.getMessage()
                            + " | Root cause: " + root.getClass().getSimpleName()
                            + " - " + root.getMessage()
            );
        }
    }

    private void sendEmailUsingSslFallback(SimpleMailMessage message) {
        if (mailPassword == null || mailPassword.isBlank()) {
            throw new RuntimeException("MAIL_PASSWORD is missing in environment variables");
        }

        try {
            JavaMailSenderImpl fallbackSender = new JavaMailSenderImpl();
            fallbackSender.setHost("smtp.gmail.com");
            fallbackSender.setPort(587);
            fallbackSender.setUsername(fromEmail.trim());
            fallbackSender.setPassword(mailPassword);
            fallbackSender.setProtocol("smtp");
            fallbackSender.setDefaultEncoding("UTF-8");

            Properties properties = fallbackSender.getJavaMailProperties();
            properties.put("mail.smtp.auth", "true");
            properties.put("mail.smtp.ssl.enable", "true");
            properties.put("mail.smtp.starttls.enable", "false");
            properties.put("mail.smtp.connectiontimeout", "60000");
            properties.put("mail.smtp.timeout", "60000");
            properties.put("mail.smtp.writetimeout", "60000");
            properties.put("mail.smtp.ssl.trust", "smtp.gmail.com");
            properties.put("mail.smtp.quitwait", "false");

            fallbackSender.send(message);
        } catch (MailException e) {
            Throwable root = e;
            while (root.getCause() != null) {
                root = root.getCause();
            }

            throw new RuntimeException(
                    "Failed to send reminder email: " + e.getMessage()
                            + " | Root cause: " + root.getClass().getSimpleName()
                            + " - " + root.getMessage()
            );
        }
    }

    private boolean shouldRetryWithSslFallback(Throwable throwable) {
        Throwable current = throwable;

        while (current != null) {
            if (current instanceof java.net.SocketTimeoutException || current instanceof ConnectException) {
                return true;
            }

            String message = current.getMessage();
            String className = current.getClass().getName();

            if ((message != null && message.contains("Couldn't connect to host, port: smtp.gmail.com, 587"))
                    || className.contains("MailConnectException")) {
                return true;
            }

            current = current.getCause();
        }

        return false;
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
}
