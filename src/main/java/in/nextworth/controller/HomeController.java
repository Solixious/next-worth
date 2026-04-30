package in.nextworth.controller;

import in.nextworth.model.GuideMetadata;
import in.nextworth.service.GuideService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Controller
public class HomeController {

    @Autowired
    private GuideService guideService;

    @GetMapping("/")
    public String index(Model model) {
        List<GuideMetadata> guides = guideService.listGuides();
        model.addAttribute("guides", guides);
        return "home";
    }
}
