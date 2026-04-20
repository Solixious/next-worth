package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SipCalculatorController {

    @GetMapping("/sip-calculator")
    public String sipCalculator() {
        return "sip-calculator";
    }
}
