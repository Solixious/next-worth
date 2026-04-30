package in.nextworth.model;

import java.util.List;

public record GuideMetadata(
        String slug,
        String title,
        String description,
        String category,
        String readTime,
        String date,
        List<String> relatedToolSlugs
) {}
