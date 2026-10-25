/**
 * ABHEDYA Creator Safety Score Engine
 * Documented composite risk indicator based strictly on recorded activity.
 * 
 * Maximum Score: 100
 * Weights:
 * - Harmful comments & repeated harassment: up to 35 pts
 * - Direct threats & personal information exposure: up to 30 pts
 * - Suspicious image alteration signals: up to 20 pts
 * - Recent incidents with temporal decay: up to 15 pts
 * 
 * Disclaimer:
 * "This is an internal indicator based on activity recorded in ABHEDYA,
 * not an objective measurement of your actual safety."
 */

export const SCORE_WEIGHTS = {
  COMMENTS_HARASSMENT_MAX: 35,
  THREATS_PII_MAX: 30,
  IMAGE_ALTERATION_MAX: 20,
  RECENT_DECAY_MAX: 15,
};

export function calculateCreatorSafetyScore(records = []) {
  if (!records || records.length === 0) {
    return {
      score: 0,
      band: 'low',
      bandKey: 'safetyScore.band.low',
      breakdown: {
        commentsHarassment: 0,
        threatsPii: 0,
        imageAlteration: 0,
        recentDecay: 0,
      },
      contributingFactors: [],
      recordsCount: 0,
      hasData: false,
    };
  }

  let commentsScore = 0;
  let threatsScore = 0;
  let imageScore = 0;
  let recentScore = 0;

  const contributingFactors = [];
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Track unique incident signals to avoid double counting
  let abusiveCommentCount = 0;
  let harassmentCount = 0;
  let threatCount = 0;
  let piiCount = 0;
  let significantTamperCount = 0;
  let recentIncidentCount = 0;

  records.forEach((record) => {
    const ageDays = (now - new Date(record.timestamp || now).getTime()) / ONE_DAY_MS;

    // Temporal weight: incidents within 7 days carry higher weight
    if (ageDays <= 7) {
      recentIncidentCount += 1;
    }

    if (record.type === 'comments') {
      const cat = record.category?.toLowerCase() || '';
      const risk = record.riskLevel?.toLowerCase() || '';

      if (cat.includes('threat') || risk === 'critical') {
        threatCount += 1;
      } else if (cat.includes('pii') || cat.includes('personal')) {
        piiCount += 1;
      } else if (cat.includes('harass') || risk === 'high') {
        harassmentCount += 1;
      } else if (cat.includes('abus') || cat.includes('sexual')) {
        abusiveCommentCount += 1;
      }
    } else if (record.type === 'casting') {
      const risk = record.riskLevel?.toLowerCase() || '';
      if (risk === 'critical' || risk.includes('critical')) {
        threatCount += 1;
      } else if (risk === 'high' || risk.includes('high')) {
        harassmentCount += 1;
      }
    } else if (record.type === 'comparison') {
      const diffPercent = parseFloat(record.pixelDiffPercent || 0);
      const isIdentical = !!record.isIdentical;
      if (!isIdentical && diffPercent > 1.0) {
        significantTamperCount += 1;
      }
    }
  });

  // 1. Comments & Harassment (Max 35)
  // Each harassment incident adds 12 pts, abusive adds 7 pts
  commentsScore = Math.min(
    SCORE_WEIGHTS.COMMENTS_HARASSMENT_MAX,
    (harassmentCount * 12) + (abusiveCommentCount * 7)
  );

  // 2. Direct Threats & PII (Max 30)
  // Threats add 18 pts, PII exposure adds 14 pts
  threatsScore = Math.min(
    SCORE_WEIGHTS.THREATS_PII_MAX,
    (threatCount * 18) + (piiCount * 14)
  );

  // 3. Image Alterations (Max 20)
  // Each altered comparison adds 10 pts
  imageScore = Math.min(
    SCORE_WEIGHTS.IMAGE_ALTERATION_MAX,
    significantTamperCount * 10
  );

  // 4. Temporal Decay / Recent Incidents (Max 15)
  // Recent incidents within 7 days add 5 pts each
  recentScore = Math.min(
    SCORE_WEIGHTS.RECENT_DECAY_MAX,
    recentIncidentCount * 5
  );

  const totalScore = Math.min(100, Math.round(commentsScore + threatsScore + imageScore + recentScore));

  // Determine Risk Band
  let band = 'low';
  let bandKey = 'safetyScore.band.low';
  if (totalScore >= 75) {
    band = 'severe';
    bandKey = 'safetyScore.band.severe';
  } else if (totalScore >= 50) {
    band = 'high';
    bandKey = 'safetyScore.band.high';
  } else if (totalScore >= 25) {
    band = 'moderate';
    bandKey = 'safetyScore.band.moderate';
  }

  // Identify Top Contributing Factors
  if (threatsScore > 0) {
    contributingFactors.push({
      key: 'safetyScore.factors.threats',
      points: threatsScore,
      count: threatCount + piiCount,
      detail: `${threatCount} direct threat signal(s), ${piiCount} PII alert(s)`
    });
  }
  if (commentsScore > 0) {
    contributingFactors.push({
      key: 'safetyScore.factors.comments',
      points: commentsScore,
      count: harassmentCount + abusiveCommentCount,
      detail: `${harassmentCount} harassment signal(s), ${abusiveCommentCount} abusive comment(s)`
    });
  }
  if (imageScore > 0) {
    contributingFactors.push({
      key: 'safetyScore.factors.comparison',
      points: imageScore,
      count: significantTamperCount,
      detail: `${significantTamperCount} image alteration signal(s)`
    });
  }
  if (recentScore > 0) {
    contributingFactors.push({
      key: 'safetyScore.factors.recency',
      points: recentScore,
      count: recentIncidentCount,
      detail: `${recentIncidentCount} incident(s) in past 7 days`
    });
  }

  return {
    score: totalScore,
    band,
    bandKey,
    breakdown: {
      commentsHarassment: commentsScore,
      threatsPii: threatsScore,
      imageAlteration: imageScore,
      recentDecay: recentScore,
    },
    contributingFactors,
    recordsCount: records.length,
    hasData: records.length > 0,
  };
}
