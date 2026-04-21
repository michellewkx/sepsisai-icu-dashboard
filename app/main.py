"""Sepsis Navigator - Clinical Intelligence System Backend"""
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import random

# No fixed seed — allow slight variation on each refresh for realistic monitoring feel

# Base directory for resolving templates and static files
BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="Sepsis Navigator",
    description="Three-layer Clinical Intelligence System for sepsis management: Perception, Understanding, and Decision",
    version="2.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


# ============ Data Models ============

class Vitals(BaseModel):
    """Patient vital signs"""
    heart_rate: float
    blood_pressure_systolic: float
    blood_pressure_diastolic: float
    respiratory_rate: float
    temperature: float
    spo2: float
    lactate: float
    creatinine: float
    platelet_count: float
    bilirubin: float
    pao2_fio2_ratio: float


class RiskPrediction(BaseModel):
    """Risk prediction results"""
    sepsis_risk: float  # 0-100
    aki_risk: float  # Acute Kidney Injury
    ards_risk: float  # ARDS
    mortality_risk: float  # Mortality
    confidence: float  # Prediction confidence
    prediction_time: str


class SHAPValue(BaseModel):
    """SHAP explanation value"""
    feature: str
    value: float
    display_name: str
    category: str  # 'vitals', 'labs', 'demographics'
    change: str  # 'increased', 'decreased', 'normal'
    delta: float  # Change from last reading


class RiskExplanation(BaseModel):
    """Risk explanation"""
    top_factors: List[SHAPValue]
    risk_trend: str  # 'rising', 'stable', 'falling'
    critical_alerts: List[str]
    recommendations: List[str]


class Patient(BaseModel):
    """Patient information"""
    patient_id: str
    name: str
    age: int
    gender: str
    admission_time: str
    diagnosis: str
    comorbidities: List[str]
    current_location: str


class TimelineEvent(BaseModel):
    """Clinical timeline event"""
    time: str
    event: str
    type: str  # 'admission', 'warning', 'alert', 'intervention', 'observation'
    detail: str


class PatientDetail(Patient):
    """Patient detail with real-time data"""
    vitals: Vitals
    risk_prediction: RiskPrediction
    risk_explanation: RiskExplanation
    last_update: str
    timeline_events: List[TimelineEvent] = []
    ai_clinical_report: str = ""
    ai_report_confidence: float = 0.0


# ============ Mock Data Generators ============

def generate_mock_vitals(patient_id: str, hours_from_admission: int) -> Vitals:
    """Generate mock vital signs"""
    base_hr = 75 + random.uniform(-8, 12)
    base_bp = 118 + random.uniform(-12, 14)

    # Simulate deterioration for some patients
    if patient_id in ['P002', 'P005']:
        deterioration = hours_from_admission * 2.5
        base_hr += deterioration
        base_bp -= deterioration * 0.6

    return Vitals(
        heart_rate=round(base_hr + random.uniform(-6, 8), 1),
        blood_pressure_systolic=round(base_bp + random.uniform(-12, 12), 1),
        blood_pressure_diastolic=round(base_bp * 0.58 + random.uniform(-6, 6), 1),
        respiratory_rate=round(15 + random.uniform(-2, 5), 1),
        temperature=round(36.8 + random.uniform(-0.6, 1.8), 1),
        spo2=round(96 + random.uniform(-2, 3), 1),
        lactate=round(1.8 + random.uniform(-0.4, 3.2), 2),
        creatinine=round(0.9 + random.uniform(-0.2, 1.8), 2),
        platelet_count=round(220 + random.uniform(-60, 120), 0),
        bilirubin=round(0.8 + random.uniform(-0.2, 1.8), 2),
        pao2_fio2_ratio=round(320 + random.uniform(-60, 120), 0)
    )


def calculate_risk(vitals: Vitals, patient_id: str, hours_from_admission: int) -> RiskPrediction:
    """Calculate risk based on vital signs"""
    sepsis_score = 18

    # Heart rate abnormalities
    if vitals.heart_rate > 90:
        sepsis_score += (vitals.heart_rate - 90) * 0.6
    elif vitals.heart_rate < 60:
        sepsis_score += (60 - vitals.heart_rate) * 0.4

    # Low blood pressure
    if vitals.blood_pressure_systolic < 100:
        sepsis_score += (100 - vitals.blood_pressure_systolic) * 0.9

    # Temperature abnormalities
    if vitals.temperature > 38.0:
        sepsis_score += (vitals.temperature - 38.0) * 12
    elif vitals.temperature < 36.0:
        sepsis_score += (36.0 - vitals.temperature) * 12

    # High respiratory rate
    if vitals.respiratory_rate > 20:
        sepsis_score += (vitals.respiratory_rate - 20) * 2.5

    # Elevated lactate
    if vitals.lactate > 2.0:
        sepsis_score += (vitals.lactate - 2.0) * 18

    # Higher risk for specific patients
    if patient_id in ['P002', 'P005']:
        sepsis_score += hours_from_admission * 3.5

    sepsis_risk = min(max(sepsis_score, 8), 96)

    return RiskPrediction(
        sepsis_risk=round(sepsis_risk, 1),
        aki_risk=round(sepsis_risk * 0.72 + random.uniform(-6, 6), 1),
        ards_risk=round(sepsis_risk * 0.52 + random.uniform(-6, 6), 1),
        mortality_risk=round(sepsis_risk * 0.42 + random.uniform(-4, 4), 1),
        confidence=round(86 + random.uniform(-6, 9), 1),
        prediction_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )


def generate_shap_explanation(vitals: Vitals, risk: RiskPrediction) -> RiskExplanation:
    """Generate SHAP explanation"""
    factors = []

    # Analyze each feature
    if vitals.lactate > 2.8:
        factors.append(SHAPValue(
            feature="lactate",
            value=round(vitals.lactate, 2),
            display_name="Lactate",
            category="labs",
            change="increased",
            delta=round(vitals.lactate - 2.0, 2)
        ))

    if vitals.heart_rate > 95:
        factors.append(SHAPValue(
            feature="heart_rate",
            value=round(vitals.heart_rate, 1),
            display_name="Heart Rate",
            category="vitals",
            change="increased",
            delta=round(vitals.heart_rate - 75, 1)
        ))

    if vitals.blood_pressure_systolic < 100:
        factors.append(SHAPValue(
            feature="blood_pressure",
            value=round(vitals.blood_pressure_systolic, 1),
            display_name="Systolic BP",
            category="vitals",
            change="decreased",
            delta=round(100 - vitals.blood_pressure_systolic, 1)
        ))

    if vitals.respiratory_rate > 22:
        factors.append(SHAPValue(
            feature="respiratory_rate",
            value=round(vitals.respiratory_rate, 1),
            display_name="Respiratory Rate",
            category="vitals",
            change="increased",
            delta=round(vitals.respiratory_rate - 15, 1)
        ))

    if vitals.temperature > 38.0:
        factors.append(SHAPValue(
            feature="temperature",
            value=round(vitals.temperature, 1),
            display_name="Temperature",
            category="vitals",
            change="increased",
            delta=round(vitals.temperature - 36.8, 1)
        ))

    # Sort by impact
    factors.sort(key=lambda x: abs(x.delta), reverse=True)

    # Determine risk trend
    if risk.sepsis_risk > 60:
        trend = "rising"
    elif risk.sepsis_risk < 30:
        trend = "falling"
    else:
        trend = "stable"

    # Generate alerts and recommendations
    alerts = []
    recommendations = []

    if risk.sepsis_risk > 70:
        alerts.append("⚠️ High sepsis risk - Immediate evaluation required")
        recommendations.append("Consider initiating sepsis bundle")
        recommendations.append("Repeat lactate and blood cultures")

    if vitals.lactate > 4.0:
        alerts.append("🔴 Severe hyperlactatemia detected")
        recommendations.append("Consider fluid resuscitation")

    if vitals.blood_pressure_systolic < 90:
        alerts.append("🔴 Hypotension - Possible septic shock")
        recommendations.append("Initiate vasopressors if needed")

    if not alerts and risk.sepsis_risk > 40:
        recommendations.append("Continue close monitoring")
        recommendations.append("Reassess in 2 hours")

    return RiskExplanation(
        top_factors=factors[:5],
        risk_trend=trend,
        critical_alerts=alerts,
        recommendations=recommendations
    )


def generate_timeline_events(patient_id: str, vitals: Vitals, risk: RiskPrediction, patient_data: dict) -> List[TimelineEvent]:
    """Generate clinical timeline events based on patient risk and vitals"""
    events = []
    admission_hour = int(patient_data.get("admission_time", "2026-03-04 08:00").split(" ")[1].split(":")[0])

    # All patients get admission event
    events.append(TimelineEvent(
        time=f"{admission_hour:02d}:00",
        event="ICU Admission",
        type="admission",
        detail=f"Admitted from ED — {patient_data.get('diagnosis', 'Unknown')}"
    ))

    if risk.sepsis_risk >= 60:
        # High risk patients: full event history
        events.append(TimelineEvent(
            time=f"{(admission_hour + 1) % 24:02d}:15",
            event="Initial Labs Drawn",
            type="observation",
            detail="CBC, BMP, lactate, blood cultures, procalcitonin ordered"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 2) % 24:02d}:30",
            event="Lactate Elevated",
            type="warning",
            detail=f"Lactate {vitals.lactate:.1f} mmol/L — above threshold"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 3) % 24:02d}:00",
            event="Tachycardia Noted",
            type="warning",
            detail=f"HR {vitals.heart_rate:.0f} bpm sustained > 100"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 4) % 24:02d}:00",
            event="AI Alert Triggered",
            type="alert",
            detail=f"Sepsis risk exceeded {risk.sepsis_risk:.0f}% — physician notified"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 4) % 24:02d}:15",
            event="Blood Cultures Ordered",
            type="intervention",
            detail="Two sets obtained per SSC bundle protocol"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 4) % 24:02d}:45",
            event="Antibiotics Initiated",
            type="intervention",
            detail="Empiric broad-spectrum: Piperacillin/Tazobactam 4.5g IV"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 5) % 24:02d}:00",
            event="Fluid Resuscitation",
            type="intervention",
            detail="30 mL/kg crystalloid bolus initiated"
        ))
    elif risk.sepsis_risk >= 35:
        # Medium risk
        events.append(TimelineEvent(
            time=f"{(admission_hour + 1) % 24:02d}:00",
            event="Initial Labs Drawn",
            type="observation",
            detail="CBC, BMP, lactate, procalcitonin ordered"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 3) % 24:02d}:00",
            event="Vital Signs Flagged",
            type="warning",
            detail=f"HR {vitals.heart_rate:.0f}, Temp {vitals.temperature:.1f}C — trending abnormal"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 4) % 24:02d}:00",
            event="AI Monitoring Active",
            type="observation",
            detail=f"Sepsis risk {risk.sepsis_risk:.0f}% — enhanced surveillance mode"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 5) % 24:02d}:30",
            event="Repeat Labs Ordered",
            type="intervention",
            detail="Repeat lactate and CBC in 4h per monitoring protocol"
        ))
    else:
        # Low risk
        events.append(TimelineEvent(
            time=f"{(admission_hour + 2) % 24:02d}:00",
            event="Initial Assessment Complete",
            type="observation",
            detail="Vitals within normal limits, labs unremarkable"
        ))
        events.append(TimelineEvent(
            time=f"{(admission_hour + 6) % 24:02d}:00",
            event="Routine Monitoring",
            type="observation",
            detail=f"Sepsis risk {risk.sepsis_risk:.0f}% — stable, routine monitoring continues"
        ))

    return events


def generate_ai_clinical_report(patient_data: dict, vitals: Vitals, risk: RiskPrediction) -> tuple:
    """Generate AI clinical narrative report based on patient status. Returns (report_text, confidence)."""

    patient_name = patient_data.get("name", "Patient")
    diagnosis = patient_data.get("diagnosis", "Unknown")
    age = patient_data.get("age", 0)
    comorbidities = patient_data.get("comorbidities", [])
    comorbidity_str = ", ".join(comorbidities) if comorbidities else "none documented"

    if risk.sepsis_risk >= 70:
        # High risk — urgent clinical narrative
        confidence = round(random.uniform(88, 96), 1)
        report = (
            f"CRITICAL ASSESSMENT: {age}-year-old patient admitted with {diagnosis.lower()} "
            f"demonstrating progressive hemodynamic instability consistent with evolving sepsis.\n\n"
            f"Lactate levels have risen to {vitals.lactate:.1f} mmol/L, consistent with tissue hypoperfusion. "
            f"MAP has declined to {((vitals.blood_pressure_systolic + 2 * vitals.blood_pressure_diastolic) / 3):.0f} mmHg "
            f"with concurrent tachycardia (HR {vitals.heart_rate:.0f}). "
            f"The temporal pattern suggests early septic shock trajectory with an estimated "
            f"{min(risk.sepsis_risk * 0.85 + random.uniform(-3, 5), 95):.0f}% probability of requiring "
            f"vasopressor support within 6 hours.\n\n"
            f"Comorbid conditions ({comorbidity_str}) increase vulnerability to organ dysfunction. "
            f"Current PaO2/FiO2 ratio of {vitals.pao2_fio2_ratio:.0f} and platelet count {vitals.platelet_count:.0f} K/uL "
            f"should be monitored for ARDS and DIC progression.\n\n"
            f"RECOMMEND: Repeat lactate in 30 minutes, assess fluid responsiveness via passive leg raise, "
            f"evaluate for vasopressor initiation per SSC guidelines. "
            f"Consider source control imaging if no improvement within 4 hours."
        )
    elif risk.sepsis_risk >= 40:
        # Medium risk — watchful narrative
        confidence = round(random.uniform(78, 90), 1)
        report = (
            f"MODERATE CONCERN: {age}-year-old patient with {diagnosis.lower()} presenting with "
            f"borderline inflammatory markers requiring close surveillance.\n\n"
            f"Current vital signs show HR {vitals.heart_rate:.0f} bpm, temperature {vitals.temperature:.1f}C, "
            f"and lactate {vitals.lactate:.1f} mmol/L. While not yet meeting full SIRS criteria, "
            f"the trajectory analysis identifies a {risk.sepsis_risk:.0f}% sepsis probability "
            f"with a {risk.confidence:.0f}% model confidence.\n\n"
            f"The patient's background of {comorbidity_str} warrants enhanced monitoring. "
            f"Creatinine at {vitals.creatinine:.2f} mg/dL "
            f"{'suggests early renal stress' if vitals.creatinine > 1.2 else 'remains within acceptable range'}. "
            f"SpO2 is {vitals.spo2:.0f}% on current oxygen support.\n\n"
            f"RECOMMEND: Serial lactate monitoring q4h, reassess hemodynamic status in 2 hours, "
            f"maintain IV access and ensure blood culture availability if clinical picture deteriorates."
        )
    else:
        # Low risk — reassuring narrative
        confidence = round(random.uniform(82, 95), 1)
        report = (
            f"LOW RISK ASSESSMENT: {age}-year-old patient admitted with {diagnosis.lower()} "
            f"currently demonstrating hemodynamic stability and low infectious risk profile.\n\n"
            f"Vital signs are within normal parameters: HR {vitals.heart_rate:.0f} bpm, "
            f"BP {vitals.blood_pressure_systolic:.0f}/{vitals.blood_pressure_diastolic:.0f} mmHg, "
            f"temperature {vitals.temperature:.1f}C, respiratory rate {vitals.respiratory_rate:.0f}/min. "
            f"Lactate level {vitals.lactate:.1f} mmol/L is within normal range. "
            f"SpO2 {vitals.spo2:.0f}% is satisfactory.\n\n"
            f"AI multi-layer analysis assigns a {risk.sepsis_risk:.0f}% sepsis probability. "
            f"No early warning indicators detected across perception, understanding, or decision layers. "
            f"Background conditions ({comorbidity_str}) are currently well-managed.\n\n"
            f"RECOMMEND: Continue routine q4h vital sign monitoring. "
            f"No escalation of care required at this time. Reassess if clinical status changes."
        )

    return report, confidence


# ============ Mock Patient Data ============

MOCK_PATIENTS = {
    "P001": {
        "patient_id": "P001",
        "name": "Michael Chen",
        "age": 54,
        "gender": "Male",
        "admission_time": "2026-03-04 08:00",
        "diagnosis": "Community-acquired pneumonia",
        "comorbidities": ["Type 2 Diabetes", "Hypertension"],
        "current_location": "ICU Bed 3",
        "hours_from_admission": 24
    },
    "P002": {
        "patient_id": "P002",
        "name": "Sarah Mitchell",
        "age": 67,
        "gender": "Female",
        "admission_time": "2026-03-04 14:00",
        "diagnosis": "Complicated urinary tract infection",
        "comorbidities": ["Chronic Kidney Disease", "Coronary Artery Disease"],
        "current_location": "ICU Bed 5",
        "hours_from_admission": 18
    },
    "P003": {
        "patient_id": "P003",
        "name": "James Wilson",
        "age": 45,
        "gender": "Male",
        "admission_time": "2026-03-05 02:00",
        "diagnosis": "Post-operative intra-abdominal infection",
        "comorbidities": ["Obesity"],
        "current_location": "ICU Bed 1",
        "hours_from_admission": 8
    },
    "P004": {
        "patient_id": "P004",
        "name": "Elena Rodriguez",
        "age": 72,
        "gender": "Female",
        "admission_time": "2026-03-03 20:00",
        "diagnosis": "Aspiration pneumonia",
        "comorbidities": ["Parkinson's Disease", "Post-stroke sequelae"],
        "current_location": "ICU Bed 7",
        "hours_from_admission": 38
    },
    "P005": {
        "patient_id": "P005",
        "name": "David Thompson",
        "age": 58,
        "gender": "Male",
        "admission_time": "2026-03-04 22:00",
        "diagnosis": "Necrotizing pancreatitis",
        "comorbidities": ["Alcoholic Liver Disease", "Chronic Pancreatitis"],
        "current_location": "ICU Bed 2",
        "hours_from_admission": 12
    }
}


# ============ API Endpoints ============

@app.get("/", response_class=HTMLResponse)
async def root():
    """Home page - Landing Page"""
    with open(BASE_DIR / "templates" / "landing.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    """Dashboard page"""
    with open(BASE_DIR / "templates" / "index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/api/patients", response_model=List[Patient])
async def get_patients():
    """Get all patients"""
    return list(MOCK_PATIENTS.values())


@app.get("/api/patients/{patient_id}", response_model=PatientDetail)
async def get_patient_detail(patient_id: str):
    """Get patient detail with real-time risk prediction"""
    if patient_id not in MOCK_PATIENTS:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient_data = MOCK_PATIENTS[patient_id]

    # Generate real-time vitals
    vitals = generate_mock_vitals(patient_id, patient_data["hours_from_admission"])

    # Calculate risk
    risk = calculate_risk(vitals, patient_id, patient_data["hours_from_admission"])

    # Generate explanation
    explanation = generate_shap_explanation(vitals, risk)

    # Generate timeline events
    timeline = generate_timeline_events(patient_id, vitals, risk, patient_data)

    # Generate AI clinical report
    ai_report, ai_confidence = generate_ai_clinical_report(patient_data, vitals, risk)

    return PatientDetail(
        **patient_data,
        vitals=vitals,
        risk_prediction=risk,
        risk_explanation=explanation,
        last_update=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        timeline_events=timeline,
        ai_clinical_report=ai_report,
        ai_report_confidence=ai_confidence
    )


@app.get("/api/patients/{patient_id}/vitals/history")
async def get_vitals_history(patient_id: str, hours: int = 24):
    """Get patient vitals history"""
    if patient_id not in MOCK_PATIENTS:
        raise HTTPException(status_code=404, detail="Patient not found")

    history = []
    now = datetime.now()

    for i in range(hours):
        timestamp = now - timedelta(hours=hours-i)
        vitals = generate_mock_vitals(patient_id, i)
        risk = calculate_risk(vitals, patient_id, i)

        history.append({
            "timestamp": timestamp.strftime("%Y-%m-%d %H:%M"),
            "heart_rate": vitals.heart_rate,
            "blood_pressure_systolic": vitals.blood_pressure_systolic,
            "lactate": vitals.lactate,
            "sepsis_risk": risk.sepsis_risk
        })

    return {"history": history}


@app.get("/api/system/status")
async def get_system_status():
    """Get system status"""
    return {
        "status": "operational",
        "model_version": "v2.1.0",
        "last_training": "2026-02-28",
        "data_sources": ["MIMIC-IV", "eICU", "Tianjin Medical University General Hospital"],
        "uptime": "99.8%",
        "predictions_last_24h": 1247,
        "alerts_triggered": 23
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
