package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class EmergencyFundCalculatorController {

    @GetMapping("/emergency-fund-calculator")
    public String emergencyFundCalculator() {
        return "emergency-fund";
    }
}
