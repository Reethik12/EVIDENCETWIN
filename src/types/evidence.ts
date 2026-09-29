export type PresumptiveClassification = 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE';

export type IntegrityStatus = 'VERIFIED' | 'MISMATCH' | 'UNVERIFIED';

export type QualityGrade = 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED' | 'UNSUITABLE';

export type StabilizationStatus =
  | 'DEVELOPING'
  | 'STABILIZING'
  | 'STABLE'
  | 'UNSTABLE'
  | 'INSUFFICIENT_DATA';

export type TemporalComparisonStatus =
  | 'CONSISTENT'
  | 'PARTIALLY_CONSISTENT'
  | 'INCONCLUSIVE'
  | 'PROFILE_NOT_AVAILABLE';

/**
 * Explicit Evidence Validation Pipeline State Machine
 */
export type EvidencePipelineStatus =
  | 'IMAGE_INVALID'
  | 'REFERENCE_CARD_NOT_FOUND'
  | 'REFERENCE_CARD_INCOMPLETE'
  | 'REACTION_ROI_NOT_FOUND'
  | 'ROI_INVALID'
  | 'IMAGE_QUALITY_FAILED'
  | 'CALIBRATION_FAILED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'READY_FOR_ANALYSIS'
  | 'ANALYZING'
  | 'ANALYSIS_COMPLETE'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'PROCESSING_ERROR';

export type EvidenceGateVerdict = 'PASS' | 'BLOCKED';

export interface EvidenceGateResult {
  verdict: EvidenceGateVerdict;
  status: EvidencePipelineStatus;
  reasons: string[];
  requiredActions: string[];
  details: {
    imageValid: boolean;
    referenceCardDetected: boolean;
    detectedPatchCount: number;
    requiredPatchCount: number;
    referenceConfidence: number | null; // null if unavailable
    roiDetected: boolean;
    roiValid: boolean;
    roiSelectionMethod: 'AUTOMATIC' | 'MANUAL' | 'NONE';
    calibrationPerformed: boolean;
    qualityPassed: boolean;
  };
}

export interface ReferenceCardDetectionResult {
  detected: boolean;
  confidence: number | null; // null if unavailable
  patchCount: number;
  requiredPatchCount: number;
  detectedPatches: Array<{
    id: string;
    name: string;
    expectedHex: string;
    detectedHex: string;
    deltaE: number;
    matched: boolean;
    pixelBounds?: { x: number; y: number; width: number; height: number };
  }>;
  cardBoundingBox?: { x: number; y: number; width: number; height: number };
  polygon?: Array<{ x: number; y: number }>;
  corners?: Array<[number, number]>;
  perspectiveSkewRatio?: number;
  statusMessage: string;
  rectifiedCardBase64?: string;
  debugImageBase64?: string;
}

export interface TestKitDetectionResult {
  detected: boolean;
  confidence: number | null;
  boundingBox?: { x: number; y: number; width: number; height: number };
  polygon?: Array<{ x: number; y: number }>;
  corners?: Array<[number, number]>;
  statusMessage: string;
  profileId?: string;
  swatchesDetected?: number;
}

export interface ImageQualityMetrics {
  sharpness: number; // 0 - 100
  lighting: number; // 0 - 100
  exposure: number; // 0 - 100
  referenceDetected: boolean;
  roiQuality: number; // 0 - 100
  overallQuality: QualityGrade;
  colorTemperatureK: number | null; // null if uncalibrated/unavailable
  contrastRatio: number;
  snrDb: number | null; // null if unavailable
  lightingUniformity?: number;
  clippingRatio?: number;
  glareDetected?: boolean;
}

export interface ReferenceColorTile {
  id: string;
  name: string;
  expectedHex: string;
  detectedHex: string;
  calibratedHex: string;
  deltaE: number;
  tolerance: number;
}

export interface ReferenceCardPatch {
  id: string;
  name: string;
  expectedHex: string;
  position: { x: number; y: number };
  tolerance: number;
}

export interface ReferenceCardConfig {
  type: string;
  name: string;
  patchCount: number;
  patches: ReferenceCardPatch[];
}

export interface CalibrationData {
  status: 'CALIBRATION_ACCEPTED' | 'CALIBRATION_MARGINAL' | 'CALIBRATION_REJECTED';
  averageDeltaE: number;
  whiteBalanceK: number;
  correctionMatrix: number[][]; // 3x3 RGB affine transformation
  tiles: ReferenceColorTile[];
  timestamp: string;
  calibrationMethod?: 'AUTOMATIC' | 'MANUAL';
  cardRegion?: { x: number; y: number; width: number; height: number };
}

export interface ReactionROI {
  detected: boolean;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  polygon?: Array<{ x: number; y: number }>;
  rawColorHex: string;
  calibratedColorHex: string;
  dominantLab: { L: number; a: number; b: number };
  spectralProfile: number[]; // 8-band visible approximation
  selectionMethod?: 'AUTOMATIC' | 'MANUAL';
  glareDetected?: boolean;
}

export interface ReliabilityFactor {
  id: string;
  name: string;
  score: number; // 0 - 100
  weight: number; // sum to 1.0
  description: string;
}

export interface EvidenceReliability {
  score: number; // 0 - 100 weighted
  status: 'ACCEPTABLE_FOR_FIELD_ANALYSIS' | 'MANUAL_REVIEW_RECOMMENDED' | 'INSUFFICIENT_EVIDENCE_QUALITY';
  factors: ReliabilityFactor[];
  engineeringNote: string;
}

export interface PerturbationVariant {
  id: string;
  parameter: string;
  deviation: string;
  result: PresumptiveClassification;
  confidence: number;
  stable: boolean;
  deltaE: number;
  details?: string;
}

export interface RobustnessAnalysis {
  stabilityScore: number; // 0 - 100
  stabilityStatus: 'HIGH' | 'MODERATE' | 'LOW';
  variants: PerturbationVariant[];
  reviewRequired: boolean;
  recommendationNote: string;
}

export interface CryptographicHashes {
  imageSha256: string;
  calibrationHash: string;
  analysisHash: string;
  recordHash: string;
  previousRecordHash: string;
  signatureAlgorithm: 'SHA-256 / ED25519-PREVIEW';
  blockHeight: number;
}

export type SyncStatus = 'SYNCED' | 'PENDING_SYNC' | 'LOCAL_ONLY';

export interface HumanInterpretation {
  operatorInterpretation: PresumptiveClassification | null;
  agreementStatus: 'AGREEMENT' | 'DISAGREEMENT' | 'PENDING';
  operatorNotes: string;
  recordedAt: string;
}

export interface ImageIntegrityCheck {
  fileType: string;
  dimensions: { width: number; height: number };
  sizeBytes: number;
  imageSha256: string;
  metadataConsistency: 'VALID' | 'WARNING' | 'INVALID';
  duplicateHashDetected: boolean;
  timestampConsistency: 'CONSISTENT' | 'CHECK_REQUIRED';
  compressionArtifacts: 'LOW' | 'MODERATE' | 'HIGH';
  overallStatus: 'PASSED' | 'WARNING' | 'REJECTED';
}

export interface EvidenceTimelineEvent {
  id: string;
  stage:
    | 'CAPTURE'
    | 'TEMPORAL_OBSERVATION'
    | 'CARD_DETECTION'
    | 'CALIBRATION'
    | 'ROI_EXTRACTION'
    | 'CLASSIFICATION'
    | 'RELIABILITY'
    | 'SENSITIVITY'
    | 'HUMAN_INTERPRETATION'
    | 'MULTI_WITNESS_SEAL'
    | 'RECORD_SEAL'
    | 'HASH_CHAIN'
    | 'INTEGRITY_VERIFIED';
  label: string;
  timestamp: string;
  status: 'VERIFIED' | 'COMPLETED' | 'ATTENTION' | 'PENDING';
  details: string;
  hash?: string;
}

// FEATURE 1, 2, 3, 4: Temporal Trajectory & Fingerprint Definitions
export interface TemporalFramePoint {
  frameIndex: number;
  timestampSeconds: number;
  colorHex: string;
  rgb: { r: number; g: number; b: number };
  medianRgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  lab: { L: number; a: number; b: number };
  brightness: number;
  saturation: number;
  colorVariance: number;
  deltaEFromInitial: number;
  deltaEPerSec: number;
  velocityL: number;
  velocityA: number;
  velocityB: number;
  frameQuality: number;
  roiDetected: boolean;
  cardDetected: boolean;
}

export interface TemporalReactionSignature {
  observationDuration: number; // e.g. 20s
  frameCount: number; // e.g. 21 frames
  samplingInterval: number; // e.g. 1 frame / second
  initialColour: string;
  finalColour: string;
  peakColourChangeDeltaE: number;
  totalColourChangeDeltaE?: number;
  peakVelocityDeltaEPerSec: number;
  averageVelocityDeltaEPerSec: number;
  stabilizationTimeSeconds: number | null;
  stabilizationStatus: StabilizationStatus;
  trajectory: TemporalFramePoint[];
  frameQualitySummary: {
    avgQuality: number;
    minQuality: number;
    cardDetectedRatio: number;
  };
  calibrationQuality: {
    avgDeltaE: number;
  };
  temporalComparisonStatus: TemporalComparisonStatus;
  analysisVersion: string;
  engineeringDisclaimer: string;
}

// FEATURE 9 & 10: Environmental Capture & Lighting Analysis
export interface SpecularHighlightRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  severity: 'LOW' | 'HIGH';
  isNearRoi: boolean;
}

export interface EnvironmentalLightingAnalysis {
  lightingCondition: 'GOOD' | 'ACCEPTABLE' | 'POOR';
  colorCast: 'LOW' | 'MODERATE' | 'HIGH';
  estimatedKelvin: number;
  brightnessUniformity: number; // 0 - 100
  glareSeverity: 'LOW' | 'MODERATE' | 'HIGH';
  glarePercentage: number;
  shadowSeverity: 'LOW' | 'MODERATE' | 'HIGH';
  shadowPercentage: number;
  unevenIllumination: boolean;
  specularRegions: SpecularHighlightRegion[];
  prototypeNormalizationApplied: boolean;
  engineeringNote: string;

  // Compatibility aliases
  overallIlluminationQuality?: string;
  uniformityScore?: number;
  colorTemperatureKelvin?: number;
  kelvinQuality?: string;
  specularHighlightSeverity?: string;
  estimatedLux?: number;
}

// FEATURE 7: Multi-Matrix & Excipient Interference Analysis
export interface MatrixInterferenceCandidate {
  name: string;
  chemicalClass: string;
  likelihood: 'LOW' | 'MODERATE' | 'HIGH';
  typicalColorShift: string;
  note: string;
}

export interface MatrixInterferenceAnalysis {
  enabled: boolean;
  reactionSimilarity: number; // 0 - 100%
  profileDeviationDeltaE: number;
  vectorDeviationAngleDeg: number;
  potentialInterferences: MatrixInterferenceCandidate[];
  interferenceStatus: 'LOW_DEVIATION' | 'POTENTIAL_INTERFERENCE' | 'ATYPICAL_MATRIX';
  interpretationNote: string;
  scientificDisclaimer: string;

  // Compatibility aliases
  profileSimilarityPercentage?: number;
  vectorDeviationDeltaE?: number;
  matrixInterferenceNote?: string;
}

// OPTIONAL MULTI-WITNESS SEAL
export interface OfficerCredential {
  id: string;
  name: string;
  badgeNumber: string;
  division: string;
  role: string;
  timestamp: string;
  signatureHash: string;
}

export interface MultiWitnessSeal {
  primaryOfficer: OfficerCredential;
  secondaryWitness?: OfficerCredential;
  sealedAt: string;
  multiWitnessStatus: 'SINGLE_SEAL' | 'DUAL_WITNESS_SEALED';
  sealHash: string;

  // Compatibility aliases
  status?: string;
  primaryOfficerName?: string;
  primaryOfficerId?: string;
  witnessOfficerName?: string;
  witnessOfficerId?: string;
  dualSignatureHash?: string;
}

// UNIVERSAL REACTION PROFILE
export interface ExpectedColourRegion {
  result: PresumptiveClassification;
  classification?: PresumptiveClassification;
  colorHex: string;
  label: string;
  meaning: string;
  deltaETolerance: number;
}

export interface ReactionProfile {
  id: string;
  name: string;
  code: string;
  reagentDescription: string;
  targetCategory: string;
  reactionWindowSeconds: number;
  chemicalMechanism: string;
  knownInterferents: string[];
  expectedColourRegions: ExpectedColourRegion[];
  interpretationRules: {
    method: 'THRESHOLD' | 'RULE_BASED' | 'SPECTRAL_CURVE';
    maxDeltaE: number;
    minConfidence: number;
  };
  calibrationRequirements: {
    minCardPatches: number;
    maxResidualDeltaE: number;
  };
  profileVersion: string;
  version?: string;
  status: 'PROTOTYPE' | 'ACTIVE' | 'EXPERIMENTAL';
  temporalAnalysis?: {
    enabled: boolean;
    observationDurationSeconds: number;
    samplingIntervalSeconds: number;
    stabilizationThresholdDeltaEPerSec: number;
    expectedTrajectory?: Array<{ t: number; colorHex: string; deltaE: number }>;
  };
  interferenceProfiles?: Array<{
    name: string;
    chemicalClass: string;
    typicalColorShiftHex: string;
    deltaEVec: { dL: number; da: number; db: number };
    note: string;
  }>;
}

// UNIVERSAL TEST KIT PROFILE
export interface TestKitProfile {
  id: string;
  name: string;
  code: string;
  manufacturer: string;
  testType: string;
  targetCategory: string;
  profileVersion: string;
  status: 'PROTOTYPE' | 'ACTIVE' | 'EXPERIMENTAL';
  referenceCard: ReferenceCardConfig;
  reactionProfiles: ReactionProfile[];
  calibrationMethod: 'AFFINE_PATCH_NORMALIZATION' | 'WHITE_BALANCE' | 'DEVICE_AWARE';
  handlingWarnings: string[];
  disposalProtocol: string;
  version: string;

  // Compatibility fields for existing code references:
  targetSubstances: string[];
  reagentType: string;
  reactionWindowSeconds: number;
  referenceColors: { name: string; hex: string; role: string }[];
  colorResponseChart: { result: PresumptiveClassification; colorHex: string; label: string; meaning: string }[];
  knownInterferents?: string[];
  chemicalMechanism?: string;
}

// COMPLETE FORENSIC DIGITAL EVIDENCE RECORD
export interface DigitalEvidenceRecord {
  id: string;
  testId: string;
  caseId: string;
  operatorId: string;
  operatorName: string;
  locationTag: string;
  timestamp: string;
  kitProfileId: string;
  kitName: string;
  kitProfileVersion: string;
  reactionProfileId: string;
  reactionProfileName: string;
  reactionProfileVersion: string;
  targetAnalyte: string;
  presumptiveResult: PresumptiveClassification;
  confidencePercentage: number;
  reactionDescription: string;
  imageQuality: ImageQualityMetrics;
  calibration: CalibrationData;
  calibrationMethod: 'AUTOMATIC' | 'MANUAL';
  roi: ReactionROI;
  roiMethod: 'AUTOMATIC' | 'MANUAL';
  reliability: EvidenceReliability;
  robustness: RobustnessAnalysis;
  hashes: CryptographicHashes;
  verificationStatus: IntegrityStatus;
  manualReviewFlags: string[];
  imageUrl: string;
  isDemoSample: boolean;
  humanInterpretation?: HumanInterpretation;
  integrityChecks?: ImageIntegrityCheck;
  timelineEvents?: EvidenceTimelineEvent[];
  syncStatus?: SyncStatus;

  // Advanced Innovation Upgrade Fields
  temporalSignature?: TemporalReactionSignature;
  lightingAnalysis?: EnvironmentalLightingAnalysis;
  matrixInterference?: MatrixInterferenceAnalysis;
  multiWitnessSeal?: MultiWitnessSeal;
  cvDebugImageUrl?: string;
  cvRectifiedCardUrl?: string;
  cvProcessingTimeMs?: number;
  cvEngineVersion?: string;
  cvPipelineStatus?: 'READY_FOR_ANALYSIS' | 'ANALYSIS_COMPLETE' | 'UNPROCESSED';
  appVersion: string;
  engineVersion: string;
}
