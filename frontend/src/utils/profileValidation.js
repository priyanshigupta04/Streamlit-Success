export const isValidHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isValidPhoneLike = (value) => {
  if (!value) return true;
  return /^[+]?[0-9\s()-]{7,20}$/.test(String(value));
};

export const isValidEmail = (value) => {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
};

export const validateProfilePayload = (payload = {}) => {
  if (!isValidPhoneLike(payload.phone || payload.contact)) {
    return 'Phone/Contact format is invalid';
  }

  if (!isValidEmail(payload.altEmail || payload.supportEmail)) {
    return 'Email format is invalid';
  }

  const urlFields = ['github', 'githubUrl', 'linkedin', 'linkedinUrl', 'portfolioUrl', 'companyWebsite'];
  for (const field of urlFields) {
    if (!isValidHttpUrl(payload[field])) {
      return `${field} must be a valid http/https URL`;
    }
  }

  if (payload.cgpa !== undefined && payload.cgpa !== '') {
    const cgpa = Number(payload.cgpa);
    if (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
      return 'CGPA must be between 0 and 10';
    }
  }

  return '';
};
