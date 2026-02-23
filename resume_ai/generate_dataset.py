import random
import pandas as pd

# -------------------------
# DOMAIN KEYWORD LIBRARY
# -------------------------

domain_keywords = {
    "Frontend": [
        "React", "HTML", "CSS", "JavaScript", "Redux",
        "Bootstrap", "Tailwind", "UI", "UX", "Responsive Design",
        "NextJS", "Web Development", "Frontend Architecture",
        "Figma", "REST API Integration"
    ],
    
    "Backend": [
        "NodeJS", "Express", "Django", "Flask", "Spring Boot",
        "REST API", "Authentication", "JWT", "Microservices",
        "Database Design", "MongoDB", "MySQL", "PostgreSQL",
        "Server Deployment", "Backend Architecture"
    ],
    
    "AI/ML": [
        "Machine Learning", "Deep Learning", "Neural Networks",
        "TensorFlow", "PyTorch", "NLP", "CNN", "RNN",
        "Model Training", "Data Preprocessing",
        "Computer Vision", "Transformers",
        "Generative AI", "LLM", "Supervised Learning"
    ],
    
    "Data Science": [
        "Data Analysis", "Pandas", "NumPy", "Data Visualization",
        "Matplotlib", "Seaborn", "Statistics", "Regression",
        "Classification", "Feature Engineering",
        "SQL", "Big Data", "Tableau",
        "Exploratory Data Analysis", "Predictive Modeling"
    ],
    
    "DevOps": [
        "Docker", "Kubernetes", "CI/CD",
        "Jenkins", "GitHub Actions",
        "AWS", "Azure", "GCP",
        "Cloud Deployment", "Linux",
        "Monitoring", "Infrastructure as Code",
        "Terraform", "Ansible", "DevOps Automation"
    ],
    
    "Mechanical": [
        "Thermodynamics", "SolidWorks",
        "AutoCAD", "Mechanical Design",
        "HVAC", "Manufacturing",
        "Production Engineering",
        "Maintenance", "Robotics",
        "CAD Modeling", "Fluid Mechanics",
        "Quality Control", "Industrial Engineering"
    ],
    
    "Electrical": [
        "Power Systems", "Circuit Design",
        "Control Systems", "Electrical Machines",
        "PLC", "MATLAB",
        "Embedded Systems",
        "Signal Processing", "High Voltage Engineering",
        "Instrumentation", "Electronics",
        "Microcontrollers", "PCB Design"
    ],
    
    "Civil": [
        "Structural Engineering",
        "Construction Management",
        "AutoCAD Civil",
        "Surveying",
        "Geotechnical Engineering",
        "Concrete Technology",
        "Project Planning",
        "Site Supervision",
        "Infrastructure Development",
        "Road Design",
        "Environmental Engineering"
    ],
    
    "Business": [
        "Business Strategy",
        "Operations Management",
        "Leadership",
        "Marketing Strategy",
        "Financial Analysis",
        "MBA",
        "Project Management",
        "Stakeholder Management",
        "Sales Planning",
        "Risk Management",
        "Business Development",
        "Corporate Finance"
    ],
    
    "Medical": [
        "Patient Care",
        "Clinical Diagnosis",
        "Surgery",
        "Pharmacology",
        "Hospital Management",
        "Medical Research",
        "Healthcare",
        "Treatment Planning",
        "Nursing",
        "Public Health",
        "Radiology",
        "Pathology"
    ]
}

# -------------------------
# GENERATE DATA
# -------------------------

data = []

for domain, keywords in domain_keywords.items():
    for _ in range(100):  # 100 samples per domain
            common_words = [
        "project", "development", "application", "system",
        "implementation", "experience", "team", "design",
        "analysis", "software", "engineering"
    ]

    for domain, keywords in domain_keywords.items():
        for _ in range(100):

            domain_part = random.sample(keywords, 6)
            common_part = random.sample(common_words, 4)

            sample = " ".join(domain_part + common_part)
            data.append([sample, domain])
            data.append([sample, domain])

df = pd.DataFrame(data, columns=["resume_text", "domain"])

df.to_csv("data/labeled_resumes.csv", index=False)

print("Dataset generated successfully with 1000 samples!")
