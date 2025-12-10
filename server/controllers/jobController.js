// server/controllers/jobController.js
const Job = require('../models/Job');
const CandidateProfile = require('../models/CandidateProfile');

// Basic local dictionary & synonym map (you can extend this)
const SKILL_DICTIONARY = [
  'React',
  'TypeScript',
  'JavaScript',
  'Redux',
  'RTK',
  'Jest',
  'Cypress',
  'GraphQL',
  'Node.js',
  'Web Performance',
  'REST APIs',
  'Next.js',
];

const SYNONYM_MAP = {
  'react.js': 'React',
  'reactjs': 'React',
  'ts': 'TypeScript',
  'javascript': 'JavaScript',
  'redux toolkit': 'RTK',
  'rest': 'REST APIs',
  'rest api': 'REST APIs',
  'performance': 'Web Performance',
};

/**
 * Utility: extract skills from a JD string using the dictionary + synonyms
 */
function extractSkillsFromText(text) {
  const lower = text.toLowerCase();
  const found = new Set();

  // direct dictionary match
  SKILL_DICTIONARY.forEach((skill) => {
    if (lower.includes(skill.toLowerCase())) {
      found.add(skill);
    }
  });

  // synonyms → canonical skills
  Object.entries(SYNONYM_MAP).forEach(([variant, canonical]) => {
    if (lower.includes(variant.toLowerCase())) {
      found.add(canonical);
    }
  });

  return Array.from(found);
}

/**
 * POST /api/jobs/analyze
 * Body: { description, title? }
 * Auth: recruiter (checked by authMiddleware + role in token)
 */
exports.analyzeJob = async (req, res) => {
  try {
    const { description, title } = req.body;
    const recruiterId = req.user.userId || req.user.id || req.user._id;
    if (!recruiterId) {
      return res.status(400).json({ message: 'Recruiter id missing from token' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Job description is required' });
    }

    const skills = extractSkillsFromText(description);

    const job = await Job.create({
      recruiter: recruiterId,
      title: title || 'Untitled Job',
      description,
      skills,
    });

    return res.json({
      message: 'Job analyzed successfully',
      skills,
      jobId: job._id,
    });
  } catch (err) {
    console.error('analyzeJob error:', err);
    return res.status(500).json({ message: 'Server error analyzing job' });
  }
};

/**
 * Helper to compute lastUsedDays for a specific skill
 */
function lastUsedDaysForSkill(skillArray, skillName) {
  const s = (skillArray || []).find(
    (sk) => sk.name && sk.name.toLowerCase() === skillName.toLowerCase()
  );
  return s && typeof s.lastUsedDaysAgo === 'number' ? s.lastUsedDaysAgo : 999;
}

/**
 * POST /api/jobs/match
 * Body: { jobId, query? }
 * Returns ranked candidates with "why matched" + proof links
 */
exports.matchCandidates = async (req, res) => {
  try {
    const { jobId, query } = req.body;
    const recruiterId = req.user.userId || req.user.id || req.user._id;
    if (!recruiterId) {
      return res.status(400).json({ message: 'Recruiter id missing from token' });
    }

    if (!jobId) {
      return res.status(400).json({ message: 'jobId is required' });
    }

    const job = await Job.findOne({ _id: jobId, recruiter: recruiterId });
    if (!job) {
      return res.status(404).json({ message: 'Job not found for this recruiter' });
    }

    const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
    const jobSkillSet = new Set(jobSkills);

    // Basic natural-language filter from query: we just try to pull skill words
    let querySkillSet = null;
    if (query && query.trim()) {
      const qLower = query.toLowerCase();
      querySkillSet = new Set(
        SKILL_DICTIONARY.filter((skill) => qLower.includes(skill.toLowerCase()))
      );
    }

    // fetch candidates; later you can filter by location, etc.
    const candidates = await CandidateProfile.find().populate('user');

    const results = candidates
      .map((c) => {
        const skills = c.skills || [];

        // intersection with job skills
        const matchedSkills = [];
        let recentBonus = 0;
        let proofCount = 0;

        skills.forEach((sk) => {
          if (!sk.name) return;

          const sLower = sk.name.toLowerCase();
          if (jobSkillSet.has(sLower)) {
            matchedSkills.push(sk.name);

            // recency: more bonus for recent use
            if (typeof sk.lastUsedDaysAgo === 'number') {
              if (sk.lastUsedDaysAgo <= 30) recentBonus += 20;
              else if (sk.lastUsedDaysAgo <= 90) recentBonus += 10;
              else if (sk.lastUsedDaysAgo <= 180) recentBonus += 5;
            }

            // public proofs for this skill
            const publicProofs = (sk.proofs || []).filter((p) => p.isPublic);
            proofCount += publicProofs.length;
          }
        });

        // if a query skill set exists, require at least 1 overlap with those
        if (querySkillSet && querySkillSet.size > 0) {
          const hasQuerySkill = matchedSkills.some((ms) =>
            querySkillSet.has(ms)
          );
          if (!hasQuerySkill) return null;
        }

        if (matchedSkills.length === 0) {
          return null;
        }

        // scoring: base on skill overlap + recency + proofs
        const overlapScore = matchedSkills.length * 15;
        const proofBonus = Math.min(proofCount * 5, 20);
        let matchScore = overlapScore + recentBonus + proofBonus;
        if (c.experienceYears) matchScore += Math.min(c.experienceYears * 2, 10);
        if (matchScore > 100) matchScore = 100;

        // Build public proof links (max 3, all skills)
        const proofLinks = [];
        skills.forEach((sk) => {
          (sk.proofs || [])
            .filter((p) => p.isPublic)
            .forEach((p) => {
              if (proofLinks.length >= 3) return;
              let icon = 'fas fa-link';
              if (p.type === 'github') icon = 'fab fa-github';
              else if (p.type === 'demo') icon = 'fas fa-video';
              else if (p.type === 'certificate') icon = 'fas fa-certificate';

              proofLinks.push({
                icon,
                text: p.label || p.url,
              });
            });
        });

        // lastUsedReact helps your existing filter logic (recencyFilter) for React
        const lastUsedReact = lastUsedDaysForSkill(skills, 'React');

        const why =
          matchedSkills.length > 0
            ? `Matched on: ${matchedSkills.join(
                ', '
              )}. Public proofs: ${proofCount}.`
            : 'Low skill overlap for this JD.';

        return {
          id: c._id,
          name: c.user?.fullName || 'Candidate',
          title: c.headline || 'Candidate',
          experience: `${c.experienceYears || 0} years`,
          matchScore,
          skills: matchedSkills,
          whyMatched: why,
          proofLinks,
          lastUsedReact,
          location: c.location || 'Remote',
          education: c.education || '',
        };
      })
      .filter(Boolean) // remove nulls
      .sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ candidates: results });
  } catch (err) {
    console.error('matchCandidates error:', err);
    return res.status(500).json({ message: 'Server error matching candidates' });
  }
};
