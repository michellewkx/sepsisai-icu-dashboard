"""脓毒症AI监测系统 - FastAPI后端"""
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import random
import json

app = FastAPI(
    title="脓毒症AI监测系统",
    description="基于多阶段智能框架的脓毒症早期检测和管理系统",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")


# ============ 数据模型 ============

class Vitals(BaseModel):
    """生命体征"""
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
    """风险预测结果"""
    sepsis_risk: float  # 脓毒症风险 0-100
    aki_risk: float  # 急性肾损伤风险
    ards_risk: float  # ARDS风险
    mortality_risk: float  # 死亡风险
    confidence: float  # 预测置信度
    prediction_time: str


class SHAPValue(BaseModel):
    """SHAP解释值"""
    feature: str
    value: float
    display_name: str
    category: str  # 'vitals', 'labs', 'demographics'
    change: str  # 'increased', 'decreased', 'normal'
    delta: float  # 相对上次的变化


class RiskExplanation(BaseModel):
    """风险解释"""
    top_factors: List[SHAPValue]
    risk_trend: str  # 'rising', 'stable', 'falling'
    critical_alerts: List[str]
    recommendations: List[str]


class Patient(BaseModel):
    """患者信息"""
    patient_id: str
    name: str
    age: int
    gender: str
    admission_time: str
    diagnosis: str
    comorbidities: List[str]
    current_location: str


class PatientDetail(Patient):
    """患者详情（包含实时数据）"""
    vitals: Vitals
    risk_prediction: RiskPrediction
    risk_explanation: RiskExplanation
    last_update: str


# ============ Mock数据生成器 ============

def generate_mock_vitals(patient_id: str, hours_from_admission: int) -> Vitals:
    """生成模拟生命体征"""
    # 基础值
    base_hr = 80 + random.uniform(-10, 10)
    base_bp = 120 + random.uniform(-10, 10)

    # 模拟病情恶化趋势（部分患者）
    if patient_id in ['P002', 'P005']:
        deterioration = hours_from_admission * 2
        base_hr += deterioration
        base_bp -= deterioration * 0.5

    return Vitals(
        heart_rate=round(base_hr + random.uniform(-5, 5), 1),
        blood_pressure_systolic=round(base_bp + random.uniform(-10, 10), 1),
        blood_pressure_diastolic=round(base_bp * 0.6 + random.uniform(-5, 5), 1),
        respiratory_rate=round(16 + random.uniform(-2, 4), 1),
        temperature=round(37.0 + random.uniform(-0.5, 1.5), 1),
        spo2=round(96 + random.uniform(-2, 3), 1),
        lactate=round(2.0 + random.uniform(-0.5, 3.0), 2),
        creatinine=round(1.0 + random.uniform(-0.2, 1.5), 2),
        platelet_count=round(200 + random.uniform(-50, 100), 0),
        bilirubin=round(1.0 + random.uniform(-0.3, 1.5), 2),
        pao2_fio2_ratio=round(300 + random.uniform(-50, 100), 0)
    )


def calculate_risk(vitals: Vitals, patient_id: str, hours_from_admission: int) -> RiskPrediction:
    """基于生命体征计算风险"""
    # 简化的风险计算逻辑
    sepsis_score = 20

    # 心率异常
    if vitals.heart_rate > 90:
        sepsis_score += (vitals.heart_rate - 90) * 0.5
    elif vitals.heart_rate < 60:
        sepsis_score += (60 - vitals.heart_rate) * 0.3

    # 血压低
    if vitals.blood_pressure_systolic < 100:
        sepsis_score += (100 - vitals.blood_pressure_systolic) * 0.8

    # 体温异常
    if vitals.temperature > 38.0:
        sepsis_score += (vitals.temperature - 38.0) * 10
    elif vitals.temperature < 36.0:
        sepsis_score += (36.0 - vitals.temperature) * 10

    # 呼吸急促
    if vitals.respiratory_rate > 20:
        sepsis_score += (vitals.respiratory_rate - 20) * 2

    # 乳酸高
    if vitals.lactate > 2.0:
        sepsis_score += (vitals.lactate - 2.0) * 15

    # 特定患者风险更高
    if patient_id in ['P002', 'P005']:
        sepsis_score += hours_from_admission * 3

    sepsis_risk = min(max(sepsis_score, 5), 95)

    return RiskPrediction(
        sepsis_risk=round(sepsis_risk, 1),
        aki_risk=round(sepsis_risk * 0.7 + random.uniform(-5, 5), 1),
        ards_risk=round(sepsis_risk * 0.5 + random.uniform(-5, 5), 1),
        mortality_risk=round(sepsis_risk * 0.4 + random.uniform(-3, 3), 1),
        confidence=round(85 + random.uniform(-5, 10), 1),
        prediction_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )


def generate_shap_explanation(vitals: Vitals, risk: RiskPrediction) -> RiskExplanation:
    """生成SHAP解释"""
    factors = []

    # 分析每个特征
    if vitals.lactate > 3.0:
        factors.append(SHAPValue(
            feature="lactate",
            value=round(vitals.lactate, 2),
            display_name="乳酸",
            category="labs",
            change="increased",
            delta=round(vitals.lactate - 2.0, 2)
        ))

    if vitals.heart_rate > 100:
        factors.append(SHAPValue(
            feature="heart_rate",
            value=round(vitals.heart_rate, 1),
            display_name="心率",
            category="vitals",
            change="increased",
            delta=round(vitals.heart_rate - 80, 1)
        ))

    if vitals.blood_pressure_systolic < 100:
        factors.append(SHAPValue(
            feature="blood_pressure",
            value=round(vitals.blood_pressure_systolic, 1),
            display_name="收缩压",
            category="vitals",
            change="decreased",
            delta=round(100 - vitals.blood_pressure_systolic, 1)
        ))

    if vitals.respiratory_rate > 22:
        factors.append(SHAPValue(
            feature="respiratory_rate",
            value=round(vitals.respiratory_rate, 1),
            display_name="呼吸频率",
            category="vitals",
            change="increased",
            delta=round(vitals.respiratory_rate - 16, 1)
        ))

    if vitals.temperature > 38.0:
        factors.append(SHAPValue(
            feature="temperature",
            value=round(vitals.temperature, 1),
            display_name="体温",
            category="vitals",
            change="increased",
            delta=round(vitals.temperature - 37.0, 1)
        ))

    # 按影响程度排序
    factors.sort(key=lambda x: abs(x.delta), reverse=True)

    # 确定风险趋势
    if risk.sepsis_risk > 60:
        trend = "rising"
    elif risk.sepsis_risk < 30:
        trend = "falling"
    else:
        trend = "stable"

    # 生成告警和建议
    alerts = []
    recommendations = []

    if risk.sepsis_risk > 70:
        alerts.append("⚠️ 高脓毒症风险 - 需要立即评估")
        recommendations.append("考虑启动脓毒症bundle")
        recommendations.append("复查乳酸和血培养")

    if vitals.lactate > 4.0:
        alerts.append("🔴 严重高乳酸血症")
        recommendations.append("考虑液体复苏")

    if vitals.blood_pressure_systolic < 90:
        alerts.append("🔴 低血压 - 可能感染性休克")
        recommendations.append("开始血管活性药物")

    if not alerts and risk.sepsis_risk > 40:
        recommendations.append("继续密切监测")
        recommendations.append("2小时后重新评估")

    return RiskExplanation(
        top_factors=factors[:5],
        risk_trend=trend,
        critical_alerts=alerts,
        recommendations=recommendations
    )


# ============ Mock患者数据 ============

MOCK_PATIENTS = {
    "P001": {
        "patient_id": "P001",
        "name": "张伟",
        "age": 54,
        "gender": "男",
        "admission_time": "2026-03-04 08:00",
        "diagnosis": "社区获得性肺炎",
        "comorbidities": ["2型糖尿病", "高血压"],
        "current_location": "ICU-3床",
        "hours_from_admission": 24
    },
    "P002": {
        "patient_id": "P002",
        "name": "李秀英",
        "age": 67,
        "gender": "女",
        "admission_time": "2026-03-04 14:00",
        "diagnosis": "复杂性尿路感染",
        "comorbidities": ["慢性肾病", "冠心病"],
        "current_location": "ICU-5床",
        "hours_from_admission": 18
    },
    "P003": {
        "patient_id": "P003",
        "name": "王建国",
        "age": 45,
        "gender": "男",
        "admission_time": "2026-03-05 02:00",
        "diagnosis": "腹腔感染术后",
        "comorbidities": ["肥胖"],
        "current_location": "ICU-1床",
        "hours_from_admission": 8
    },
    "P004": {
        "patient_id": "P004",
        "name": "陈芳",
        "age": 72,
        "gender": "女",
        "admission_time": "2026-03-03 20:00",
        "diagnosis": "吸入性肺炎",
        "comorbidities": ["帕金森病", "脑梗死后遗症"],
        "current_location": "ICU-7床",
        "hours_from_admission": 38
    },
    "P005": {
        "patient_id": "P005",
        "name": "刘强",
        "age": 58,
        "gender": "男",
        "admission_time": "2026-03-04 22:00",
        "diagnosis": "坏死性胰腺炎",
        "comorbidities": ["酒精性肝病", "慢性胰腺炎"],
        "current_location": "ICU-2床",
        "hours_from_admission": 12
    }
}


# ============ API端点 ============

@app.get("/", response_class=HTMLResponse)
async def root():
    """主页 - 返回Dashboard"""
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/api/patients", response_model=List[Patient])
async def get_patients():
    """获取所有患者列表"""
    return list(MOCK_PATIENTS.values())


@app.get("/api/patients/{patient_id}", response_model=PatientDetail)
async def get_patient_detail(patient_id: str):
    """获取患者详情（包含实时风险预测）"""
    if patient_id not in MOCK_PATIENTS:
        raise HTTPException(status_code=404, detail="患者不存在")

    patient_data = MOCK_PATIENTS[patient_id]

    # 生成实时生命体征
    vitals = generate_mock_vitals(patient_id, patient_data["hours_from_admission"])

    # 计算风险
    risk = calculate_risk(vitals, patient_id, patient_data["hours_from_admission"])

    # 生成解释
    explanation = generate_shap_explanation(vitals, risk)

    return PatientDetail(
        **patient_data,
        vitals=vitals,
        risk_prediction=risk,
        risk_explanation=explanation,
        last_update=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )


@app.get("/api/patients/{patient_id}/vitals/history")
async def get_vitals_history(patient_id: str, hours: int = 24):
    """获取患者生命体征历史数据"""
    if patient_id not in MOCK_PATIENTS:
        raise HTTPException(status_code=404, detail="患者不存在")

    history = []
    now = datetime.now()

    for i in range(hours):
        timestamp = now - timedelta(hours=hours-i)
        vitals = generate_mock_vitals(patient_id, i)

        # 计算该时间点的风险
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
    """获取系统状态"""
    return {
        "status": "operational",
        "model_version": "v2.1.0",
        "last_training": "2026-02-28",
        "data_sources": ["MIMIC-IV", "eICU", "天津医科大学总医院"],
        "uptime": "99.8%",
        "predictions_last_24h": 1247,
        "alerts_triggered": 23
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
