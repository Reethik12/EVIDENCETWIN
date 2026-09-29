import {
  MatrixInterferenceAnalysis,
  MatrixInterferenceCandidate,
  ReactionProfile
} from '../../types/evidence';
import { hexToRgb, rgbToLab, calculateDeltaE } from './calibrationEngine';

// Standard common cutting agents / excipient matrix interferents observed in field testing
const DEFAULT_INTERFERENTS: MatrixInterferenceCandidate[] = [
  {
    name: 'Carbohydrate Excipient (Lactose / Sucrose / Starch)',
    chemicalClass: 'Carbohydrate Matrix',
    likelihood: 'LOW',
    typicalColorShift: '#8C7853 (Delayed amber-brown charring with acid reagents)',
    note: 'Common pharmaceutical diluent; may cause sluggish chromophoric initiation or late caramelization discoloration.',
  },
  {
    name: 'Analgesic Matrix (Acetaminophen / Paracetamol)',
    chemicalClass: 'Phenolic Analgesic Excipient',
    likelihood: 'LOW',
    typicalColorShift: '#5E6B54 (Muddy olive-grey drift)',
    note: 'Frequently detected in illicit mixtures; creates anomalous absorbance overlap across 520-580nm visible band.',
  },
  {
    name: 'Stimulant Co-ingredient (Caffeine / Theobromine)',
    chemicalClass: 'Methylxanthine Alkaloid',
    likelihood: 'LOW',
    typicalColorShift: '#A39276 (Weak beige-buff suppression)',
    note: 'Non-reactive with primary formaldehyde/sulfuric reagents but dilutes chromophore optical density.',
  },
  {
    name: 'Local Anesthetic (Lidocaine / Procaine / Benzocaine)',
    chemicalClass: 'Aminoamide / Aminoester Local Anesthetic',
    likelihood: 'LOW',
    typicalColorShift: '#4D8076 (Pale turquoise turbidity in coordination tests)',
    note: 'May produce competing precipitation or phase separation delays in biphasic screening tests.',
  },
];

/**
 * FEATURE 7: Multi-Matrix / Interference Research Mode
 * Evaluates spectral vector displacement between observed reaction and reference target
 * to detect potential non-target excipient matrix or cutting agent effects.
 */
export function analyzeMatrixInterference(
  observedCalibratedHex: string,
  targetExpectedHex: string,
  reactionProfile?: ReactionProfile
): MatrixInterferenceAnalysis {
  const obsRgb = hexToRgb(observedCalibratedHex) || { r: 120, g: 60, b: 180 };
  const targetRgb = hexToRgb(targetExpectedHex) || { r: 61, g: 28, b: 82 };

  const obsLab = rgbToLab(obsRgb.r, obsRgb.g, obsRgb.b);
  const targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b);

  const deltaE = calculateDeltaE(observedCalibratedHex, targetExpectedHex);

  // Vector deviation in CIE Lab
  const dL = obsLab.L - targetLab.L;
  const da = obsLab.a - targetLab.a;
  const db = obsLab.b - targetLab.b;

  // Angular displacement in a*b* chromaticity plane
  const angleObs = Math.atan2(obsLab.b, obsLab.a) * (180 / Math.PI);
  const angleTarget = Math.atan2(targetLab.b, targetLab.a) * (180 / Math.PI);
  let vectorDeviationAngleDeg = Math.abs(angleObs - angleTarget);
  if (vectorDeviationAngleDeg > 180) vectorDeviationAngleDeg = 360 - vectorDeviationAngleDeg;
  vectorDeviationAngleDeg = parseFloat(vectorDeviationAngleDeg.toFixed(1));

  // Reaction Similarity (0 - 100%)
  const similarity = Math.max(10, Math.min(99, Math.round(100 - deltaE * 3.2)));

  // Determine interference status
  let interferenceStatus: MatrixInterferenceAnalysis['interferenceStatus'] = 'LOW_DEVIATION';
  if (deltaE > 12.0 || vectorDeviationAngleDeg > 45) {
    interferenceStatus = 'ATYPICAL_MATRIX';
  } else if (deltaE > 5.5 || vectorDeviationAngleDeg > 20) {
    interferenceStatus = 'POTENTIAL_INTERFERENCE';
  }

  // Compile candidate interferents from profile or defaults
  const candidates: MatrixInterferenceCandidate[] = (
    reactionProfile?.interferenceProfiles?.map((ip) => ({
      name: ip.name,
      chemicalClass: ip.chemicalClass,
      typicalColorShift: ip.typicalColorShiftHex,
      likelihood: (deltaE > 8.0 ? 'HIGH' : (deltaE > 5.0 ? 'MODERATE' : 'LOW')) as 'LOW' | 'MODERATE' | 'HIGH',
      note: ip.note,
    })) || DEFAULT_INTERFERENTS
  ).map((c, i) => {
    // If high deviation, mark the most plausible interferent as MODERATE or HIGH
    if (interferenceStatus === 'ATYPICAL_MATRIX' && i === 1) {
      return { ...c, likelihood: 'MODERATE' as const };
    }
    if (interferenceStatus === 'POTENTIAL_INTERFERENCE' && i === 0) {
      return { ...c, likelihood: 'MODERATE' as const };
    }
    return c;
  });

  // Scientific explanation
  let interpretationNote = 'Reaction vector aligns closely with reference standard. No severe excipient matrix interference detected.';
  if (interferenceStatus === 'ATYPICAL_MATRIX') {
    interpretationNote =
      'Significant chromatic displacement (ΔE > 12.0) from expected target vector. Reaction kinetics or excipient matrix interactions suggest possible secondary adulteration or non-target substrate.';
  } else if (interferenceStatus === 'POTENTIAL_INTERFERENCE') {
    interpretationNote =
      'Moderate chromatic vector deviation observed. Potential matrix or cutting agent effect may be attenuating reaction chromophore development.';
  }

  return {
    enabled: true,
    reactionSimilarity: similarity,
    profileDeviationDeltaE: deltaE,
    vectorDeviationAngleDeg,
    potentialInterferences: candidates,
    interferenceStatus,
    interpretationNote,
    scientificDisclaimer:
      'Matrix / Interference Research Mode is a prototype qualitative analysis. It does NOT determine quantitative drug concentration or exact adulterant percentages. Confirmatory chromatographic/mass-spectrometric laboratory analysis is required.',
    profileSimilarityPercentage: similarity,
    vectorDeviationDeltaE: deltaE,
    matrixInterferenceNote: interpretationNote,
  };
}
