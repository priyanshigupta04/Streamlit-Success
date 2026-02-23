from resume_engine import analyze_resume

resume_text = """
I have built responsive web applications using React, HTML, CSS and JavaScript.
Worked with Git and integrated REST APIs.
"""

jd_text = """
Looking for Frontend Developer Intern.
Skills required: HTML, CSS, React, Git, REST API.
"""

result = analyze_resume(resume_text, jd_text, user_id="test123")

print(result)
