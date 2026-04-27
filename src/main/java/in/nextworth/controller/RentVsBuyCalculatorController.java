package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RentVsBuyCalculatorController {

    @GetMapping("/rent-vs-buy-calculator")
    public String rentVsBuyCalculator() {
        return "rent-vs-buy";
    }
}
