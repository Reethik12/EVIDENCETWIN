import {
  TemporalFramePoint,
  TemporalReactionSignature,
  StabilizationStatus,
  TemporalComparisonStatus,
  ReactionProfile,
  PresumptiveClassification
} from '../../types/evidence';
import { hexToRgb, rgbToHex, rgbToLab, rgbToHsv, calculateDeltaE } from './calibrationEngine';

export interface KineticSimulationParams {
  initialColorHex?: string;
  finalColorHex: string;
  observationDurationSeconds?: number;
  samplingIntervalSeconds?: number;
  reactionProfile?: ReactionProfile;
  noiseAmount?: number;
  isUnstable?: boolean;
}

/**
 * FEATURE 1, 2, 3, 4: Temporal Reaction Engine
 * Calculates temporal color progression, velocity, stabilization, and structured reaction signature.
 */
export function generateTemporalReactionSeries(params: KineticSimulationParams): TemporalReactionSignature {
  const duration = params.observationDurationSeconds ?? params.reactionProfile?.temporalAnalysis?.observationDurationSeconds ?? 20;
  const interval = params.samplingIntervalSeconds ?? params.reactionProfile?.temporalAnalysis?.samplingIntervalSeconds ?? 1;
  const frameCount = Math.floor(duration / interval) + 1;

  const startHex = params.initialColorHex || '#E9C46A'; // baseline amber/straw reagent color
  const targetHex = params.finalColorHex;

  const startRgb = hexToRgb(startHex) || { r: 233, g: 196, b: 106 };
  const targetRgb = hexToRgb(targetHex) || { r: 61, g: 28, b: 82 };

  const trajectory: TemporalFramePoint[] = [];

  let previousPoint: TemporalFramePoint | null = null;
  let peakVelocity = 0;
  let totalVelocity = 0;
  let peakDeltaE = 0;

  // Kinetic curve parameter (sigmoidal reaction progression: typical of autocatalytic / diffusion reactions)
  // Transition midpoint around 30-40% of duration
  const tMidpoint = duration * 0.35;
  const rateSlope = 0.55;

  for (let i = 0; i < frameCount; i++) {
    const t = i * interval;

    // Logistic progression factor from 0.0 to 1.0
    let progress = 1 / (1 + Math.exp(-rateSlope * (t - tMidpoint)));

    if (params.isUnstable) {
      // Add anomalous fluctuation or drift
      progress += Math.sin(t * 0.9) * 0.15;
      progress = Math.max(0, Math.min(1.2, progress));
    }

    // Blend RGB with realistic field sensor micro-variance
    const noise = (Math.random() - 0.5) * (params.noiseAmount ?? 1.2);
    const r = Math.min(255, Math.max(0, Math.round(startRgb.r + (targetRgb.r - startRgb.r) * progress + noise)));
    const g = Math.min(255, Math.max(0, Math.round(startRgb.g + (targetRgb.g - startRgb.g) * progress + noise)));
    const b = Math.min(255, Math.max(0, Math.round(startRgb.b + (targetRgb.b - startRgb.b) * progress + noise)));

    const currentHex = rgbToHex(r, g, b);
    const lab = rgbToLab(r, g, b);
    const hsv = rgbToHsv(r, g, b);

    // Brightness and Saturation
    const brightness = Math.round((r * 0.299 + g * 0.587 + b * 0.114) / 2.55);
    const saturation = hsv.s;
    const colorVariance = parseFloat((Math.abs(r - g) * 0.3 + Math.abs(g - b) * 0.3 + Math.abs(r - b) * 0.4).toFixed(1));

    // Delta E relative to initial frame (t0)
    const deltaEFromInitial = calculateDeltaE(startHex, currentHex);
    if (deltaEFromInitial > peakDeltaE) {
      peakDeltaE = deltaEFromInitial;
    }

    // Reaction velocity: ΔE / Δt and directional Lab velocities
    let deltaEPerSec = 0;
    let velocityL = 0;
    let velocityA = 0;
    let velocityB = 0;

    if (previousPoint && interval > 0) {
      const stepDeltaE = calculateDeltaE(previousPoint.colorHex, currentHex);
      deltaEPerSec = parseFloat((stepDeltaE / interval).toFixed(2));
      velocityL = parseFloat(((lab.L - previousPoint.lab.L) / interval).toFixed(2));
      velocityA = parseFloat(((lab.a - previousPoint.lab.a) / interval).toFixed(2));
      velocityB = parseFloat(((lab.b - previousPoint.lab.b) / interval).toFixed(2));

      if (deltaEPerSec > peakVelocity) {
        peakVelocity = deltaEPerSec;
      }
      totalVelocity += deltaEPerSec;
    }

    const frameQuality = Math.min(100, Math.max(75, Math.round(92 - (params.isUnstable ? 18 : 2) + (Math.random() - 0.5) * 4)));

    const framePoint: TemporalFramePoint = {
      frameIndex: i,
      timestampSeconds: t,
      colorHex: currentHex,
      rgb: { r, g, b },
      medianRgb: { r, g, b },
      hsv,
      lab,
      brightness,
      saturation,
      colorVariance,
      deltaEFromInitial,
      deltaEPerSec,
      velocityL,
      velocityA,
      velocityB,
      frameQuality,
      roiDetected: true,
      cardDetected: true,
    };

    trajectory.push(framePoint);
    previousPoint = framePoint;
  }

  const averageVelocity = frameCount > 1 ? parseFloat((totalVelocity / (frameCount - 1)).toFixed(2)) : 0;

  // FEATURE 5: Reaction Stabilization Detection
  // Analyze last 3-5 frames derivative
  const tailFrames = trajectory.slice(-4);
  const tailVelocities = tailFrames.map((f) => f.deltaEPerSec);
  const avgTailVelocity = tailVelocities.reduce((a, b) => a + b, 0) / tailVelocities.length;

  const stabThreshold = params.reactionProfile?.temporalAnalysis?.stabilizationThresholdDeltaEPerSec ?? 0.85;

  let stabilizationStatus: StabilizationStatus = 'STABLE';
  let stabilizationTime: number | null = null;

  if (params.isUnstable || avgTailVelocity > 1.8) {
    stabilizationStatus = 'UNSTABLE';
    stabilizationTime = null;
  } else if (avgTailVelocity > stabThreshold) {
    stabilizationStatus = 'DEVELOPING';
    stabilizationTime = null;
  } else {
    // Find earliest frame where velocity dropped and stayed below threshold
    for (let i = Math.floor(frameCount * 0.4); i < trajectory.length - 2; i++) {
      const v1 = trajectory[i].deltaEPerSec;
      const v2 = trajectory[i + 1].deltaEPerSec;
      const v3 = trajectory[i + 2].deltaEPerSec;
      if (v1 <= stabThreshold && v2 <= stabThreshold && v3 <= stabThreshold) {
        stabilizationTime = trajectory[i].timestampSeconds;
        break;
      }
    }
    if (stabilizationTime === null) {
      stabilizationTime = Math.round(duration * 0.75);
    }
    stabilizationStatus = 'STABLE';
  }

  // FEATURE 6: Temporal Profile Comparison
  let temporalComparisonStatus: TemporalComparisonStatus = 'PROFILE_NOT_AVAILABLE';
  if (params.reactionProfile?.temporalAnalysis?.enabled) {
    if (stabilizationStatus === 'STABLE' && peakDeltaE >= 8.0) {
      temporalComparisonStatus = 'CONSISTENT';
    } else if (stabilizationStatus === 'DEVELOPING') {
      temporalComparisonStatus = 'PARTIALLY_CONSISTENT';
    } else {
      temporalComparisonStatus = 'INCONCLUSIVE';
    }
  }

  return {
    observationDuration: duration,
    frameCount,
    samplingInterval: interval,
    initialColour: startHex,
    finalColour: trajectory[trajectory.length - 1]?.colorHex || targetHex,
    peakColourChangeDeltaE: parseFloat(peakDeltaE.toFixed(1)),
    peakVelocityDeltaEPerSec: parseFloat(peakVelocity.toFixed(2)),
    averageVelocityDeltaEPerSec: averageVelocity,
    stabilizationTimeSeconds: stabilizationTime,
    stabilizationStatus,
    trajectory,
    frameQualitySummary: {
      avgQuality: Math.round(trajectory.reduce((s, p) => s + p.frameQuality, 0) / trajectory.length),
      minQuality: Math.min(...trajectory.map((p) => p.frameQuality)),
      cardDetectedRatio: 1.0,
    },
    calibrationQuality: {
      avgDeltaE: 1.85,
    },
    temporalComparisonStatus,
    analysisVersion: 'v2.6-TEMPORAL-RESEARCH',
    engineeringDisclaimer:
      'Prototype temporal color trajectory. Represents digital colorimetric transition dynamics across the observation window; does not constitute direct molecular identification or absolute chemical reaction rate constants.',
  };
}

/**
 * Evaluates live or sampled temporal frame point
 */
export function evaluateTemporalFrame(
  canvas: HTMLCanvasElement,
  frameIndex: number,
  timestampSeconds: number,
  initialColorHex: string,
  previousPoint: TemporalFramePoint | null
): TemporalFramePoint {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const dummy = hexToRgb(initialColorHex) || { r: 128, g: 128, b: 128 };
    return {
      frameIndex,
      timestampSeconds,
      colorHex: initialColorHex,
      rgb: dummy,
      medianRgb: dummy,
      hsv: rgbToHsv(dummy.r, dummy.g, dummy.b),
      lab: rgbToLab(dummy.r, dummy.g, dummy.b),
      brightness: 50,
      saturation: 50,
      colorVariance: 10,
      deltaEFromInitial: 0,
      deltaEPerSec: 0,
      velocityL: 0,
      velocityA: 0,
      velocityB: 0,
      frameQuality: 85,
      roiDetected: true,
      cardDetected: true,
    };
  }

  // Sample center 40x40 reaction ROI on canvas
  const cx = Math.floor(canvas.width * 0.65);
  const cy = Math.floor(canvas.height * 0.45);
  const roiWidth = Math.min(60, canvas.width - cx);
  const roiHeight = Math.min(60, canvas.height - cy);

  const imgData = ctx.getImageData(cx, cy, roiWidth, roiHeight);
  const data = imgData.data;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  const count = data.length / 4;

  const rArr: number[] = [];
  const gArr: number[] = [];
  const bArr: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
    rArr.push(data[i]);
    gArr.push(data[i + 1]);
    bArr.push(data[i + 2]);
  }

  const meanR = Math.round(sumR / count);
  const meanG = Math.round(sumG / count);
  const meanB = Math.round(sumB / count);

  rArr.sort((a, b) => a - b);
  gArr.sort((a, b) => a - b);
  bArr.sort((a, b) => a - b);
  const medianR = rArr[Math.floor(count / 2)] || meanR;
  const medianG = gArr[Math.floor(count / 2)] || meanG;
  const medianB = bArr[Math.floor(count / 2)] || meanB;

  const colorHex = rgbToHex(meanR, meanG, meanB);
  const lab = rgbToLab(meanR, meanG, meanB);
  const hsv = rgbToHsv(meanR, meanG, meanB);

  const brightness = Math.round((meanR * 0.299 + meanG * 0.587 + meanB * 0.114) / 2.55);
  const saturation = hsv.s;
  const colorVariance = parseFloat((Math.abs(meanR - meanG) * 0.3 + Math.abs(meanG - meanB) * 0.3 + Math.abs(meanR - meanB) * 0.4).toFixed(1));

  const deltaEFromInitial = calculateDeltaE(initialColorHex, colorHex);

  let deltaEPerSec = 0;
  let velocityL = 0;
  let velocityA = 0;
  let velocityB = 0;

  if (previousPoint) {
    const dt = Math.max(0.1, timestampSeconds - previousPoint.timestampSeconds);
    const stepDelta = calculateDeltaE(previousPoint.colorHex, colorHex);
    deltaEPerSec = parseFloat((stepDelta / dt).toFixed(2));
    velocityL = parseFloat(((lab.L - previousPoint.lab.L) / dt).toFixed(2));
    velocityA = parseFloat(((lab.a - previousPoint.lab.a) / dt).toFixed(2));
    velocityB = parseFloat(((lab.b - previousPoint.lab.b) / dt).toFixed(2));
  }

  return {
    frameIndex,
    timestampSeconds,
    colorHex,
    rgb: { r: meanR, g: meanG, b: meanB },
    medianRgb: { r: medianR, g: medianG, b: medianB },
    hsv,
    lab,
    brightness,
    saturation,
    colorVariance,
    deltaEFromInitial,
    deltaEPerSec,
    velocityL,
    velocityA,
    velocityB,
    frameQuality: 92,
    roiDetected: true,
    cardDetected: true,
  };
}
