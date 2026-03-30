# SepsisAI - Clinical Monitoring Dashboard

A professional-grade ICU monitoring system for early sepsis detection and management using AI-powered multi-stage prediction framework.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd demo
pip install -r requirements.txt
```

### 2. Start the Server
```bash
python -m app.main
```

### 3. Access Dashboard
Open your browser and navigate to: **http://localhost:8000**

## ✨ Key Features

### Clinical Precision Design
- **Dark theme optimized for ICU environments** with excellent contrast and readability
- **Professional color system** with semantic coding (danger/warning/success)
- **Typography**: Outfit (display) + IBM Plex Sans (body) + JetBrains Mono (data)
- **Glassmorphism effects** with subtle gradients and animations

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
- Longitudinal patient monitoring

#### 3. Explainability
- **SHAP (SHapley Additive exPlanations)** feature importance
- Key risk factor visualization
- Clinical decision support alerts
- Actionable recommendations

### Dashboard Features

#### Real-Time Monitoring
- **Auto-refresh every 30 seconds**
- Live patient risk scores
- Dynamic vitals display
- Trend analysis

#### Patient Management
- 5 mock ICU patients with diverse conditions
- Quick patient overview cards
- Detailed patient information
- Diagnosis and comorbidities display

#### Risk Visualization
- **Circular risk gauge** with color-coded zones
- Multi-risk bar charts (AKI, ARDS, Mortality)
- Confidence interval display
- Risk trend indicators

#### Vital Signs Panel
- Heart Rate, Blood Pressure, Temperature
- Respiratory Rate, SpO₂, Lactate
- Critical value highlighting
- Unit labels and normal ranges

#### Clinical Alerts & Recommendations
- Automatic critical alerts (high risk, hypotension, etc.)
- Context-aware clinical recommendations
- Sepsis bundle initiation prompts
- Fluid resuscitation and vasopressor suggestions

## 📊 Mock Patients

| ID | Name | Risk Level | Diagnosis |
|----|------|------------|-----------|
| P001 | Michael Chen | Low | Community-acquired pneumonia |
| **P002** | **Sarah Mitchell** | **High (96%)** | Complicated UTI |
| P003 | James Wilson | Low | Post-op intra-abdominal infection |
| P004 | Elena Rodriguez | Medium | Aspiration pneumonia |
| **P005** | **David Thompson** | **High** | Necrotizing pancreatitis |

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern, fast Python web framework
- **Pydantic** - Data validation using Python type annotations
- **Uvicorn** - ASGI server

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **Custom CSS** - Professional dark theme design
- **Responsive design** - Works on desktop and tablets

### Design System
- **Fonts**: Outfit + IBM Plex Sans + JetBrains Mono
- **Colors**: Medical-grade palette with semantic meaning
- **Animations**: Smooth transitions and micro-interactions
- **Layout**: Grid-based with flexible components

## 📡 API Endpoints

### Public Endpoints
- `GET /` - Dashboard HTML interface
- `GET /api/patients` - List all patients
- `GET /api/patients/{id}` - Patient detail with risk prediction
- `GET /api/patients/{id}/vitals/history?hours=24` - Vitals history
- `GET /api/system/status` - System operational status

### Response Format

**Patient Detail Response:**
```json
{
  "patient_id": "P002",
  "name": "Sarah Mitchell",
  "age": 67,
  "gender": "Female",
  "diagnosis": "Complicated urinary tract infection",
  "vitals": {
    "heart_rate": 112.0,
    "blood_pressure_systolic": 88.0,
    "lactate": 4.8
  },
  "risk_prediction": {
    "sepsis_risk": 96.0,
    "aki_risk": 72.5,
    "ards_risk": 51.2,
    "mortality_risk": 42.1,
    "confidence": 86.7
  },
  "risk_explanation": {
    "top_factors": [...],
    "risk_trend": "rising",
    "critical_alerts": [...],
    "recommendations": [...]
  }
}
```

## 🎯 Team Presentation Guide

### Key Talking Points

1. **Problem Statement**
   - Sepsis causes 11M+ deaths annually
   - Every hour delay = 8% mortality increase
   - Current tools lack accuracy and interpretability

2. **Our Solution**
   - Multi-stage intelligent framework
   - Three-in-one approach: Accuracy + Systemic + Explainability
   - Real-time clinical decision support

3. **Technical Innovation**
   - SHAP-based explainability
   - Multi-task learning architecture
   - Informative missingness encoding
   - Hybrid temporal modeling

4. **Demo Highlights**
   - Real-time risk monitoring
   - Transparent AI decisions
   - Actionable clinical insights
   - Professional UI/UX design

### Demo Walkthrough

1. **Show patient list** - Mention risk stratification
2. **Select high-risk patient (P002)** - Demonstrate urgency
3. **Explain risk gauge** - Visual clarity
4. **Show SHAP factors** - AI transparency
5. **Display alerts** - Clinical actionability
6. **Show recommendations** - Decision support

## 🔮 Future Enhancements

- [ ] Integration with real hospital EHR systems
- [ ] Multi-modal data (imaging + clinical notes)
- [ ] Advanced LLM-powered decision agent
- [ ] Mobile app for bedside monitoring
- [ ] Multi-center validation studies
- [ ] Regulatory compliance (FDA/CE)

## 📚 Project Context

- **Competition**: ITC 2026 (International Team Competition)
- **Focus**: SDG 3 (Good Health & Well-being)
- **Team**: Tsinghua University + Erasmus University Rotterdam
- **Goal**: Transform sepsis from reactive to proactive management

## 🙏 Acknowledgments

- Data sources: MIMIC-IV, eICU, Tianjin Medical University General Hospital
- Clinical validation: Department of Critical Care Medicine
- Research collaboration: Cross-institutional team effort

---

**Status**: ✅ Production Demo Ready
**Last Updated**: March 2026
**Version**: 2.1.0
