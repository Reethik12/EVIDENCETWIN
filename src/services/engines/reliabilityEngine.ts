import { EvidenceReliability, ImageQualityMetrics, CalibrationData, ReactionROI } from '../../types/evidence';

export interface ReliabilityInputs {
  imageQuality: ImageQualityMetrics;
  calibration: CalibrationData;
  roi: ReactionROI;
  classificationConfidence: number;
}

export function computeEvidenceReliability(inputs: ReliabilityInputs): EvidenceReliability {
  const { imageQuality, calibration, roi, classificationConfidence } = inputs;

  // Factor 1: Reference card visibility & patch stability
  const referenceScore = imageQuality.referenceDetected
    ? Math.max(70, Math.round(98 - calibration.averageDeltaE * 4))
    : 30;

  // Factor 2: Lighting adequacy
  const lightingScore = imageQuality.lighting;

  // Factor 3: Sharpness & edge definition
  const sharpnessScore = imageQuality.sharpness;

  // Factor 4: Exposure balance
  const exposureScore = imageQuality.exposure;

  // Factor 5: ROI localization quality & SNR
  const confNormalized = (roi.confidence !== null && roi.confidence !== undefined)
    ? (roi.confidence > 1 ? roi.confidence / 100 : roi.confidence)
    : 0.8;
  const roiScore = roi.detected ? Math.round(confNormalized * 92) : 25;

  // Factor 6: Color calibration accuracy
  const calibrationScore = calibration.status === 'CALIBRATION_ACCEPTED'
    ? Math.max(75, Math.round(96 - calibration.averageDeltaE * 3))
    : 45;

  // Factor 7: Classification confidence
  const classificationScore = classificationConfidence;

  const factors = [
    {
      id: 'reference',
      name: 'Reference Detection',
      score: referenceScore,
      weight: 0.18,
      description: '15-patch reference card presence, orientation, and color patch delineation',
    },
    {
      id: 'lighting',
      name: 'Lighting Uniformity',
      score: lightingScore,
      weight: 0.15,
      description: 'Ambient illumination stability and absence of severe chromatic casting',
    },
    {
      id: 'sharpness',
      name: 'Optical Sharpness',
      score: sharpnessScore,
      weight: 0.15,
      description: 'Spatial frequency resolution and reaction chamber edge gradient',
    },
    {
      id: 'exposure',
      name: 'Exposure Dynamic',
      score: exposureScore,
      weight: 0.14,
      description: 'Dynamic range headroom without clipping in highlight or shadow regions',
    },
    {
      id: 'roi',
      name: 'ROI Region Quality',
      score: roiScore,
      weight: 0.14,
      description: 'Reaction window segmentation fidelity and specular glare rejection',
    },
    {
      id: 'calibration',
      name: 'Calibration Precision',
      score: calibrationScore,
      weight: 0.12,
      description: 'Affine color space transformation residual delta-E tolerance',
    },
    {
      id: 'classification',
      name: 'Classification Fit',
      score: classificationScore,
      weight: 0.12,
      description: 'Statistical convergence toward empirical presumptive color matrix',
    },
  ];

  // Weighted composite score calculation
  const rawComposite = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const finalScore = Math.round(rawComposite);

  let status: EvidenceReliability['status'] = 'ACCEPTABLE_FOR_FIELD_ANALYSIS';
  let engineeringNote = 'All optical and calibration metrics satisfy standard field screening thresholds.';

  if (finalScore < 65 || !imageQuality.referenceDetected || roiScore < 50) {
    status = 'MANUAL_REVIEW_RECOMMENDED';
    engineeringNote = 'Perturbations or degraded optical conditions detected. Officer manual verification advised.';
  } else if (finalScore < 50) {
    status = 'INSUFFICIENT_EVIDENCE_QUALITY';
    engineeringNote = 'Critical evidence degradation. Retake field test capture under improved lighting.';
  }

  return {
    score: finalScore,
    status,
    factors,
    engineeringNote,
  };
}
