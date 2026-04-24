package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class GoalCorpusCalculatorController {

    @GetMapping("/goal-corpus-calculator")
    public String goalCorpusCalculator() {
        return "goal-corpus";
    }
}
