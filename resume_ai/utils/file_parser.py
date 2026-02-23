import os
import PyPDF2


def read_text_file(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
        return fh.read()



def parse_resume(uploaded_file):
    """
    Extract text from uploaded PDF file
    """

    if uploaded_file is None:
        return ""

    if uploaded_file.name.endswith(".pdf"):
        reader = PyPDF2.PdfReader(uploaded_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text
        return text

    else:
        return uploaded_file.read().decode("utf-8")

