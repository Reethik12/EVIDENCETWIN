import { TestKitProfile, ReactionProfile, StabilizationStatus } from '../../types/evidence';
import { DEMO_KIT_PROFILES } from './kitProfiles';

export interface DemoScenarioDefinition {
  id: string;
  name: string;
  caseId: string;
  kit: TestKitProfile;
  reactionProfile?: ReactionProfile;
  expectedResult: 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE';
  expectedReliability: number;
  sampleColorHex: string;
  initialColorHex?: string;
  isUnstable: boolean;
  stabilizationStatus?: StabilizationStatus;
  qualityOverride: {
    sharpness: number;
    lighting: number;
    exposure: number;
    referenceDetected: boolean;
    roiQuality: number;
  };
  description: string;
  fieldNotes: string;
  svgImageUri: string;
}

// Generate realistic synthetic forensic specimen SVG data URI in clean light scientific styling
function createForensicSpecimenSvg(options: {
  reactionColor: string;
  referenceCardDetected: boolean;
  lightingQuality: 'GOOD' | 'UNEVEN' | 'DEGRADED';
  label: string;
}): string {
  const { reactionColor, referenceCardDetected, lightingQuality, label } = options;

  const bgFill = lightingQuality === 'GOOD' ? '#F8FAFC' : '#F1F5F9';
  const shadowColor = 'rgba(15, 23, 42, 0.08)';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FAFBFD"/>
        <stop offset="100%" stop-color="#EDF2F7"/>
      </linearGradient>
      <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(255,255,255,0.7)"/>
        <stop offset="25%" stop-color="rgba(255,255,255,0.1)"/>
        <stop offset="75%" stop-color="rgba(255,255,255,0.05)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0.4)"/>
      </linearGradient>
      <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${shadowColor}" />
      </filter>
    </defs>

    <!-- Lab workbench surface (Light matte grey) -->
    <rect width="640" height="480" fill="url(#bgGrad)"/>

    <!-- Subtle bench measurement scale -->
    <g opacity="0.3" stroke="#94A3B8" stroke-width="0.75">
      <path d="M 0 60 L 640 60 M 0 120 L 640 120 M 0 180 L 640 180 M 0 240 L 640 240 M 0 300 L 640 300 M 0 360 L 640 360 M 0 420 L 640 420"/>
      <path d="M 80 0 L 80 480 M 160 0 L 160 480 M 240 0 L 240 480 M 320 0 L 320 480 M 400 0 L 400 480 M 480 0 L 480 480 M 560 0 L 560 480"/>
    </g>

    <!-- Reference Calibration Card (Top-Left quadrant) -->
    ${referenceCardDetected ? `
    <g transform="translate(48, 64)" filter="url(#softShadow)">
      <!-- Card Body -->
      <rect width="190" height="130" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <!-- Header text -->
      <text x="14" y="24" font-family="-apple-system, sans-serif" font-size="10" fill="#1769AA" font-weight="bold">ET-REF CARD // 6-PATCH</text>
      <text x="14" y="36" font-family="-apple-system, sans-serif" font-size="8" fill="#64717D">CALIBRATION STANDARD 2026</text>
      <!-- Reference color tiles -->
      <g transform="translate(14, 44)">
        <rect x="0" y="0" width="23" height="23" rx="3" fill="#E5E9EE" stroke="#CBD5E1"/>
        <rect x="27" y="0" width="23" height="23" rx="3" fill="#7C8592"/>
        <rect x="54" y="0" width="23" height="23" rx="3" fill="#1E242C"/>
        <rect x="81" y="0" width="23" height="23" rx="3" fill="#00A3D9"/>
        <rect x="108" y="0" width="23" height="23" rx="3" fill="#D63384"/>
        <rect x="135" y="0" width="23" height="23" rx="3" fill="#E6A817"/>
      </g>
      <!-- Card corner fiducial crosshairs -->
      <circle cx="10" cy="10" r="3" fill="#1769AA" opacity="0.6"/>
      <circle cx="180" cy="10" r="3" fill="#1769AA" opacity="0.6"/>
      <circle cx="10" cy="120" r="3" fill="#1769AA" opacity="0.6"/>
      <circle cx="180" cy="120" r="3" fill="#1769AA" opacity="0.6"/>
      <!-- Status text -->
      <text x="14" y="116" font-family="-apple-system, sans-serif" font-size="8" fill="#16865B" font-weight="600">✓ FIDUCIALS LOCKED</text>
    </g>` : `
    <g transform="translate(48, 64)" opacity="0.4">
      <rect width="190" height="130" rx="6" fill="#FFFFFF" stroke="#D64550" stroke-width="1.5" stroke-dasharray="3 3"/>
      <text x="24" y="70" font-family="-apple-system, sans-serif" font-size="10" fill="#D64550" font-weight="bold">REFERENCE CARD OCCLUDED</text>
    </g>`}

    <!-- Field Drug Test Kit Cassette / Reaction Well (Center-Right) -->
    <g transform="translate(290, 80)" filter="url(#softShadow)">
      <!-- Cassette Body (Clean laboratory plastic cartridge) -->
      <rect width="280" height="320" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="8" y="8" width="264" height="304" rx="8" fill="none" stroke="#F1F5F9" stroke-width="1"/>
      
      <!-- Cassette Header -->
      <text x="22" y="32" font-family="-apple-system, sans-serif" font-size="12" font-weight="700" fill="#17212B">FIELD TEST CASSETTE</text>
      <text x="22" y="48" font-family="monospace" font-size="9" fill="#64717D">${label}</text>

      <!-- Reaction Window Frame (ROI) -->
      <g transform="translate(50, 75)">
        <!-- Outer Well -->
        <rect width="180" height="190" rx="8" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1"/>
        <text x="12" y="18" font-family="-apple-system, sans-serif" font-size="9" font-weight="600" fill="#1769AA">REACTION WELL [ROI]</text>
        
        <!-- Ampoule / Glass Vial tube -->
        <g transform="translate(45, 30)">
          <!-- Glass contour -->
          <rect x="0" y="0" width="90" height="130" rx="14" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
          <!-- Active Colorimetric Liquid Reaction Solution -->
          <rect x="4" y="25" width="82" height="98" rx="10" fill="${reactionColor}"/>
          <!-- Liquid meniscus curve -->
          <path d="M 4 35 Q 45 42 86 35 L 86 25 Q 45 32 4 25 Z" fill="rgba(255,255,255,0.3)"/>
          <!-- Glass highlight reflection overlay -->
          <rect x="0" y="0" width="90" height="130" rx="14" fill="url(#glassGrad)" pointer-events="none"/>
        </g>
        
        <!-- Alignment crosshairs in ROI -->
        <path d="M 85 95 L 95 95 M 90 90 L 90 100" stroke="#1769AA" stroke-width="1.5"/>
      </g>

      <!-- Barcode / Batch Markings -->
      <g transform="translate(22, 292)" opacity="0.8">
        <rect x="0" y="0" width="2" height="12" fill="#17212B"/>
        <rect x="4" y="0" width="3" height="12" fill="#17212B"/>
        <rect x="9" y="0" width="1" height="12" fill="#17212B"/>
        <rect x="12" y="0" width="4" height="12" fill="#17212B"/>
        <rect x="18" y="0" width="2" height="12" fill="#17212B"/>
        <text x="28" y="10" font-family="monospace" font-size="8" fill="#64717D">LOT-2026-F09</text>
      </g>
    </g>

    <!-- Clean Optical Viewfinder Guide Overlays -->
    <g stroke="#1769AA" stroke-width="1.5" fill="none" opacity="0.6">
      <path d="M 20 40 L 20 20 L 40 20"/>
      <path d="M 600 20 L 620 20 L 620 40"/>
      <path d="M 20 440 L 20 460 L 40 460"/>
      <path d="M 600 460 L 620 460 L 620 440"/>
    </g>

    <text x="24" y="468" font-family="-apple-system, sans-serif" font-size="9" fill="#8A96A3">EVIDENCETWIN OPTICAL FRAME // FORENSIC-STANDARD</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEMO_SCENARIOS: DemoScenarioDefinition[] = [
  {
    id: 'scenario_a',
    name: 'Scenario A: Presumptive Positive (High Reliability)',
    caseId: 'CASE-2026-0924',
    kit: DEMO_KIT_PROFILES[0],
    reactionProfile: DEMO_KIT_PROFILES[0].reactionProfiles[0],
    expectedResult: 'POSITIVE',
    expectedReliability: 92,
    sampleColorHex: '#3D1C52', // Deep purple-black
    initialColorHex: '#E9C46A',
    isUnstable: false,
    stabilizationStatus: 'STABLE',
    qualityOverride: {
      sharpness: 91,
      lighting: 88,
      exposure: 93,
      referenceDetected: true,
      roiQuality: 86,
    },
    description: 'High optical clarity, reference card fully detected, reaction ampoule shows distinct dark violet transition.',
    fieldNotes: 'Field screening on powder residue sample recovered during vehicle checkpoint inspection.',
    svgImageUri: createForensicSpecimenSvg({
      reactionColor: '#3D1C52',
      referenceCardDetected: true,
      lightingQuality: 'GOOD',
      label: 'MARQUIS REAGENT // OP-0418',
    }),
  },
  {
    id: 'scenario_b',
    name: 'Scenario B: Presumptive Negative (High Reliability)',
    caseId: 'CASE-2026-0811',
    kit: DEMO_KIT_PROFILES[0],
    reactionProfile: DEMO_KIT_PROFILES[0].reactionProfiles[0],
    expectedResult: 'NEGATIVE',
    expectedReliability: 95,
    sampleColorHex: '#C5A059', // Pale amber / no reaction
    initialColorHex: '#C5A059',
    isUnstable: false,
    stabilizationStatus: 'STABLE',
    qualityOverride: {
      sharpness: 94,
      lighting: 92,
      exposure: 95,
      referenceDetected: true,
      roiQuality: 90,
    },
    description: 'Pristine lab lighting, complete reference patch alignment, zero colorimetric shift.',
    fieldNotes: 'Screening of inert pharmaceutical excipient sample; no alkaloid response observed.',
    svgImageUri: createForensicSpecimenSvg({
      reactionColor: '#C5A059',
      referenceCardDetected: true,
      lightingQuality: 'GOOD',
      label: 'MARQUIS REAGENT // OP-0418',
    }),
  },
  {
    id: 'scenario_c',
    name: 'Scenario C: Inconclusive / Manual Review (Low Reliability)',
    caseId: 'CASE-2026-0744',
    kit: DEMO_KIT_PROFILES[0],
    reactionProfile: DEMO_KIT_PROFILES[0].reactionProfiles[0],
    expectedResult: 'INCONCLUSIVE',
    expectedReliability: 61,
    sampleColorHex: '#60584F', // Dull muddy grey-brown
    initialColorHex: '#A89F91',
    isUnstable: true,
    stabilizationStatus: 'UNSTABLE',
    qualityOverride: {
      sharpness: 68,
      lighting: 58,
      exposure: 64,
      referenceDetected: true,
      roiQuality: 62,
    },
    description: 'Sub-optimal ambient illumination, murky reaction color, and sensitivity perturbation drift.',
    fieldNotes: 'Captured in low-light evening roadside conditions with heavy shadows on reference card.',
    svgImageUri: createForensicSpecimenSvg({
      reactionColor: '#60584F',
      referenceCardDetected: true,
      lightingQuality: 'UNEVEN',
      label: 'MARQUIS REAGENT // ATYPICAL',
    }),
  },
  {
    id: 'scenario_d',
    name: 'Scenario D: Scott Reagent Positive (Cocaine HCl)',
    caseId: 'CASE-2026-1102',
    kit: DEMO_KIT_PROFILES[2], // Scott Test
    reactionProfile: DEMO_KIT_PROFILES[2].reactionProfiles[0],
    expectedResult: 'POSITIVE',
    expectedReliability: 94,
    sampleColorHex: '#0F52BA', // Brilliant cobalt blue
    initialColorHex: '#E29578',
    isUnstable: false,
    stabilizationStatus: 'STABLE',
    qualityOverride: {
      sharpness: 92,
      lighting: 90,
      exposure: 91,
      referenceDetected: true,
      roiQuality: 88,
    },
    description: 'Distinctive cobalt blue coordination precipitate in lower organic layer with high signal-to-noise ratio.',
    fieldNotes: 'Field screening on crystalline compressed block seized at maritime port customs cargo checkpoint.',
    svgImageUri: createForensicSpecimenSvg({
      reactionColor: '#0F52BA',
      referenceCardDetected: true,
      lightingQuality: 'GOOD',
      label: 'SCOTT TEST // SC-2026-F',
    }),
  },
  {
    id: 'scenario_e',
    name: 'Scenario E: Mecke Reagent Positive (Heroin/Opioid)',
    caseId: 'CASE-2026-1288',
    kit: DEMO_KIT_PROFILES[1], // Mecke Reagent
    reactionProfile: DEMO_KIT_PROFILES[1].reactionProfiles[0],
    expectedResult: 'POSITIVE',
    expectedReliability: 91,
    sampleColorHex: '#1B4332', // Deep forest green to black
    initialColorHex: '#D4A373',
    isUnstable: false,
    stabilizationStatus: 'STABLE',
    qualityOverride: {
      sharpness: 89,
      lighting: 87,
      exposure: 90,
      referenceDetected: true,
      roiQuality: 85,
    },
    description: 'Rapid oxidation of phenolic rings producing deep green-to-black charge-transfer transition within 12 seconds.',
    fieldNotes: 'Screening of brown powder substance recovered during inter-state border bus terminal inspection.',
    svgImageUri: createForensicSpecimenSvg({
      reactionColor: '#1B4332',
      referenceCardDetected: true,
      lightingQuality: 'GOOD',
      label: 'MECKE REAGENT // MC-2026-F',
    }),
  },
  {
    id: 'scenario_f',
    name: 'Scenario F: Mandelin Reagent Inconclusive (Suspected Adulterant)',
    caseId: 'CASE-2026-1304',
    kit: DEMO_KIT_PROFILES[3], // Mandelin Reagent
    reactionProfile: DEMO_KIT_PROFILES[3].reactionProfiles[0],
    expectedResult: 'INCONCLUSIVE',
    expectedReliability: 59,
    sampleColorHex: '#665C54', // Muddy dark beige/olive
    initialColorHex: '#E9C46A',
    isUnstable: true,
    stabilizationStatus: 'UNSTABLE',
    qualityOverride: {
      sharpness: 72,
      lighting: 65,
      exposure: 68,
      referenceDetected: true,
      roiQuality: 60,
    },
    description: 'Anomalous absorption curve exhibiting mixed orange and dull grey-green hues consistent with paracetamol matrix.',
    fieldNotes: 'Prescription tablet crush sample with suspected over-the-counter analgesic adulteration.',
    svgImageUri: createForensicSpecimenSvg({
      reactionColor: '#665C54',
      referenceCardDetected: true,
      lightingQuality: 'UNEVEN',
      label: 'MANDELIN // ATYPICAL DRIFT',
    }),
  },
  {
    id: 'scenario_g',
    name: 'Scenario G: Duquenois-Levine Positive (Cannabinoids Screening)',
    caseId: 'CASE-2026-1142',
    kit: DEMO_KIT_PROFILES[4], // Duquenois-Levine
    reactionProfile: DEMO_KIT_PROFILES[4].reactionProfiles[0],
    expectedResult: 'POSITIVE',
    expectedReliability: 88,
    sampleColorHex: '#4A154B', // Indigo-violet organic layer
    initialColorHex: '#F4A261',
    isUnstable: false,
    stabilizationStatus: 'STABLE',
    qualityOverride: {
      sharpness: 88,
      lighting: 86,
      exposure: 90,
      referenceDetected: true,
      roiQuality: 85,
    },
    description: 'Biphasic color transition with indigo-violet chromophore transferred into lower organic chloroform layer.',
    fieldNotes: 'Screening on seized herbal matter residue; biphasic extraction distinct and aligned to D65 standard.',
    svgImageUri: createForensicSpecimenSvg({
      reactionColor: '#4A154B',
      referenceCardDetected: true,
      lightingQuality: 'GOOD',
      label: 'DUQUENOIS-LEVINE // CANNABINOID',
    }),
  },
  {
    id: 'scenario_h',
    name: 'Scenario H: Ehrlich Reagent Positive (Indole / LSD Screening)',
    caseId: 'CASE-2026-1409',
    kit: DEMO_KIT_PROFILES[5], // Ehrlich Reagent
    reactionProfile: DEMO_KIT_PROFILES[5].reactionProfiles[0],
    expectedResult: 'POSITIVE',
    expectedReliability: 93,
    sampleColorHex: '#6A0572', // Rich purple-magenta
    initialColorHex: '#DDA15E',
    isUnstable: false,
    stabilizationStatus: 'STABLE',
    qualityOverride: {
      sharpness: 93,
      lighting: 89,
      exposure: 92,
      referenceDetected: true,
      roiQuality: 89,
    },
    description: 'Electrophilic aromatic substitution condensation forming intense magenta-purple complex on blotter paper fragment.',
    fieldNotes: 'Micro-perforated blotter square paper sample examined during postal sorting facility narcotics screening.',
    svgImageUri: createForensicSpecimenSvg({
      reactionColor: '#6A0572',
      referenceCardDetected: true,
      lightingQuality: 'GOOD',
      label: 'EHRLICH REAGENT // INDOLE',
    }),
  },
];
