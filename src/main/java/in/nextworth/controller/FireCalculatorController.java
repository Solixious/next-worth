package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FireCalculatorController {

    @GetMapping("/fire-calculator")
    public String fireCalculator() {
        return "fire-calculator";
    }
}
