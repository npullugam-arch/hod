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
                    "/",
                    "/index.html",

                    "/admin",
                    "/adminlogin.html",

                    "/student.html",
                    "/hod.html",
                    "/admin.html",
                    "/admin-HOD.html",
                    "/admin-student.html",

                    "/profile.html",
                    "/password.html",

                    "/hod-profile.html",
                    "/hod-password.html",

                    "/reminders.html",
                    "/permission.html",
                    "/request.html",
                    "/myrequest.html",
                    "/certificate.html",
                    "/pending-request.html",
                    "/certificate-tracking.html",

                    "/auth/**",
                    "/student/**",
                    "/hod/**",
                    "/admin/**",
                    "/request/**",
                    "/certificate/**",
                    "/notification/**",

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