package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoanPrepaymentCalculatorController {

    @GetMapping("/loan-prepayment-calculator")
    public String loanPrepaymentCalculator() {
        return "loan-prepayment";
    }
}
