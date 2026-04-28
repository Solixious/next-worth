package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AffordabilityCalculatorController {

    @GetMapping("/affordability-calculator")
    public String affordabilityCalculator() {
        return "affordability";
    }
}
