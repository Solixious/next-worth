package in.nextworth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ToolsController {

    @GetMapping("/tools")
    public String tools() {
        return "tools";
    }
}
