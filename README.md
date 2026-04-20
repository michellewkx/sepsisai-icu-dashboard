# SepsisAI - Clinical Monitoring System

**Live Demo: [https://sepsisai.vercel.app](https://sepsisai.vercel.app)**

A professional-grade ICU monitoring system for early sepsis detection and management using AI-powered multi-stage prediction framework. Includes a product landing page and a real-time clinical dashboard.

## Quick Start

### 1. Install Dependencies
```bash
cd demo
pip install -r requirements.txt
```

### 2. Start the Server
```bash
python -m app.main
```

### 3. Access
- **Landing Page**: http://localhost:8000
- **Dashboard**: http://localhost:8000/dashboard

## Key Features

### Clinical Precision Design
- **Light medical-blue theme** optimized for clinical readability
- **Professional color system** with semantic coding (danger/warning/success)
- **Typography**: Outfit (display) + IBM Plex Sans (body) + JetBrains Mono (data)
- **SVG iconography** replacing emojis for professional presentation
- **Fully responsive** — desktop, tablet, and mobile

### Three-in-One Framework

#### 1. Accuracy
- Real-time sepsis risk prediction (0-100%)
- Multi-task prediction: AKI, ARDS, Mortality
- Prediction confidence scoring
- Hourly dynamic risk updates

#### 2. Systemic
- Full-chain disease trajectory modeling
- Complications risk assessment
- Comprehensive risk profiling
- Longitudinal patient monitoring with sparkline charts

#### 3. Explainability
- **SHAP (SHapley Additive exPlanations)** feature importance
- Key risk factor visualization
- Clinical decision support alerts
- Actionable recommendations

### Pages

#### Landing Page (`/`)
- Product overview with animated hero section
- Impact statistics with counter animations
- Technology stack and architecture overview
- How-it-works pipeline visualization
- Trust indicators and clinical evidence

#### Dashboard (`/dashboard`)
- **Auto-refresh every 30 seconds**
- 5 mock ICU patients with diverse risk profiles
- Circular risk gauge with color-coded zones
- Multi-risk bar charts (AKI, ARDS, Mortality)
- Vital signs sparkline trend charts (24h history)
- Critical alerts and clinical recommendations
- Mobile-responsive with horizontal patient scroll

## Mock Patients

| ID | Name | Risk Level | Diagnosis |
|----|------|------------|-----------|
| P001 | Michael Chen | Low | Community-acquired pneumonia |
| **P002** | **Sarah Mitchell** | **High (96%)** | Complicated UTI |
| P003 | James Wilson | Low | Post-op intra-abdominal infection |
| P004 | Elena Rodriguez | Medium | Aspiration pneumonia |
| **P005** | **David Thompson** | **High** | Necrotizing pancreatitis |

## Tech Stack

### Backend
- **FastAPI** - Modern, fast Python web framework
- **Pydantic** - Data validation using Python type annotations
- **Uvicorn** - ASGI server

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **Custom CSS** - Light medical-blue theme with CSS custom properties
- **Canvas sparklines** - Vitals trend charts without external libraries
- **Responsive design** - Desktop, tablet, and mobile

### Deployment
- **Vercel** - Serverless Python (`@vercel/python`)
- **Domain**: [sepsisai.vercel.app](https://sepsisai.vercel.app)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Landing page |
| `GET` | `/dashboard` | Clinical dashboard |
| `GET` | `/api/patients` | List all patients |
| `GET` | `/api/patients/{id}` | Patient detail with risk prediction |
| `GET` | `/api/patients/{id}/vitals/history?hours=24` | Vitals history |
| `GET` | `/api/system/status` | System status |

## Project Context

- **Competition**: ITC 2026 (International Team Competition)
- **Focus**: SDG 3 (Good Health & Well-being)
- **Team**: Tsinghua University + Erasmus University Rotterdam
- **Goal**: Transform sepsis from reactive to proactive management
- **Data sources**: MIMIC-IV, eICU, Tianjin Medical University General Hospital

---

**Status**: Production Demo Ready
**Version**: 2.1.0
