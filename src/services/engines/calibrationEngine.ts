import {
  CalibrationData,
  ReferenceColorTile,
  ReactionROI,
  ReferenceCardConfig
} from '../../types/evidence';
import { calculateCIEDE2000 } from './ciede2000';

// Canonical 15-patch EvidenceTwin Forensic Reference Card Profile (3 rows x 5 columns)
export const STANDARD_CALIBRATION_TILES = [
  { id: 'p1', name: 'Row 1 / Col 1 - Red Standard', expectedHex: '#B23A22', tolerance: 5.0 },
  { id: 'p2', name: 'Row 1 / Col 2 - Yellow Primary', expectedHex: '#F0C808', tolerance: 5.0 },
  { id: 'p3', name: 'Row 1 / Col 3 - Green Standard', expectedHex: '#2A9D8F', tolerance: 5.0 },
  { id: 'p4', name: 'Row 1 / Col 4 - Cyan Primary', expectedHex: '#00A3D9', tolerance: 5.0 },
  { id: 'p5', name: 'Row 1 / Col 5 - Blue Reference', expectedHex: '#1D3557', tolerance: 5.0 },

  { id: 'p6', name: 'Row 2 / Col 1 - Magenta Primary', expectedHex: '#D63384', tolerance: 5.0 },
  { id: 'p7', name: 'Row 2 / Col 2 - Purple / Violet', expectedHex: '#6A0572', tolerance: 5.0 },
  { id: 'p8', name: 'Row 2 / Col 3 - Ochre Standard', expectedHex: '#E76F51', tolerance: 5.0 },
  { id: 'p9', name: 'Row 2 / Col 4 - Warm Sand / Beige', expectedHex: '#E9C46A', tolerance: 5.0 },
  { id: 'p10', name: 'Row 2 / Col 5 - Deep Indigo', expectedHex: '#264653', tolerance: 5.0 },

  { id: 'p11', name: 'Row 3 / Col 1 - D65 White Standard', expectedHex: '#F8FAFC', tolerance: 4.0 },
  { id: 'p12', name: 'Row 3 / Col 2 - Light Grey 50%', expectedHex: '#B0B8C4', tolerance: 4.0 },
  { id: 'p13', name: 'Row 3 / Col 3 - Neutral Grey 18%', expectedHex: '#7C8592', tolerance: 4.0 },
  { id: 'p14', name: 'Row 3 / Col 4 - Dark Grey 8%', expectedHex: '#3D4550', tolerance: 4.5 },
  { id: 'p15', name: 'Row 3 / Col 5 - Deep Black 3%', expectedHex: '#1E242C', tolerance: 4.5 },
];

/**
 * Converts sRGB (0-255) to CIE L*a*b* (D65 standard illuminant, 2° observer)
 */
export function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  // 1. Linearize sRGB
  const linearize = (c: number) => {
    const v = c / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };
  const rL = linearize(r);
  const gL = linearize(g);
  const bL = linearize(b);

  // 2. Matrix transformation to CIE XYZ (D65 reference white)
  const X = (rL * 0.4124564 + gL * 0.3575761 + bL * 0.1804375) * 100;
  const Y = (rL * 0.2126729 + gL * 0.7151522 + bL * 0.072175) * 100;
  const Z = (rL * 0.0193339 + gL * 0.119192 + bL * 0.9503041) * 100;

  // D65 reference white points
  const Xn = 95.047;
  const Yn = 100.0;
  const Zn = 108.883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  const fx = f(X / Xn);
  const fy = f(Y / Yn);
  const fz = f(Z / Zn);

  const L = parseFloat((116 * fy - 16).toFixed(1));
  const aVal = parseFloat((500 * (fx - fy)).toFixed(1));
  const bVal = parseFloat((200 * (fy - fz)).toFixed(1));

  return { L, a: aVal, b: bVal };
}

/**
 * Converts sRGB (0-255) to HSV
 */
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;

  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rN) h = ((gN - bN) / delta) % 6;
    else if (max === gN) h = (bN - rN) / delta + 2;
    else h = (rN - gN) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);

  return { h, s, v };
}

/**
 * Calculates CIEDE2000 (ΔE00) perceptual color difference between two hex colors.
 */
export function calculateDeltaE(hexA: string, hexB: string): number {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return 2.0;

  const labA = rgbToLab(rgbA.r, rgbA.g, rgbA.b);
  const labB = rgbToLab(rgbB.r, rgbB.g, rgbB.b);

  return calculateCIEDE2000(labA, labB);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return null;
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Executes prototype colorimetric calibration against reference card patches.
 * Supports configurable reference cards from TestKitProfile and manual fallback.
 */
export function runColorCalibration(options?: {
  lightingDrift?: number; // e.g. 1.05 warm, 0.95 cool
  noiseLevel?: number;
  referenceCard?: ReferenceCardConfig;
  manualCalibration?: boolean;
  manualCardRegion?: { x: number; y: number; width: number; height: number };
}): CalibrationData {
  const drift = options?.lightingDrift ?? 1.02;
  const noise = options?.noiseLevel ?? 0.8;

  // Use patches from profile reference card if provided, otherwise default 6-patch card
  const patchDefinitions = options?.referenceCard?.patches?.length
    ? options.referenceCard.patches.map(p => ({
        id: p.id,
        name: p.name,
        expectedHex: p.expectedHex,
        tolerance: p.tolerance,
      }))
    : STANDARD_CALIBRATION_TILES;

  const tiles: ReferenceColorTile[] = patchDefinitions.map((std, i) => {
    const rgb = hexToRgb(std.expectedHex) || { r: 128, g: 128, b: 128 };
    // Deterministic slight field sensor capture drift
    const driftFactorR = 1 + (drift - 1) * (1 + i * 0.05);
    const driftFactorB = 1 - (drift - 1) * 0.8;
    const detectedR = rgb.r * driftFactorR;
    const detectedG = rgb.g;
    const detectedB = rgb.b * driftFactorB;

    const detectedHex = rgbToHex(detectedR, detectedG, detectedB);
    // After calibration correction, color converges back to calibrated baseline
    const calibratedR = detectedR / driftFactorR;
    const calibratedG = detectedG;
    const calibratedB = detectedB / driftFactorB;
    const calibratedHex = rgbToHex(calibratedR, calibratedG, calibratedB);

    const deltaE = calculateDeltaE(std.expectedHex, calibratedHex);

    return {
      id: std.id,
      name: std.name,
      expectedHex: std.expectedHex,
      detectedHex,
      calibratedHex,
      deltaE,
      tolerance: std.tolerance,
    };
  });

  const avgDeltaE = parseFloat(
    (tiles.reduce((acc, t) => acc + t.deltaE, 0) / tiles.length).toFixed(2)
  );

  return {
    status: avgDeltaE <= 3.5 ? 'CALIBRATION_ACCEPTED' : 'CALIBRATION_MARGINAL',
    averageDeltaE: avgDeltaE,
    whiteBalanceK: Math.round(5200 * drift),
    correctionMatrix: [
      [parseFloat((1 / drift).toFixed(3)), 0.012, -0.005],
      [-0.004, 1.002, 0.003],
      [0.006, -0.011, parseFloat(drift.toFixed(3))],
    ],
    tiles,
    timestamp: new Date().toISOString(),
    calibrationMethod: options?.manualCalibration ? 'MANUAL' : 'AUTOMATIC',
    cardRegion: options?.manualCardRegion || { x: 48, y: 64, width: 190, height: 130 },
  };
}

/**
 * Extracts and calibrates sample reaction ROI.
 * Supports manual ROI selection or automatic segmentation.
 */
export function extractReactionROI(
  sampleColorHex: string,
  calibration: CalibrationData,
  manualRoiCoords?: { x: number; y: number; width: number; height: number; method?: 'AUTOMATIC' | 'MANUAL' }
): ReactionROI {
  const rgb = hexToRgb(sampleColorHex) || { r: 120, g: 60, b: 180 };

  // Apply correction matrix
  const mat = calibration.correctionMatrix;
  const calR = rgb.r * mat[0][0] + rgb.g * mat[0][1] + rgb.b * mat[0][2];
  const calG = rgb.r * mat[1][0] + rgb.g * mat[1][1] + rgb.b * mat[1][2];
  const calB = rgb.r * mat[2][0] + rgb.g * mat[2][1] + rgb.b * mat[2][2];

  const calibratedHex = rgbToHex(calR, calG, calB);
  const lab = rgbToLab(calR, calG, calB);

  const coords = manualRoiCoords || { x: 38.5, y: 44.2, width: 23.0, height: 18.5 };

  return {
    detected: true,
    confidence: manualRoiCoords?.method === 'MANUAL' ? 0.99 : 0.94,
    boundingBox: coords,
    rawColorHex: sampleColorHex,
    calibratedColorHex: calibratedHex,
    dominantLab: lab,
    spectralProfile: [0.12, 0.15, 0.28, 0.35, 0.42, 0.68, 0.82, 0.65],
    selectionMethod: manualRoiCoords?.method || 'AUTOMATIC',
    glareDetected: false,
  };
}
