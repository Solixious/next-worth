package in.nextworth.model;

import java.util.List;

public record GuideDetail(
        GuideMetadata metadata,
        String htmlContent,
        List<ToolRef> relatedTools
) {
    public record ToolRef(String name, String url, String icon) {}
}
