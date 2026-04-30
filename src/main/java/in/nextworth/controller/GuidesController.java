package in.nextworth.controller;

import in.nextworth.service.GuideService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class GuidesController {

    private final GuideService guideService;

    public GuidesController(GuideService guideService) {
        this.guideService = guideService;
    }

    @GetMapping("/guides")
    public String guides(Model model) {
        model.addAttribute("guides", guideService.listGuides());
        return "guides";
    }

    @GetMapping("/guides/{slug}")
    public String guide(@PathVariable String slug, Model model) {
        return guideService.getGuide(slug)
                .map(detail -> { model.addAttribute("guide", detail); return "guide"; })
                .orElse("redirect:/guides");
    }
}
