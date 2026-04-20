package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class EmiCalculatorController {

    @GetMapping("/emi-calculator")
    public String emiCalculator() {
        return "emi-calculator";
    }
}
