// ============================================
// SepsisAI Dashboard - Application Logic
// ============================================

const API_BASE = window.location.origin;
let currentPatient = null;
let patientsCache = [];
let patientsDetailCache = {}; // Cache for patient details
let autoRefreshInterval = null;

// ============================================
// Utility Functions
// ============================================

function getRiskLevel(risk) {
    if (risk >= 70) return { level: 'high', class: 'risk-high' };
    if (risk >= 40) return { level: 'medium', class: 'risk-medium' };
    return { level: 'low', class: 'risk-low' };
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateCurrentTime() {
    const now = new Date();
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
}

// ============================================
// API Calls
// ============================================

async function fetchPatients() {
    try {
        const response = await fetch(`${API_BASE}/api/patients`);
        if (!response.ok) throw new Error('Failed to fetch patients');
        return await response.json();
    } catch (error) {
        console.error('Error fetching patients:', error);
        return [];
    }
}

async function fetchPatientDetail(patientId) {
    try {
        const response = await fetch(`${API_BASE}/api/patients/${patientId}`);
        if (!response.ok) throw new Error('Failed to fetch patient detail');
        return await response.json();
    } catch (error) {
        console.error('Error fetching patient detail:', error);
        return null;
    }
}

// ============================================
// UI Rendering
// ============================================

function renderPatientList(patients) {
    const container = document.getElementById('patientList');
    if (!container) return;

    if (!patients || patients.length === 0) {
        container.innerHTML = '<div class="loading-state"><p>No patients available</p></div>';
        return;
    }

    container.innerHTML = patients.map(patient => `
        <div class="patient-card" data-patient-id="${patient.patient_id}">
            <div class="patient-card-header">
                <span class="patient-card-name">${patient.name}</span>
                <span class="patient-risk-badge">Loading...</span>
            </div>
            <div class="patient-card-meta">
                <span>${patient.age}y</span>
                <span>${patient.gender}</span>
            </div>
            <div class="patient-card-location">
                <span>📍</span>
                <span>${patient.current_location}</span>
            </div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.patient-card').forEach(card => {
        card.addEventListener('click', () => {
            const patientId = card.dataset.patientId;
            selectPatient(patientId);
        });
    });
}

async function updatePatientRisks() {
    for (const patient of patientsCache) {
        try {
            const detail = await fetchPatientDetail(patient.patient_id);
            if (!detail) continue;

            // Cache the detail
            patientsDetailCache[patient.patient_id] = detail;

            const card = document.querySelector(`[data-patient-id="${patient.patient_id}"]`);
            if (!card) continue;

            const badge = card.querySelector('.patient-risk-badge');
            const risk = getRiskLevel(detail.risk_prediction.sepsis_risk);
            badge.textContent = `${Math.round(detail.risk_prediction.sepsis_risk)}%`;
            badge.className = `patient-risk-badge ${risk.class}`;
        } catch (error) {
            console.error(`Error updating risk for ${patient.patient_id}:`, error);
        }
    }
}

async function selectPatient(patientId) {
    // Update active state
    document.querySelectorAll('.patient-card').forEach(card => {
        card.classList.remove('active');
    });
    const selectedCard = document.querySelector(`[data-patient-id="${patientId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }

    // Show loading
    const panel = document.getElementById('mainPanel');
    panel.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading patient data...</p></div>';

    // Use cached detail if available (to sync with sidebar), otherwise fetch new
    let detail;
    if (patientsDetailCache[patientId]) {
        detail = patientsDetailCache[patientId];
        console.log('Using cached detail for', patientId);

        // Update sidebar badge with cached data to ensure sync
        if (selectedCard) {
            const badge = selectedCard.querySelector('.patient-risk-badge');
            const risk = getRiskLevel(detail.risk_prediction.sepsis_risk);
            badge.textContent = `${Math.round(detail.risk_prediction.sepsis_risk)}%`;
            badge.className = `patient-risk-badge ${risk.class}`;
        }
    } else {
        detail = await fetchPatientDetail(patientId);
        if (!detail) return;
        patientsDetailCache[patientId] = detail;

        // Update sidebar badge with fresh data
        if (selectedCard) {
            const badge = selectedCard.querySelector('.patient-risk-badge');
            const risk = getRiskLevel(detail.risk_prediction.sepsis_risk);
            badge.textContent = `${Math.round(detail.risk_prediction.sepsis_risk)}%`;
            badge.className = `patient-risk-badge ${risk.class}`;
        }
    }

    currentPatient = detail;
    renderPatientDetail(detail);
}

function renderPatientDetail(patient) {
    const template = document.getElementById('patientDetailTemplate');
    const panel = document.getElementById('mainPanel');
    const clone = template.content.cloneNode(true);

    // Patient info
    clone.querySelector('.patient-name').textContent = patient.name;
    clone.querySelector('.patient-age').textContent = patient.age;
    clone.querySelector('.patient-gender').textContent = patient.gender;
    clone.querySelector('.patient-id').textContent = patient.patient_id;
    clone.querySelector('.patient-time').textContent = formatTime(patient.admission_time);
    clone.querySelector('.patient-location').textContent = patient.current_location;

    // Diagnosis
    clone.querySelector('.diagnosis-text').textContent = patient.diagnosis;
    const comorbiditiesList = clone.querySelector('.comorbidities-list');
    patient.comorbidities.forEach(comorbidity => {
        const tag = document.createElement('span');
        tag.className = 'comorbidity-tag';
        tag.textContent = comorbidity;
        comorbiditiesList.appendChild(tag);
    });

    // Risk prediction
    const risk = patient.risk_prediction;
    clone.querySelector('.sepsis-risk-fill').style.opacity = risk.sepsis_risk / 100;
    clone.querySelector('.sepsis-risk-number').textContent = Math.round(risk.sepsis_risk);
    clone.querySelector('.confidence-value').style.width = `${risk.confidence}%`;
    clone.querySelector('.confidence-value-text').textContent = `${Math.round(risk.confidence)}%`;
    clone.querySelector('.prediction-time').textContent = formatTime(risk.prediction_time);

    // Secondary risks
    clone.querySelector('.aki-risk-fill').style.width = `${risk.aki_risk}%`;
    clone.querySelector('.aki-risk-value').textContent = `${Math.round(risk.aki_risk)}%`;
    clone.querySelector('.ards-risk-fill').style.width = `${risk.ards_risk}%`;
    clone.querySelector('.ards-risk-value').textContent = `${Math.round(risk.ards_risk)}%`;
    clone.querySelector('.mortality-risk-fill').style.width = `${risk.mortality_risk}%`;
    clone.querySelector('.mortality-risk-value').textContent = `${Math.round(risk.mortality_risk)}%`;

    // Vitals
    const vitals = patient.vitals;
    clone.querySelector('.heart-rate-value').textContent = Math.round(vitals.heart_rate);
    clone.querySelector('.bp-value').textContent =
        `${Math.round(vitals.blood_pressure_systolic)}/${Math.round(vitals.blood_pressure_diastolic)}`;
    clone.querySelector('.temp-value').textContent = vitals.temperature.toFixed(1);
    clone.querySelector('.rr-value').textContent = Math.round(vitals.respiratory_rate);
    clone.querySelector('.spo2-value').textContent = Math.round(vitals.spo2);
    clone.querySelector('.lactate-value').textContent = vitals.lactate.toFixed(2);
    clone.querySelector('.vitals-time').textContent = formatTime(patient.last_update);

    // Risk explanation
    const explanation = patient.risk_explanation;
    const trendBadge = clone.querySelector('.risk-trend');
    const trendLabels = { rising: 'Rising', stable: 'Stable', falling: 'Falling' };
    trendBadge.textContent = trendLabels[explanation.risk_trend] || explanation.risk_trend;
    trendBadge.className = `risk-trend-badge trend-${explanation.risk_trend}`;

    // SHAP factors
    const factorsList = clone.querySelector('.factors-list');
    explanation.top_factors.forEach(factor => {
        const div = document.createElement('div');
        div.className = 'factor-item';
        div.innerHTML = `
            <span class="factor-name">${factor.display_name}</span>
            <span class="factor-change change-${factor.change}">
                ${factor.change === 'increased' ? '↑' : '↓'} ${Math.abs(factor.delta).toFixed(2)}
            </span>
            <span class="factor-impact">${factor.value.toFixed(2)}</span>
        `;
        factorsList.appendChild(div);
    });

    // Alerts
    const alertsList = clone.querySelector('.alerts-list');
    if (explanation.critical_alerts.length > 0) {
        explanation.critical_alerts.forEach(alert => {
            const div = document.createElement('div');
            div.className = 'alert-item';
            div.textContent = alert;
            alertsList.appendChild(div);
        });
    } else {
        alertsList.innerHTML = '<div class="alert-item" style="background: var(--success-dim); border-color: var(--success); color: var(--success);">✓ No critical alerts</div>';
    }

    // Recommendations
    const recommendationsList = clone.querySelector('.recommendations-list');
    if (explanation.recommendations.length > 0) {
        explanation.recommendations.forEach(rec => {
            const div = document.createElement('div');
            div.className = 'recommendation-item';
            div.textContent = rec;
            recommendationsList.appendChild(div);
        });
    } else {
        recommendationsList.innerHTML = '<div class="recommendation-item">Continue monitoring</div>';
    }

    // Render
    panel.innerHTML = '';
    panel.appendChild(clone);

    // Animate risk bars
    animateRiskBars();
}

function animateRiskBars() {
    const bars = document.querySelectorAll('.secondary-risk-fill, .confidence-fill');
    bars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = width;
        }, 100);
    });
}

// ============================================
// Auto Refresh
// ============================================

function startAutoRefresh(interval = 30000) {
    stopAutoRefresh();
    autoRefreshInterval = setInterval(async () => {
        // Update all patients' risk scores first
        await updatePatientRisks();

        // Then update current patient detail if selected
        if (currentPatient) {
            await selectPatient(currentPatient.patient_id);
        }

        updateCurrentTime();
    }, interval);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// ============================================
// Initialization
// ============================================

async function initApp() {
    console.log('Initializing SepsisAI Dashboard...');

    // Load patients
    const patients = await fetchPatients();
    patientsCache = patients;
    renderPatientList(patients);

    // Update risk scores
    await updatePatientRisks();

    // Update time
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // Start auto refresh (30 seconds)
    startAutoRefresh(30000);

    console.log('Dashboard initialized');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
