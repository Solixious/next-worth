package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FdCalculatorController {

    @GetMapping("/fd-calculator")
    public String fdCalculator() {
        return "fd-calculator";
    }
}
