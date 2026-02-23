from resume_engine import analyze_resume

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Resume AI - quick runner")
    parser.add_argument("--file", "-f", help="Path to a plain-text resume file", required=True)
    parser.add_argument("--jd", "-j", help="Path to a plain-text JD file", required=True)
    args = parser.parse_args()

    with open(args.file, "r", encoding="utf-8") as fh:
        resume_text = fh.read()

    with open(args.jd, "r", encoding="utf-8") as fh:
        jd_text = fh.read()

    result = analyze_resume(resume_text, jd_text)
    print("Domain:", result.get("resume_domain"))
    print("Final Score:", result.get("final_score"))
    print("Matched Skills:", result.get("matched_skills"))
    print("Missing Skills:", result.get("missing_skills"))
    print("Suggestions:")
    for s in result.get("suggestions", []):
        print(f"  - {s}")
