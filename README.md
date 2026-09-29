# EvidenceTwin

### Digital Companion for Presumptive Field Drug Testing

> **Capture Evidence. Understand the Result. Prove Its Integrity.**

EvidenceTwin is a computer-vision-based digital companion designed to work alongside existing **colorimetric field drug-testing kits**.

The system captures the chemical reaction produced by an existing field-test kit, uses a calibrated **15-patch EvidenceTwin reference card** for objective colour measurement, evaluates image and evidence quality, performs a configurable presumptive interpretation, and creates a tamper-evident digital evidence record.

EvidenceTwin does **not** directly detect drugs from arbitrary photographs and does not replace laboratory confirmation.

---

## 🚨 Important Scientific Boundary

EvidenceTwin is designed for **presumptive field testing**.

The system:

- Works alongside existing chemical field-test kits.
- Analyzes the colour reaction produced by the test kit.
- Uses a reference card for colour calibration.
- Performs computer-vision-based reaction analysis.
- Applies evidence-quality and reliability checks.
- Produces a presumptive interpretation when sufficient evidence is available.
- Creates an integrity-protected digital evidence record.

The system does **not** claim:

- Definitive forensic identification.
- Laboratory-confirmed identification.
- Exact drug concentration measurement.
- Identification of unknown substances from arbitrary photographs.
- Replacement of laboratory analytical methods.
- Automatic court admissibility.

A result should be treated as **presumptive field evidence** and confirmed using appropriate laboratory procedures where required.

---

# ✨ Key Features

## 1. Free-Position Computer Vision

EvidenceTwin is designed to analyze scenes where the reference card and test kit may appear at different:

- Positions
- Scales
- Rotations
- Orientations
- Perspective angles

The system does not require the operator to place the objects at predetermined screen coordinates.

Object geometry detected from the image is used dynamically throughout the analysis pipeline.

---

## 2. EvidenceTwin 15-Patch Reference Card

The system uses a dedicated reference card containing **15 colour patches**.

The reference card supports:

- Colour calibration
- Illumination compensation
- Perspective correction
- Objective colour measurement
- Image-quality assessment

The card is detected from the image before calibration is performed.

---

## 3. Test-Kit Detection

The field-test kit is detected independently from the reference card.

The detected test-kit geometry is used to determine the relevant reaction region rather than relying on a single fixed screen coordinate.

This allows the same analysis pipeline to work with different object positions within the camera frame.

---

## 4. Reaction Analysis

After calibration and geometric normalization, EvidenceTwin evaluates the reaction region using objective colour measurements.

The computer-vision pipeline can work with:

- RGB
- HSV
- CIE Lab
- CIEDE2000 colour difference

The system uses the configured test-kit/reaction profile to interpret the measured colour response.

---

## 5. Evidence Quality Gate

EvidenceTwin follows a **fail-closed** approach.

If the captured image does not provide sufficient evidence for reliable analysis, the system should block or defer the result rather than manufacture a value.

Quality evaluation can consider factors such as:

- Reference-card visibility
- Test-kit visibility
- Perspective quality
- Lighting conditions
- Glare
- Saturation
- Reaction-region validity
- Calibration quality
- Detection confidence
- Analysis consistency

---

## 6. Reliability Assessment

EvidenceTwin separates the concept of a model/system confidence value from the broader question of whether the captured evidence is reliable enough to support a presumptive interpretation.

This allows the system to communicate when evidence requires:

- Better capture conditions
- Repeated capture
- Manual review
- Additional verification

---

## 7. Digital Evidence Record

Each completed analysis can be associated with a structured evidence record containing relevant information such as:

- Case information
- Timestamp
- Operator information
- Image information
- Test-kit profile
- Calibration information
- Colour-analysis results
- Presumptive interpretation
- Reliability information
- Integrity information

---

## 8. Tamper-Evident Integrity

EvidenceTwin uses **SHA-256 hashing** to support integrity verification of digital evidence records.

The goal is to make subsequent modification of recorded evidence detectable through integrity verification.

---

## 9. Explainable Analysis

The application is designed to expose the reasoning behind an analysis rather than presenting only a final label.

Relevant evidence can include:

- Detected reference card
- Detected test kit
- Reaction region
- Calibration state
- Colour measurements
- Quality checks
- Reliability information
- Integrity/hash information

---

# 🧠 System Architecture

```text
                    ┌──────────────────────┐
                    │      Camera /        │
                    │    Image Upload      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Full-Frame CV     │
                    │      Pipeline        │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
       ┌──────────────────┐       ┌──────────────────┐
       │ Reference Card   │       │   Test Kit       │
       │    Detection     │       │    Detection     │
       └────────┬─────────┘       └────────┬─────────┘
                │                          │
                ▼                          ▼
       ┌──────────────────┐       ┌──────────────────┐
       │ Perspective      │       │ Test-Kit Geometry│
       │ Rectification    │       │   & Profiling    │
       └────────┬─────────┘       └────────┬─────────┘
                │                          │
                ▼                          ▼
       ┌──────────────────┐       ┌──────────────────┐
       │ 15-Patch Colour  │       │ Reaction Region  │
       │   Calibration    │       │     Search       │
       └────────┬─────────┘       └────────┬─────────┘
                │                          │
                └─────────────┬────────────┘
                              ▼
                    ┌──────────────────────┐
                    │ Evidence Fusion &    │
                    │    Quality Gate      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Objective Colour     │
                    │      Analysis        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Presumptive Reaction │
                    │    Interpretation    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Reliability & Review │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Digital Evidence     │
                    │      Record          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ SHA-256 Integrity    │
                    │     Verification     │
                    └──────────────────────┘
```

---

# 🔬 Computer Vision Pipeline

The core image-processing flow is:

```text
Input Image
     │
     ▼
Full-Frame Preprocessing
     │
     ├───────────────┐
     ▼               ▼
Card Detection    Test-Kit Detection
     │               │
     ▼               ▼
Card Polygon      Kit Polygon
     │               │
     ▼               ▼
Perspective       Geometry
Rectification     Normalization
     │               │
     ▼               ▼
15-Patch          Reaction Region
Calibration       Localization
     │               │
     └───────┬───────┘
             ▼
       Evidence Fusion
             │
             ▼
        Quality Gate
             │
       ┌─────┴─────┐
       │           │
   Insufficient   Valid
    Evidence      Evidence
       │           │
       ▼           ▼
     Block      Colour Analysis
                   │
                   ▼
             CIE Lab / RGB /
             HSV / CIEDE2000
                   │
                   ▼
          Reaction Interpretation
                   │
                   ▼
             Reliability
                   │
                   ▼
           Evidence Record
```

---

# 🛠️ Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

- Python
- FastAPI
- OpenCV

## Data & Integrity

- SQLite
- SHA-256

## Computer Vision

- OpenCV
- RGB colour analysis
- HSV colour analysis
- CIE Lab
- CIEDE2000
- Perspective transformation
- Geometric object detection
- Image-quality validation

---

# 📁 Project Structure

```text
EVIDENCETWIN/
│
├── backend/
│   ├── cv_engine/
│   │   ├── calibration.py
│   │   ├── card_detector.py
│   │   ├── ciede2000.py
│   │   ├── patch_detector.py
│   │   ├── perspective.py
│   │   ├── pipeline.py
│   │   ├── preprocessing.py
│   │   ├── quality.py
│   │   ├── reaction_roi.py
│   │   ├── schemas.py
│   │   ├── test_kit_detector.py
│   │   └── validation.py
│   │
│   ├── main.py
│   └── test_cv_matrix.py
│
├── src/
│   ├── components/
│   ├── features/
│   ├── services/
│   ├── types/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── bun.lock
├── server.ts
├── tsconfig.json
└── vite.config.ts
```

> Research and reference materials are intentionally excluded from the public repository.

---

# 🚀 Getting Started

## Prerequisites

Install:

- Git
- Node.js
- npm
- Python 3
- pip

Verify:

```bash
git --version
node --version
npm --version
python3 --version
pip3 --version
```

---

# 1. Clone the Repository

```bash
git clone https://github.com/Reethik12/EVIDENCETWIN.git
cd EVIDENCETWIN
```

---

# 2. Install Frontend Dependencies

```bash
npm install
```

---

# 3. Configure Environment Variables

```bash
cp .env.example .env
```

Review `.env` and provide any environment-specific values required by your local configuration.

Do not commit secrets or private credentials.

---

# 4. Create the Python Virtual Environment

From the project root:

```bash
python3 -m venv .venv
```

### macOS / Linux

```bash
source .venv/bin/activate
```

### Windows

```powershell
.venv\Scripts\activate
```

---

# 5. Install Backend Dependencies

If your local project contains a `requirements.txt` file:

```bash
pip install -r requirements.txt
```

Otherwise, install the Python dependencies required by the backend environment before starting FastAPI.

---

# 6. Start the Backend

From the project root:

```bash
python3 -m uvicorn backend.main:app --reload
```

The backend will normally be available at:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

# 7. Start the Frontend

Open a second terminal.

```bash
cd EVIDENCETWIN
npm run dev
```

Vite will display the local development URL in the terminal.

Open that URL in your browser.

---

# 🧪 Testing

EvidenceTwin includes computer-vision testing infrastructure for evaluating the CV pipeline under different image conditions.

The backend test matrix is located at:

```text
backend/test_cv_matrix.py
```

Run it using the configured Python environment:

```bash
python3 backend/test_cv_matrix.py
```

Frontend build verification:

```bash
npm run build
```

---

# 📷 Evidence Capture Workflow

```text
1. Start a new test
        ↓
2. Capture or upload an image
        ↓
3. Detect EvidenceTwin reference card
        ↓
4. Detect field-test kit
        ↓
5. Validate perspective and image quality
        ↓
6. Calibrate colour using the 15-patch reference card
        ↓
7. Locate the reaction region
        ↓
8. Measure reaction colour
        ↓
9. Perform presumptive interpretation
        ↓
10. Evaluate evidence reliability
        ↓
11. Generate evidence record
        ↓
12. Verify record integrity
```

---

# 🧩 Test-Kit Profiles

EvidenceTwin uses configurable profiles so reaction interpretation can be associated with the characteristics of a specific field-test kit.

A profile can define information required for:

- Test-kit identification
- Reaction geometry
- Expected reaction characteristics
- Colour interpretation
- Analysis thresholds
- Evidence-quality requirements

This allows the CV pipeline to remain reusable rather than encoding one universal reaction geometry into the application.

---

# 🔐 Evidence Integrity

EvidenceTwin incorporates cryptographic hashing into its digital evidence workflow.

The system uses:

```text
SHA-256
```

to produce an integrity value associated with recorded evidence.

A verification workflow can recompute the relevant hash and compare it against the stored integrity value.

This is intended to make unauthorized modification detectable.

---

# 📊 Colour Science

EvidenceTwin uses multiple colour representations because RGB values alone can be strongly affected by capture conditions.

## RGB

Direct camera colour representation.

## HSV

Useful for separating hue, saturation, and brightness characteristics.

## CIE Lab

A perceptual colour representation useful for colour-difference analysis.

## CIEDE2000

A perceptual colour-difference calculation used to quantify differences between measured and reference colours.

The 15-patch reference card provides a controlled colour reference for calibration and normalization.

---

# 🛡️ Fail-Closed Design

A central design principle of EvidenceTwin is:

> **Do not manufacture evidence when the image does not provide sufficient evidence.**

Examples of conditions that can prevent analysis include:

- Reference card not detected
- Test kit not detected
- Invalid geometry
- Excessive glare
- Poor image quality
- Severe saturation
- Insufficient calibration information
- Invalid reaction region
- Inconsistent evidence

When required evidence is unavailable, the system should block or defer the presumptive result instead of generating arbitrary values.

---

# 🔎 Explainability

EvidenceTwin is designed to make the analysis traceable.

Instead of exposing only:

```text
Result → Positive
```

the application can expose supporting information such as:

```text
Reference Card
       ↓
Calibration
       ↓
Test Kit
       ↓
Reaction Region
       ↓
Measured Colour
       ↓
Colour Difference
       ↓
Quality Assessment
       ↓
Reliability Assessment
       ↓
Presumptive Interpretation
```

This provides a clearer reconstruction of how the system reached its output.

---

# 🌐 Camera and Upload Consistency

Camera capture and uploaded images are intended to pass through the same core computer-vision pipeline.

```text
Camera
   │
   ▼
Image
   │
   └─────────────┐
                 │
Upload ──────────┤
                 ▼
        Shared CV Pipeline
                 │
                 ▼
          Same Detection
          Same Calibration
          Same Analysis
          Same Quality Gate
```

---

# 📦 Data Storage

EvidenceTwin includes application-side data structures for managing:

- Evidence records
- Test cases
- Test-kit profiles
- Analysis information
- Verification information
- Historical evidence

The project uses SQLite-oriented data handling for local persistence.

---

# ⚠️ Limitations

EvidenceTwin is a prototype/research-oriented digital companion.

Important limitations include:

- Camera hardware can influence colour measurements.
- Lighting conditions can affect chemical-test appearance.
- Field-test chemistry can vary by kit and sample.
- Colourimetric reactions can be affected by interfering substances.
- A computer-vision result does not establish laboratory confirmation.
- Real-world forensic deployment requires appropriate validation.
- Thresholds and profiles must be validated for their intended test-kit and operating conditions.

---

# 🔬 Research and Validation

EvidenceTwin was developed with consideration of:

- Field colourimetric drug-testing workflows
- Smartphone colourimetry
- Computer vision
- Colour science
- Digital evidence integrity
- Evidence-quality assessment
- Forensic workflow requirements

Research and reference materials used during development are intentionally maintained outside the public GitHub repository.

---

# 🎯 Intended Use

EvidenceTwin is intended as a **digital companion for field operators** working with existing presumptive colourimetric test kits.

The application aims to provide:

```text
Objective Capture
        +
Colour Calibration
        +
Computer Vision
        +
Evidence Quality
        +
Presumptive Interpretation
        +
Digital Integrity
```

rather than replacing the underlying chemical test or laboratory confirmation.

---

# 🏆 Smart India Hackathon 2026

## Problem Statement

**SIH26231 — Digital Companion for Field Drug Testing**

## Ministry

**Ministry of Home Affairs / Narcotics Control Bureau**

## Theme

**MedTech / BioTech / HealthTech**

## Category

**Software**

## Team

**POWER HOUSE2026**

## Team ID

**123309**

## Institution

**Saveetha Institute of Medical and Technical Sciences**

---

# 👥 Team

- Reethik V
- Pranav S
- Jashwanth S C
- Anirudh L
- Chandra Prakash D
- Sofia R V

---

# 📜 Disclaimer

EvidenceTwin is a software prototype intended to support presumptive field-testing workflows.

It is not a laboratory analytical instrument and should not be interpreted as providing definitive forensic identification.

All presumptive results should be interpreted according to the applicable field-test procedure and confirmed using appropriate laboratory methods where required.

---

# 🔗 Repository

https://github.com/Reethik12/EVIDENCETWIN

---

# ⭐ EvidenceTwin

> **Capture Evidence. Understand the Result. Prove Its Integrity.**
