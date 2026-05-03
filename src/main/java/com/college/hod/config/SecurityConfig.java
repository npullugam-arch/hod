package com.college.hod.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers
                .frameOptions(frameOptions -> frameOptions.sameOrigin())
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(

                    // ROOT
                    "/",
                    "/index.html",

                    // ✅ IMPORTANT (SEO FILES)
                    "/sitemap.xml",
                    "/robots.txt",

                    // ADMIN
                    "/admin",
                    "/adminlogin.html",

                    // STUDENT & HOD PAGES
                    "/student.html",
                    "/hod.html",
                    "/hod-students.html",
                    "/allstudents.html",

                    // ADMIN PAGES
                    "/admin.html",
                    "/admin-HOD.html",
                    "/admin-student.html",
                    "/admin-hod-assignment.html",
                    "/student-details.html",
                    "/student-history.html",

                    // PROFILE
                    "/profile.html",
                    "/password.html",
                    "/hod-profile.html",
                    "/hod-password.html",

                    // FEATURES
                    "/reminders.html",
                    "/permission.html",
                    "/request.html",
                    "/myrequest.html",
                    "/certificate.html",
                    "/pending-request.html",
                    "/certificate-tracking.html",

                    // API
                    "/auth/**",
                    "/student/**",
                    "/hod/**",
                    "/admin/**",
                    "/request/**",
                    "/certificate/**",
                    "/notification/**",

                    // STATIC
                    "/uploads/**",
                    "/css/**",
                    "/js/**",
                    "/images/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form.disable())
            .httpBasic(httpBasic -> httpBasic.disable());

        return http.build();
    }
}