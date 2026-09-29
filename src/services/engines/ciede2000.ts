/**
 * Exact implementation of CIEDE2000 (ΔE00) perceptual color difference.
 * Standardized according to CIE technical report 142-2001 and ISO/CIE 11664-6:2014.
 */
export function calculateCIEDE2000(
  lab1: { L: number; a: number; b: number },
  lab2: { L: number; a: number; b: number },
  kL = 1.0,
  kC = 1.0,
  kH = 1.0
): number {
  const L1 = lab1.L;
  const a1 = lab1.a;
  const b1 = lab1.b;

  const L2 = lab2.L;
  const a2 = lab2.a;
  const b2 = lab2.b;

  const avgL = (L1 + L2) / 2.0;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2.0;

  const avgC7 = Math.pow(avgC, 7);
  const G = 0.5 * (1.0 - Math.sqrt(avgC7 / (avgC7 + Math.pow(25.0, 7) + 1e-12)));

  const a1Prime = (1.0 + G) * a1;
  const a2Prime = (1.0 + G) * a2;

  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);
  const avgCPrime = (C1Prime + C2Prime) / 2.0;

  let h1Prime = (Math.atan2(b1, a1Prime) * (180.0 / Math.PI)) % 360.0;
  if (h1Prime < 0) h1Prime += 360.0;

  let h2Prime = (Math.atan2(b2, a2Prime) * (180.0 / Math.PI)) % 360.0;
  if (h2Prime < 0) h2Prime += 360.0;

  let dhPrime = 0.0;
  if (C1Prime * C2Prime !== 0) {
    if (Math.abs(h1Prime - h2Prime) <= 180.0) {
      dhPrime = h2Prime - h1Prime;
    } else if (h2Prime <= h1Prime) {
      dhPrime = h2Prime - h1Prime + 360.0;
    } else {
      dhPrime = h2Prime - h1Prime - 360.0;
    }
  }

  const deltaHPrime = 2.0 * Math.sqrt(C1Prime * C2Prime) * Math.sin((dhPrime / 2.0) * (Math.PI / 180.0));

  let avgHPrime = 0.0;
  if (C1Prime * C2Prime === 0) {
    avgHPrime = h1Prime + h2Prime;
  } else if (Math.abs(h1Prime - h2Prime) <= 180.0) {
    avgHPrime = (h1Prime + h2Prime) / 2.0;
  } else if (h1Prime + h2Prime < 360.0) {
    avgHPrime = (h1Prime + h2Prime + 360.0) / 2.0;
  } else {
    avgHPrime = (h1Prime + h2Prime - 360.0) / 2.0;
  }

  const radH = (deg: number) => deg * (Math.PI / 180.0);

  const T =
    1.0 -
    0.17 * Math.cos(radH(avgHPrime - 30.0)) +
    0.24 * Math.cos(radH(2.0 * avgHPrime)) +
    0.32 * Math.cos(radH(3.0 * avgHPrime + 6.0)) -
    0.2 * Math.cos(radH(4.0 * avgHPrime - 63.0));

  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;

  const LMinus50Sq = Math.pow(avgL - 50.0, 2);
  const SL = 1.0 + (0.015 * LMinus50Sq) / Math.sqrt(20.0 + LMinus50Sq);
  const SC = 1.0 + 0.045 * avgCPrime;
  const SH = 1.0 + 0.015 * avgCPrime * T;

  const avgCPrime7 = Math.pow(avgCPrime, 7);
  const deltaTheta = 30.0 * Math.exp(-Math.pow((avgHPrime - 275.0) / 25.0, 2));
  const RC = 2.0 * Math.sqrt(avgCPrime7 / (avgCPrime7 + Math.pow(25.0, 7) + 1e-12));
  const RT = -Math.sin(radH(2.0 * deltaTheta)) * RC;

  const vL = deltaLPrime / (kL * SL);
  const vC = deltaCPrime / (kC * SC);
  const vH = deltaHPrime / (kH * SH);

  const dE2 = vL * vL + vC * vC + vH * vH + RT * vC * vH;
  return parseFloat(Math.sqrt(Math.max(0.0, dE2)).toFixed(2));
}
