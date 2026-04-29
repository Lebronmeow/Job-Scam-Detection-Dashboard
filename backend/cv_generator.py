"""
CV Generator — Uses g4f (GPT4Free) to generate tailored CVs for job postings.
Falls back to template-based generation if AI is unavailable.
"""
import json
import re
import asyncio
from typing import Optional

# g4f for free AI generation
try:
    from g4f.client import Client as G4FClient
    G4F_AVAILABLE = True
except ImportError:
    G4F_AVAILABLE = False


def _build_prompt(user_profile: dict, job_data: dict) -> str:
    """Build a detailed prompt for CV generation."""
    job_title = job_data.get("title", "Unknown Position")
    job_company = job_data.get("company", "Unknown Company")
    job_description = job_data.get("description", "")
    job_role = job_data.get("role", "")
    job_location = job_data.get("location", "")

    name = user_profile.get("name", "")
    email = user_profile.get("email", "")
    phone = user_profile.get("phone", "")
    summary = user_profile.get("summary", "")
    skills = user_profile.get("skills", "")
    experience = user_profile.get("experience", [])
    education = user_profile.get("education", [])
    existing_cv = user_profile.get("existingCV", "")

    # Format experience entries
    exp_text = ""
    if experience:
        for exp in experience:
            if isinstance(exp, dict):
                exp_text += f"- {exp.get('title', '')} at {exp.get('company', '')} ({exp.get('duration', '')}): {exp.get('description', '')}\n"
            elif isinstance(exp, str):
                exp_text += f"- {exp}\n"

    # Format education entries
    edu_text = ""
    if education:
        for edu in education:
            if isinstance(edu, dict):
                edu_text += f"- {edu.get('degree', '')} from {edu.get('institution', '')} ({edu.get('year', '')})\n"
            elif isinstance(edu, str):
                edu_text += f"- {edu}\n"

    prompt = f"""You are an expert professional resume/CV writer. Generate a tailored, ATS-optimized CV for the following candidate applying to a specific job.

=== TARGET JOB ===
Position: {job_title}
Company: {job_company}
Role Category: {job_role}
Location: {job_location}
Job Description: {job_description}

=== CANDIDATE INFORMATION ===
Name: {name}
Email: {email}
Phone: {phone}
Professional Summary: {summary}
Skills: {skills}
Experience:
{exp_text if exp_text else "Not provided"}
Education:
{edu_text if edu_text else "Not provided"}
"""
    if existing_cv:
        prompt += f"\n=== EXISTING CV CONTENT ===\n{existing_cv}\n"

    prompt += """
=== INSTRUCTIONS ===
1. Tailor the CV specifically for this job posting
2. Highlight relevant skills and experience that match the job description
3. Use strong action verbs and quantifiable achievements
4. Keep it professional and concise (1-2 pages worth)
5. Include ATS-friendly keywords from the job description

Return the CV in the following JSON format ONLY (no other text before or after):
{
  "name": "Full Name",
  "contact": {
    "email": "email",
    "phone": "phone",
    "location": "city/location"
  },
  "professionalSummary": "A tailored 2-3 sentence professional summary highlighting relevant experience for this specific role",
  "skills": ["skill1", "skill2", "skill3", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start - End",
      "highlights": ["Achievement 1 with metrics", "Achievement 2 with metrics", ...]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/School",
      "year": "Year"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "tailoredKeywords": ["keyword1", "keyword2", ...]
}
"""
    return prompt


def _parse_ai_response(response_text: str) -> Optional[dict]:
    """Extract JSON from AI response, handling various formats."""
    if not response_text:
        return None
    
    # Try direct JSON parse first
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON block in markdown code fences
    json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try to find JSON object pattern
    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    return None


def _template_fallback(user_profile: dict, job_data: dict) -> dict:
    """Template-based CV generation when AI is unavailable."""
    job_desc = (job_data.get("description", "") + " " + job_data.get("title", "")).lower()
    
    # Extract user skills and match against job description
    user_skills = [s.strip() for s in user_profile.get("skills", "").split(",") if s.strip()]
    matched_skills = [s for s in user_skills if s.lower() in job_desc]
    other_skills = [s for s in user_skills if s.lower() not in job_desc]
    # Put matched skills first
    ordered_skills = matched_skills + other_skills
    
    # Build experience
    experience = []
    for exp in user_profile.get("experience", []):
        if isinstance(exp, dict):
            experience.append({
                "title": exp.get("title", ""),
                "company": exp.get("company", ""),
                "duration": exp.get("duration", ""),
                "highlights": [exp.get("description", "")] if exp.get("description") else []
            })
    
    # Build education
    education = []
    for edu in user_profile.get("education", []):
        if isinstance(edu, dict):
            education.append({
                "degree": edu.get("degree", ""),
                "institution": edu.get("institution", ""),
                "year": edu.get("year", "")
            })
    
    # Extract keywords from job description
    common_keywords = ["python", "javascript", "react", "node", "sql", "data", "analysis",
                       "management", "leadership", "communication", "teamwork", "agile",
                       "java", "c++", "machine learning", "ai", "cloud", "aws", "azure",
                       "docker", "kubernetes", "git", "html", "css", "typescript",
                       "project management", "stakeholder", "strategy", "marketing",
                       "sales", "customer", "support", "engineering", "design", "ux", "ui"]
    tailored_keywords = [kw for kw in common_keywords if kw in job_desc]
    
    summary = user_profile.get("summary", "")
    if not summary:
        summary = f"Experienced professional seeking the {job_data.get('title', 'open')} position at {job_data.get('company', 'your organization')}."
    
    return {
        "name": user_profile.get("name", "Your Name"),
        "contact": {
            "email": user_profile.get("email", ""),
            "phone": user_profile.get("phone", ""),
            "location": job_data.get("location", "")
        },
        "professionalSummary": summary,
        "skills": ordered_skills if ordered_skills else ["Please add your skills"],
        "experience": experience if experience else [{"title": "Your Role", "company": "Your Company", "duration": "", "highlights": ["Add your achievements here"]}],
        "education": education if education else [{"degree": "Your Degree", "institution": "Your Institution", "year": ""}],
        "certifications": [],
        "tailoredKeywords": tailored_keywords,
        "_generatedBy": "template"
    }


def generate_cv(user_profile: dict, job_data: dict) -> dict:
    """
    Generate a tailored CV using g4f (free AI) with template fallback.
    Returns a structured dict with CV sections.
    """
    # Try AI generation first
    if G4F_AVAILABLE:
        try:
            client = G4FClient()
            prompt = _build_prompt(user_profile, job_data)
            
            response = client.chat.completions.create(
                model="",  # g4f auto-selects the best available free model
                messages=[
                    {"role": "system", "content": "You are a professional resume writer. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                timeout=60
            )
            
            response_text = response.choices[0].message.content
            parsed = _parse_ai_response(response_text)
            
            if parsed and "name" in parsed:
                parsed["_generatedBy"] = "ai"
                return parsed
            else:
                print(f"[CV Generator] AI response couldn't be parsed, falling back to template")
                print(f"[CV Generator] Raw response: {response_text[:500]}")
        except Exception as e:
            print(f"[CV Generator] AI generation failed: {e}, falling back to template")
    else:
        print("[CV Generator] g4f not available, using template fallback")
    
    # Fallback to template
    return _template_fallback(user_profile, job_data)
