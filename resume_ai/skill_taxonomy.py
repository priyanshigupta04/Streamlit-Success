"""
Comprehensive skill taxonomy with 200+ skills across 8 domains.
Each domain contains a dict of canonical_skill -> list_of_aliases.
"""

SKILL_TAXONOMY = {
    "Software Development": {
        "python": ["python3", "python2", "py"],
        "javascript": ["js", "ecmascript", "es6", "es2015"],
        "typescript": ["ts"],
        "java": ["jdk", "j2ee", "jse"],
        "c++": ["cpp", "c plus plus"],
        "c#": ["csharp", "c sharp", "dotnet", ".net"],
        "c": [],
        "go": ["golang"],
        "rust": [],
        "ruby": [],
        "php": [],
        "swift": [],
        "kotlin": [],
        "scala": [],
        "r": ["rlang"],
        "dart": [],
        "perl": [],
        "matlab": [],
        "shell scripting": ["bash", "sh", "zsh", "powershell"],
        "html": ["html5"],
        "css": ["css3", "sass", "scss", "less"],
        "react": ["reactjs", "react.js"],
        "angular": ["angularjs", "angular.js"],
        "vue": ["vuejs", "vue.js"],
        "svelte": [],
        "next.js": ["nextjs"],
        "node.js": ["nodejs", "node"],
        "express": ["expressjs", "express.js"],
        "django": [],
        "flask": [],
        "fastapi": [],
        "spring boot": ["spring", "springboot"],
        "ruby on rails": ["rails", "ror"],
        "laravel": [],
        "asp.net": ["aspnet"],
        "graphql": [],
        "rest api": ["restful", "rest"],
        "microservices": [],
        "websockets": ["socket.io", "ws"],
    },
    "Data Science & AI": {
        "machine learning": ["ml"],
        "deep learning": ["dl"],
        "natural language processing": ["nlp"],
        "computer vision": ["cv", "image processing"],
        "tensorflow": ["tf"],
        "pytorch": ["torch"],
        "keras": [],
        "scikit-learn": ["sklearn"],
        "pandas": [],
        "numpy": [],
        "matplotlib": [],
        "seaborn": [],
        "opencv": ["cv2"],
        "nltk": [],
        "spacy": [],
        "huggingface": ["transformers"],
        "langchain": [],
        "llm": ["large language model"],
        "gpt": ["chatgpt", "openai"],
        "bert": [],
        "reinforcement learning": ["rl"],
        "time series analysis": [],
        "regression": ["linear regression", "logistic regression"],
        "classification": [],
        "clustering": ["k-means", "dbscan"],
        "neural networks": ["nn", "ann", "cnn", "rnn", "lstm"],
        "data visualization": ["dataviz"],
        "feature engineering": [],
        "model deployment": ["mlops"],
        "jupyter": ["jupyter notebook", "ipython"],
        "tableau": [],
        "power bi": ["powerbi"],
    },
    "Cloud & DevOps": {
        "aws": ["amazon web services"],
        "azure": ["microsoft azure"],
        "gcp": ["google cloud", "google cloud platform"],
        "docker": [],
        "kubernetes": ["k8s"],
        "terraform": [],
        "ansible": [],
        "jenkins": [],
        "ci/cd": ["cicd", "continuous integration", "continuous deployment"],
        "github actions": [],
        "gitlab ci": [],
        "linux": ["unix", "ubuntu", "centos", "debian"],
        "nginx": [],
        "apache": [],
        "serverless": ["lambda", "cloud functions"],
        "helm": [],
        "prometheus": [],
        "grafana": [],
        "elasticsearch": ["elk", "elastic"],
        "kafka": ["apache kafka"],
        "rabbitmq": [],
        "redis": [],
    },
    "Database": {
        "sql": ["structured query language"],
        "mysql": [],
        "postgresql": ["postgres"],
        "mongodb": ["mongo"],
        "sqlite": [],
        "oracle": ["oracle db"],
        "sql server": ["mssql", "microsoft sql"],
        "cassandra": [],
        "dynamodb": [],
        "firebase": ["firestore"],
        "neo4j": [],
        "couchdb": [],
        "mariadb": [],
        "nosql": [],
        "orm": ["sequelize", "prisma", "typeorm", "sqlalchemy"],
        "mongoose": [],
    },
    "Cybersecurity": {
        "penetration testing": ["pentest", "pentesting"],
        "vulnerability assessment": [],
        "network security": [],
        "cryptography": ["encryption"],
        "ethical hacking": [],
        "siem": [],
        "firewall": [],
        "owasp": [],
        "soc": ["security operations"],
        "incident response": [],
        "malware analysis": [],
        "reverse engineering": [],
        "burp suite": [],
        "metasploit": [],
        "wireshark": [],
        "nmap": [],
        "kali linux": ["kali"],
        "iso 27001": [],
        "gdpr": [],
        "compliance": [],
    },
    "Mobile Development": {
        "android": ["android development"],
        "ios": ["ios development"],
        "react native": [],
        "flutter": [],
        "xamarin": [],
        "swiftui": [],
        "jetpack compose": [],
        "ionic": [],
        "cordova": ["phonegap"],
        "mobile ui": ["mobile design"],
    },
    "Design & Frontend": {
        "figma": [],
        "sketch": [],
        "adobe xd": ["xd"],
        "photoshop": ["adobe photoshop"],
        "illustrator": ["adobe illustrator"],
        "ui/ux": ["ui design", "ux design", "user experience", "user interface"],
        "responsive design": [],
        "wireframing": [],
        "prototyping": [],
        "tailwind css": ["tailwindcss", "tailwind"],
        "bootstrap": [],
        "material ui": ["mui"],
        "ant design": ["antd"],
        "accessibility": ["a11y", "wcag"],
    },
    "Soft Skills & Management": {
        "agile": ["scrum", "kanban"],
        "jira": [],
        "project management": [],
        "git": ["github", "gitlab", "bitbucket", "version control"],
        "communication": [],
        "leadership": [],
        "team management": [],
        "problem solving": [],
        "critical thinking": [],
        "time management": [],
        "documentation": ["technical writing"],
    },
}


def get_all_skills():
    """Return a flat set of all canonical skill names."""
    skills = set()
    for domain_skills in SKILL_TAXONOMY.values():
        skills.update(domain_skills.keys())
    return skills


def get_alias_map():
    """Return dict mapping every alias -> canonical skill name."""
    alias_map = {}
    for domain_skills in SKILL_TAXONOMY.values():
        for canonical, aliases in domain_skills.items():
            alias_map[canonical.lower()] = canonical
            for alias in aliases:
                alias_map[alias.lower()] = canonical
    return alias_map


def get_domain_for_skill(skill_name):
    """Return the domain a skill belongs to, or None."""
    skill_lower = skill_name.lower()
    for domain, domain_skills in SKILL_TAXONOMY.items():
        for canonical, aliases in domain_skills.items():
            if skill_lower == canonical.lower() or skill_lower in [a.lower() for a in aliases]:
                return domain
    return None
