package in.nextworth.service;

import in.nextworth.model.GuideDetail;
import in.nextworth.model.GuideMetadata;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class GuideService {

    private static final Map<String, String[]> TOOL_REGISTRY = Map.ofEntries(
            Map.entry("net-worth-calculator",        new String[]{"Net Worth Calculator",        "/net-worth-calculator",        "NW"}),
            Map.entry("fire-calculator",             new String[]{"FIRE Calculator",             "/fire-calculator",             "FI"}),
            Map.entry("goal-corpus-calculator",      new String[]{"Goal Corpus Calculator",      "/goal-corpus-calculator",      "GC"}),
            Map.entry("emi-calculator",              new String[]{"EMI Calculator",              "/emi-calculator",              "EM"}),
            Map.entry("loan-prepayment-calculator",  new String[]{"Loan Prepayment Calculator",  "/loan-prepayment-calculator",  "LP"}),
            Map.entry("rent-vs-buy-calculator",      new String[]{"Rent vs Buy Calculator",      "/rent-vs-buy-calculator",      "RB"}),
            Map.entry("affordability-calculator",    new String[]{"Affordability Calculator",    "/affordability-calculator",    "AF"}),
            Map.entry("sip-calculator",              new String[]{"SIP Calculator",              "/sip-calculator",              "SI"}),
            Map.entry("fd-calculator",               new String[]{"FD Calculator",               "/fd-calculator",               "FD"}),
            Map.entry("emergency-fund-calculator",   new String[]{"Emergency Fund Calculator",   "/emergency-fund-calculator",   "EF"})
    );

    private final ResourcePatternResolver resourceResolver;
    private final Parser markdownParser;
    private final HtmlRenderer htmlRenderer;

    public GuideService(ResourcePatternResolver resourceResolver) {
        this.resourceResolver = resourceResolver;
        this.markdownParser   = Parser.builder().build();
        this.htmlRenderer     = HtmlRenderer.builder().escapeHtml(false).build();
    }

    public List<GuideMetadata> listGuides() {
        try {
            Resource[] resources = resourceResolver.getResources("classpath:guides/*.md");
            List<GuideMetadata> guides = new ArrayList<>();
            for (Resource r : resources) {
                String filename = r.getFilename();
                if (filename == null) continue;
                String slug = filename.substring(0, filename.lastIndexOf('.'));
                String raw  = new String(r.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                var parsed  = parseFrontmatter(raw);
                guides.add(buildMetadata(slug, parsed.getKey()));
            }
            guides.sort(Comparator.comparing(GuideMetadata::date).reversed());
            return guides;
        } catch (IOException e) {
            return List.of();
        }
    }

    public Optional<GuideDetail> getGuide(String slug) {
        try {
            Resource[] resources = resourceResolver.getResources("classpath:guides/*.md");
            for (Resource r : resources) {
                String filename = r.getFilename();
                if (filename == null) continue;
                String fileSlug = filename.substring(0, filename.lastIndexOf('.'));
                if (!fileSlug.equals(slug)) continue;

                String raw    = new String(r.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                var parsed    = parseFrontmatter(raw);
                var meta      = buildMetadata(slug, parsed.getKey());
                String html   = htmlRenderer.render(markdownParser.parse(parsed.getValue()));
                var tools     = resolveTools(meta.relatedToolSlugs());
                return Optional.of(new GuideDetail(meta, html, tools));
            }
        } catch (IOException ignored) {}
        return Optional.empty();
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private Map.Entry<Map<String, String>, String> parseFrontmatter(String raw) {
        String[] lines = raw.split("\n", -1);
        Map<String, String> meta = new LinkedHashMap<>();

        if (lines.length > 0 && lines[0].trim().equals("---")) {
            int closeIdx = -1;
            for (int i = 1; i < lines.length; i++) {
                if (lines[i].trim().equals("---")) { closeIdx = i; break; }
            }
            if (closeIdx > 0) {
                for (int i = 1; i < closeIdx; i++) {
                    int colon = lines[i].indexOf(':');
                    if (colon > 0) {
                        meta.put(lines[i].substring(0, colon).trim(),
                                 lines[i].substring(colon + 1).trim());
                    }
                }
                String content = String.join("\n",
                        Arrays.copyOfRange(lines, closeIdx + 1, lines.length)).stripLeading();
                return Map.entry(meta, content);
            }
        }
        return Map.entry(meta, raw);
    }

    private GuideMetadata buildMetadata(String slug, Map<String, String> fm) {
        String relatedRaw = fm.getOrDefault("relatedTools", "");
        List<String> related = relatedRaw.isBlank()
                ? List.of()
                : Arrays.stream(relatedRaw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        return new GuideMetadata(
                slug,
                fm.getOrDefault("title", slug),
                fm.getOrDefault("description", ""),
                fm.getOrDefault("category", "General"),
                fm.getOrDefault("readTime", ""),
                fm.getOrDefault("date", ""),
                related
        );
    }

    private List<GuideDetail.ToolRef> resolveTools(List<String> slugs) {
        return slugs.stream()
                .map(s -> {
                    String[] t = TOOL_REGISTRY.get(s);
                    return t != null ? new GuideDetail.ToolRef(t[0], t[1], t[2]) : null;
                })
                .filter(Objects::nonNull)
                .toList();
    }
}
