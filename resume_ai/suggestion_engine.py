def generate_suggestions(skill_score, semantic_score, missing_skills):

    suggestions = []

    if skill_score < 60:
        suggestions.append("Add missing skills: " + ", ".join(missing_skills[:5]))

    if semantic_score < 60:
        suggestions.append("Improve project descriptions using job-related keywords.")

    if not suggestions:
        suggestions.append("Resume is well optimized for this role.")

    return suggestions
