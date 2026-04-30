package com.college.hod.controller;

import com.college.hod.entity.Hod;
import com.college.hod.entity.User;
import com.college.hod.repository.HodRepository;
import com.college.hod.repository.UserRepository;
import com.college.hod.service.AuthService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HodRepository hodRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        User user = authService.login(request.getUsername(), request.getPassword());

        if (user == null) {
            return ResponseEntity.badRequest().body("Invalid username or password");
        }

        LoginResponse response = new LoginResponse();

        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmployeeId(user.getUsername()); // IMPORTANT

        // 🔥 FETCH HOD DETAILS
        Optional<Hod> optionalHod = hodRepository.findByEmployeeId(user.getUsername());

        if (optionalHod.isPresent()) {
            Hod hod = optionalHod.get();

            response.setName(hod.getName());
            response.setEmail(hod.getEmailId());
            response.setDepartment(hod.getDepartment());
            response.setDesignation(hod.getDesignation());
            response.setReligion(hod.getReligion());
            response.setPresentFlatno(hod.getPresentFlatno());
            response.setPresentTown(hod.getPresentTown());
            response.setPresentState(hod.getPresentState());
            response.setPresentPincode(hod.getPresentPincode());
            response.setStatus(hod.getStatus());

        } else {
            // fallback (should not happen normally)
            response.setName(user.getUsername());
            response.setEmail(user.getEmail());
            response.setDepartment("-");
            response.setDesignation("Head of Department");
        }

        response.setRole(user.getRole());
        response.setPasswordChanged(Boolean.TRUE.equals(user.getPasswordChanged()));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/update-password")
    public ResponseEntity<?> updatePasswordPost(@RequestBody UpdatePasswordRequest request) {
        return updatePasswordLogic(request);
    }

    @PutMapping("/update-password")
    public ResponseEntity<?> updatePasswordPut(@RequestBody UpdatePasswordRequest request) {
        return updatePasswordLogic(request);
    }

    private ResponseEntity<?> updatePasswordLogic(UpdatePasswordRequest request) {

        if (request.getUserId() == null) {
            return ResponseEntity.badRequest().body("User ID is required");
        }

        if (request.getOldPassword() == null || request.getOldPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Current password is required");
        }

        if (request.getNewPassword() == null || request.getNewPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("New password is required");
        }

        if (request.getConfirmPassword() == null || request.getConfirmPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Confirm password is required");
        }

        String oldPassword = request.getOldPassword().trim();
        String newPassword = request.getNewPassword().trim();
        String confirmPassword = request.getConfirmPassword().trim();

        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body("New password and confirm password do not match");
        }

        if (newPassword.length() < 4) {
            return ResponseEntity.badRequest().body("Password must be at least 4 characters");
        }

        Optional<User> optionalUser = userRepository.findById(request.getUserId());

        if (optionalUser.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        User user = optionalUser.get();

        if (Boolean.TRUE.equals(user.getPasswordChanged())) {
            return ResponseEntity.badRequest().body("Password already updated. You cannot change it again.");
        }

        if (!user.getPassword().equals(oldPassword)) {
            return ResponseEntity.badRequest().body("Current password is incorrect");
        }

        user.setPassword(newPassword);
        user.setPasswordChanged(true);
        userRepository.save(user);

        return ResponseEntity.ok("Password updated successfully");
    }

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @Data
    public static class UpdatePasswordRequest {
        private Long userId;
        private String oldPassword;
        private String newPassword;
        private String confirmPassword;
    }

    @Data
    public static class LoginResponse {
        private Long id;
        private String username;
        private String employeeId;
        private String name;
        private String email;
        private Object role;
        private String department;
        private String designation;

        // 🔥 NEW FIELDS
        private String religion;
        private String presentFlatno;
        private String presentTown;
        private String presentState;
        private String presentPincode;
        private String status;

        private boolean passwordChanged;
    }
}