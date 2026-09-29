import {
  PresumptiveClassification,
  TestKitProfile,
  ReactionProfile,
  ExpectedColourRegion
} from '../../types/evidence';
import { calculateDeltaE } from './calibrationEngine';

export interface ClassificationResult {
  presumptiveResult: PresumptiveClassification;
  confidencePercentage: number;
  matchedReactionLabel: string;
  reactionDescription: string;
  closestColorHex: string;
  deltaEToTarget: number;
  scientificDisclaimer: string;
  interpretationMethod: string;
}

/**
 * Universal Classification Engine
 * Evaluates calibrated reaction color against the selected ReactionProfile or TestKitProfile.
 * Entirely decoupled from specific test kit names or hardcoded substances.
 */
export function classifyReaction(
  calibratedColorHex: string,
  kitProfile: TestKitProfile,
  reactionProfile?: ReactionProfile
): ClassificationResult {
  // If a specific ReactionProfile is provided, use its expectedColourRegions
  if (reactionProfile && reactionProfile.expectedColourRegions?.length > 0) {
    let closestMatch: ExpectedColourRegion = reactionProfile.expectedColourRegions[0];
    let minDelta = Infinity;

    for (const candidate of reactionProfile.expectedColourRegions) {
      const delta = calculateDeltaE(calibratedColorHex, candidate.colorHex);
      if (delta < minDelta) {
        minDelta = delta;
        closestMatch = candidate;
      }
    }

    const maxTolerance = closestMatch.deltaETolerance || reactionProfile.interpretationRules?.maxDeltaE || 14.0;

    // Calculate mathematically continuous confidence derived strictly from CIEDE2000 ΔE distance
    const normalizedDist = minDelta / Math.max(4.0, maxTolerance);
    const confidence = Math.max(35, Math.min(98, Math.round(98 - normalizedDist * 42)));

    let result = closestMatch.result;
    if (minDelta > maxTolerance || confidence < (reactionProfile.interpretationRules?.minConfidence || 58)) {
      result = 'INCONCLUSIVE';
    }

    return {
      presumptiveResult: result,
      confidencePercentage: confidence,
      matchedReactionLabel: closestMatch.label,
      reactionDescription: closestMatch.meaning,
      closestColorHex: closestMatch.colorHex,
      deltaEToTarget: parseFloat(minDelta.toFixed(1)),
      scientificDisclaimer:
        'Presumptive field-test result. Physical reagent chemical reaction digitally measured; confirmatory laboratory analysis (GC-MS / HPLC) is required for definitive identification.',
      interpretationMethod: `Profile Rule (${reactionProfile.interpretationRules?.method || 'THRESHOLD'})`,
    };
  }

  // Fallback to kit-level colorResponseChart
  const candidates = kitProfile.colorResponseChart || [];
  if (candidates.length === 0) {
    return {
      presumptiveResult: 'INCONCLUSIVE',
      confidencePercentage: 0,
      matchedReactionLabel: 'Profile Definition Unavailable',
      reactionDescription: 'No valid color response chart configured for this profile.',
      closestColorHex: '#808080',
      deltaEToTarget: 99,
      scientificDisclaimer: 'Presumptive field-test result. Inconclusive due to missing profile response data.',
      interpretationMethod: 'Unconfigured Profile Fallback',
    };
  }

  let closestMatch = candidates[0];
  let minDelta = Infinity;

  for (const candidate of candidates) {
    const delta = calculateDeltaE(calibratedColorHex, candidate.colorHex);
    if (delta < minDelta) {
      minDelta = delta;
      closestMatch = candidate;
    }
  }

  const confidence = Math.max(35, Math.min(96, Math.round(96 - (minDelta / 15.0) * 45)));

  let result = closestMatch.result;
  if (minDelta > 15.0 || confidence < 58) {
    result = 'INCONCLUSIVE';
  }

  return {
    presumptiveResult: result,
    confidencePercentage: confidence,
    matchedReactionLabel: closestMatch.label,
    reactionDescription: closestMatch.meaning,
    closestColorHex: closestMatch.colorHex,
    deltaEToTarget: parseFloat(minDelta.toFixed(1)),
    scientificDisclaimer:
      'Presumptive field-test result. Physical reagent chemical reaction digitally measured; confirmatory laboratory analysis is required.',
    interpretationMethod: 'Kit Colorimetric Envelope Match',
  };
}
