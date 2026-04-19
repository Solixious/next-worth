package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class NetWorthController {

    @GetMapping("/net-worth-calculator")
    public String netWorth() {
        return "net-worth";
    }
}
