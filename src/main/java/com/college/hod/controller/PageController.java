package com.college.hod.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/admin")
    public String adminLoginPage() {
        return "forward:/adminlogin.html";
    }
}