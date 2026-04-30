package com.college.hod.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
public class AssetController {

    private static final List<String> COLLEGE_LOGO_URLS = List.of(
            "https://www.iare.ac.in/sites/default/files/design_templates/IARE_Logo_Academic.png",
            "https://i.postimg.cc/vB9nm9tV/sanchara-logo-clean.png",
            "https://i.postimg.cc/JhLRjkbv/sanchara-logo-white-transparent.png"
    );

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private static volatile byte[] cachedLogoBytes;
    private static volatile MediaType cachedLogoType;

    @GetMapping("/images/college-logo")
    public ResponseEntity<byte[]> getCollegeLogo() {
        if (cachedLogoBytes != null && cachedLogoType != null) {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
                    .contentType(cachedLogoType)
                    .body(cachedLogoBytes);
        }

        for (String logoUrl : COLLEGE_LOGO_URLS) {
            try {
                HttpRequest request = HttpRequest.newBuilder(URI.create(logoUrl))
                        .timeout(Duration.ofSeconds(15))
                        .header(HttpHeaders.USER_AGENT, "Mozilla/5.0")
                        .GET()
                        .build();

                HttpResponse<byte[]> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofByteArray());

                if (response.statusCode() >= 200 && response.statusCode() < 300 && response.body().length > 0) {
                    MediaType mediaType = resolveMediaType(response.headers().firstValue(HttpHeaders.CONTENT_TYPE).orElse(null));

                    cachedLogoBytes = response.body();
                    cachedLogoType = mediaType;

                    return ResponseEntity.ok()
                            .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
                            .contentType(mediaType)
                            .body(cachedLogoBytes);
                }
            } catch (IOException | InterruptedException ex) {
                if (ex instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    private MediaType resolveMediaType(String contentTypeHeader) {
        if (contentTypeHeader == null || contentTypeHeader.isBlank()) {
            return MediaType.IMAGE_PNG;
        }

        try {
            return MediaType.parseMediaType(contentTypeHeader);
        } catch (IllegalArgumentException ex) {
            return MediaType.IMAGE_PNG;
        }
    }
}
