import { hexToRgb, rgbToLab, rgbToHsv, calculateDeltaE } from './calibrationEngine';

export interface ColorSpaceDecomposition {
  rgb: { r: number; g: number; b: number; normalized: { r: number; g: number; b: number } };
  hsv: { h: number; s: number; v: number };
  lab: { L: number; a: number; b: number };
  chromaC: number;
  hueAngleDeg: number;
  deltaEToReference: number;
  referenceEnvelope: {
    targetLab: { L: number; a: number; b: number };
    toleranceDeltaE: number;
    withinEnvelope: boolean;
  };
}

/**
 * FEATURE 8: Colour-Space Decomposition Engine
 * Decomposes calibrated reaction colors into multi-dimensional colorimetric spaces
 * with chromaticity coordinates, chroma, and reference envelope boundaries.
 */
export function decomposeColorSpace(
  calibratedHex: string,
  referenceTargetHex: string,
  toleranceDeltaE: number = 8.0
): ColorSpaceDecomposition {
  const rgb = hexToRgb(calibratedHex) || { r: 128, g: 128, b: 128 };
  const targetRgb = hexToRgb(referenceTargetHex) || { r: 61, g: 28, b: 82 };

  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
  const targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b);

  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  // Chroma C* = sqrt(a*^2 + b*^2)
  const chromaC = parseFloat(Math.sqrt(lab.a * lab.a + lab.b * lab.b).toFixed(1));

  // Hue angle h_ab = atan2(b*, a*) in degrees (0 - 360°)
  let hueAngle = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
  if (hueAngle < 0) hueAngle += 360;
  hueAngle = parseFloat(hueAngle.toFixed(1));

  const deltaE = calculateDeltaE(calibratedHex, referenceTargetHex);

  return {
    rgb: {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      normalized: {
        r: parseFloat((rgb.r / 255).toFixed(3)),
        g: parseFloat((rgb.g / 255).toFixed(3)),
        b: parseFloat((rgb.b / 255).toFixed(3)),
      },
    },
    hsv,
    lab,
    chromaC,
    hueAngleDeg: hueAngle,
    deltaEToReference: deltaE,
    referenceEnvelope: {
      targetLab,
      toleranceDeltaE,
      withinEnvelope: deltaE <= toleranceDeltaE,
    },
  };
}
