import streamlit as st
import pandas as pd
from resume_engine import analyze_resume
from utils.file_parser import parse_resume

st.set_page_config(
    page_title="AI Resume Analyzer",
    page_icon="🤖",
    layout="wide"
)

# -----------------------------
# SIDEBAR
# -----------------------------
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/3135/3135715.png", width=120)
    st.title("AI Resume Analyzer")
    st.markdown("""
    ### 🚀 Features
    - ATS Score
    - Skill Gap Detection
    - Smart Suggestions
    - Domain Classification
    """)
    st.markdown("---")
    st.caption("Built with ❤️ using Streamlit")

# -----------------------------
# MAIN HEADER
# -----------------------------
st.markdown("<h1 style='text-align:center;'>🤖 AI Resume Analyzer</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align:center; font-size:18px;'>Upload your Resume and Job Description to get intelligent insights</p>", unsafe_allow_html=True)
st.markdown("---")

# -----------------------------
# INPUT SECTION
# -----------------------------
with st.container():
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("📄 Upload Resume (PDF)")
        uploaded_file = st.file_uploader("Choose a PDF file", type=["pdf"])

    with col2:
        st.subheader("📝 Upload Job Description (PDF)")
        jd_file = st.file_uploader("Choose JD PDF file", type=["pdf"], key="jd")

    user_id = st.text_input("User ID (optional)", value="test_user")

    analyze_btn = st.button("🚀 Analyze Resume", use_container_width=True)

# -----------------------------
# ANALYSIS SECTION
# -----------------------------
if analyze_btn:

    if uploaded_file and jd_file:

        with st.spinner("🔍 Extracting text from Resume PDF..."):
            resume_text = parse_resume(uploaded_file)

        with st.spinner("📄 Extracting JD text from PDF..."):
            jd_text = parse_resume(jd_file)

        with st.spinner("🤖 AI is analyzing..."):
            result = analyze_resume(resume_text, jd_text, user_id)

        st.success("Analysis Complete ✅")

        # -----------------------------
        # TABS SECTION
        # -----------------------------
        tab1, tab2, tab3 = st.tabs(["📊 ATS Score", "❌ Skill Gap", "💡 Suggestions"])

        # -----------------------------
        # TAB 1 - SCORE
        # -----------------------------
        with tab1:
            st.subheader("📊 ATS Score Breakdown")

            score = result["final_score"]

            st.metric("Final ATS Score", f"{score} %")

            # Progress Bar
            st.progress(int(score))
            
            st.subheader("🎯 Most Matched Domain")
            st.success(f"{result['resume_domain']}")

            if score >= 80:
                st.success("🔥 Excellent Match!")
            elif score >= 60:
                st.warning("👍 Good Match - Can Improve")
            else:
                st.error("⚠ Needs Improvement")

        # -----------------------------
        # TAB 2 - SKILLS
        # -----------------------------
        with tab2:
            st.subheader("❌ Missing Skills")

            if result["missing_skills"]:
                for skill in result["missing_skills"]:
                    st.markdown(f"🔹 {skill}")
            else:
                st.success("No major skill gaps detected!")

        # -----------------------------
        # TAB 3 - SUGGESTIONS
        # -----------------------------
        with tab3:
            st.subheader("💡 Improvement Suggestions")

            for suggestion in result["suggestions"]:
                st.markdown(f"✅ {suggestion}")

        st.markdown("---")
        st.info("✨ Improve your resume based on suggestions and re-analyze!")

    else:
        st.error("Please upload resume and paste JD.")