import { CryptographicHashes, DigitalEvidenceRecord } from '../../types/evidence';

/**
 * Native SHA-256 hash using the Web Cryptography API
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes hash of an ArrayBuffer or Blob (e.g. captured image)
 */
export async function sha256Buffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates the full 4-tier cryptographic hash chain for an evidence record
 */
export async function generateEvidenceHashChain(params: {
  imagePayload: string;
  calibrationPayload: object;
  analysisPayload: object;
  previousRecordHash: string;
  blockHeight: number;
}): Promise<CryptographicHashes> {
  // 1. Image hash
  const imageSha256 = await sha256(params.imagePayload);

  // 2. Calibration hash (links imageHash + calibration matrix)
  const calibrationStr = JSON.stringify({
    parentImageHash: imageSha256,
    calibration: params.calibrationPayload,
  });
  const calibrationHash = await sha256(calibrationStr);

  // 3. Analysis hash (links calibrationHash + reaction ROI + classification)
  const analysisStr = JSON.stringify({
    parentCalibrationHash: calibrationHash,
    analysis: params.analysisPayload,
  });
  const analysisHash = await sha256(analysisStr);

  // 4. Evidence Record Seal (combines analysisHash + previousRecordHash + metadata)
  const recordSealStr = JSON.stringify({
    previousRecordHash: params.previousRecordHash,
    analysisHash,
    blockHeight: params.blockHeight,
  });
  const recordHash = await sha256(recordSealStr);

  return {
    imageSha256,
    calibrationHash,
    analysisHash,
    recordHash,
    previousRecordHash: params.previousRecordHash,
    signatureAlgorithm: 'SHA-256 / ED25519-PREVIEW',
    blockHeight: params.blockHeight,
  };
}

/**
 * Verifies the integrity of a stored evidence record by recomputing all stage hashes
 */
export async function verifyEvidenceIntegrity(record: DigitalEvidenceRecord): Promise<{
  valid: boolean;
  computedRecordHash: string;
  storedRecordHash: string;
  chainValid: boolean;
  discrepancies: string[];
}> {
  const discrepancies: string[] = [];

  // Recompute calibration hash
  const calibrationStr = JSON.stringify({
    parentImageHash: record.hashes.imageSha256,
    calibration: record.calibration,
  });
  const computedCalibrationHash = await sha256(calibrationStr);
  if (computedCalibrationHash !== record.hashes.calibrationHash) {
    discrepancies.push(`Calibration hash mismatch: expected ${record.hashes.calibrationHash.slice(0, 12)}..., calculated ${computedCalibrationHash.slice(0, 12)}...`);
  }

  // Recompute analysis hash
  const analysisStr = JSON.stringify({
    parentCalibrationHash: record.hashes.calibrationHash,
    analysis: {
      result: record.presumptiveResult,
      confidence: record.confidencePercentage,
      roi: record.roi,
      reliability: record.reliability.score,
    },
  });
  const computedAnalysisHash = await sha256(analysisStr);
  if (computedAnalysisHash !== record.hashes.analysisHash) {
    discrepancies.push(`Analysis payload hash mismatch: integrity failure in classification data.`);
  }

  // Recompute record seal
  const recordSealStr = JSON.stringify({
    previousRecordHash: record.hashes.previousRecordHash,
    analysisHash: record.hashes.analysisHash,
    blockHeight: record.hashes.blockHeight,
  });
  const computedRecordHash = await sha256(recordSealStr);
  if (computedRecordHash !== record.hashes.recordHash) {
    discrepancies.push(`Final record seal mismatch: expected ${record.hashes.recordHash.slice(0, 12)}..., calculated ${computedRecordHash.slice(0, 12)}...`);
  }

  const valid = discrepancies.length === 0;

  return {
    valid,
    computedRecordHash,
    storedRecordHash: record.hashes.recordHash,
    chainValid: valid,
    discrepancies,
  };
}
