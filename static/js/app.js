// ============================================
// Sepsis Navigator Dashboard - Application Logic
// ============================================

const API_BASE = window.location.origin;
let currentPatient = null;
let patientsCache = [];
let patientsDetailCache = {};
let autoRefreshInterval = null;

// Global sparkline data storage for tooltip hover
let sparklineDataStore = {
    sparklineHR: { data: [], timestamps: [], color: '#2563EB', options: {} },
    sparklineRisk: { data: [], timestamps: [], color: '#DC2626', options: {} }
};

// SVG icon for map-pin (used in template literals)
const SVG_MAP_PIN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';

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

function isMobile() {
    return window.innerWidth <= 768;
}

// ============================================
// Dark Mode Toggle
// ============================================

function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    // Restore saved theme
    const savedTheme = localStorage.getItem('sepsis-nav-theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('sepsis-nav-theme', next);

        // Re-render sparklines since canvas colors may need updating
        if (currentPatient) {
            setTimeout(() => renderVitalsSparklines(currentPatient.patient_id), 100);
        }
    });
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

async function fetchVitalsHistory(patientId) {
    try {
        const response = await fetch(`${API_BASE}/api/patients/${patientId}/vitals/history`);
        if (!response.ok) throw new Error('Failed to fetch vitals history');
        return await response.json();
    } catch (error) {
        console.error('Error fetching vitals history:', error);
        return null;
    }
}

// ============================================
// Sparkline Renderer
// ============================================

function renderSparkline(canvasId, data, color, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size for HiDPI
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 8, right: 8, bottom: 8, left: 8 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Compute min/max
    const values = data.map(d => (typeof d === 'object' ? d.value : d));
    const minVal = options.min !== undefined ? options.min : Math.min(...values);
    const maxVal = options.max !== undefined ? options.max : Math.max(...values);
    const range = maxVal - minVal || 1;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw subtle horizontal grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
        const y = padding.top + (chartHeight / 3) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    // Map data to points
    const points = values.map((val, i) => ({
        x: padding.left + (i / (values.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((val - minVal) / range) * chartHeight
    }));

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(1, color + '05');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach((p, i) => {
        if (i === 0) {
            ctx.lineTo(p.x, p.y);
        } else {
            // Smooth curve using quadratic bezier
            const prev = points[i - 1];
            const cpX = (prev.x + p.x) / 2;
            ctx.quadraticCurveTo(prev.x + (cpX - prev.x) * 0.5, prev.y, cpX, (prev.y + p.y) / 2);
            ctx.quadraticCurveTo(p.x - (p.x - cpX) * 0.5, p.y, p.x, p.y);
        }
    });
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw the line
    ctx.beginPath();
    points.forEach((p, i) => {
        if (i === 0) {
            ctx.moveTo(p.x, p.y);
        } else {
            const prev = points[i - 1];
            const cpX = (prev.x + p.x) / 2;
            ctx.quadraticCurveTo(prev.x + (cpX - prev.x) * 0.5, prev.y, cpX, (prev.y + p.y) / 2);
            ctx.quadraticCurveTo(p.x - (p.x - cpX) * 0.5, p.y, p.x, p.y);
        }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw last point dot
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Draw min/max labels
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(maxVal.toFixed(0), padding.left + 2, padding.top + 10);
    ctx.fillText(minVal.toFixed(0), padding.left + 2, height - padding.bottom - 2);

    // Store computed points for tooltip hover
    if (sparklineDataStore[canvasId]) {
        sparklineDataStore[canvasId].points = points;
        sparklineDataStore[canvasId].padding = padding;
        sparklineDataStore[canvasId].chartWidth = chartWidth;
        sparklineDataStore[canvasId].chartHeight = chartHeight;
        sparklineDataStore[canvasId].width = width;
        sparklineDataStore[canvasId].height = height;
        sparklineDataStore[canvasId].minVal = minVal;
        sparklineDataStore[canvasId].maxVal = maxVal;
    }
}

// ============================================
// Sparkline Tooltip Hover Handler
// ============================================

function initSparklineTooltips() {
    ['sparklineHR', 'sparklineRisk'].forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const tooltipId = canvasId === 'sparklineHR' ? 'tooltipHR' : 'tooltipRisk';
        const tooltip = document.getElementById(tooltipId);
        if (!tooltip) return;

        canvas.addEventListener('mousemove', (e) => {
            const store = sparklineDataStore[canvasId];
            if (!store || !store.data || store.data.length === 0 || !store.points) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;

            // Find nearest point
            let nearestIdx = 0;
            let nearestDist = Infinity;
            store.points.forEach((p, i) => {
                const dist = Math.abs(p.x - mouseX);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = i;
                }
            });

            const value = store.data[nearestIdx];
            const timestamp = store.timestamps[nearestIdx] || `${nearestIdx}h ago`;
            const point = store.points[nearestIdx];

            // Update tooltip content
            tooltip.querySelector('.tooltip-time').textContent = timestamp;
            const unit = canvasId === 'sparklineHR' ? ' bpm' : '%';
            tooltip.querySelector('.tooltip-value').textContent = (typeof value === 'number' ? value.toFixed(1) : value) + unit;

            // Position tooltip
            tooltip.style.display = 'block';
            tooltip.style.left = point.x + 'px';
            tooltip.style.top = (point.y - 4) + 'px';

            // Redraw sparkline with crosshair
            renderSparkline(canvasId, store.data, store.color, store.options);

            // Draw crosshair
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(point.x, store.padding.top);
            ctx.lineTo(point.x, store.height - store.padding.bottom);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw hover dot
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = store.color;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.restore();
        });

        canvas.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
            // Redraw without crosshair
            const store = sparklineDataStore[canvasId];
            if (store && store.data && store.data.length > 0) {
                renderSparkline(canvasId, store.data, store.color, store.options);
            }
        });
    });
}

async function fetchSystemStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/system/status`);
        if (!response.ok) return;
        const status = await response.json();
        const versionEl = document.getElementById('modelVersion');
        const predEl = document.getElementById('predictionsCount');
        if (versionEl) versionEl.textContent = status.model_version || 'v2.1.0';
        if (predEl) predEl.textContent = (status.predictions_last_24h || 0).toLocaleString();
    } catch (e) {
        console.error('Error fetching system status:', e);
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
                <span>${SVG_MAP_PIN}</span>
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

function scrollToActivePatient(patientId) {
    if (!isMobile()) return;
    const card = document.querySelector(`[data-patient-id="${patientId}"]`);
    if (!card) return;
    const container = document.getElementById('patientList');
    if (!container) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

    // On mobile, scroll the strip to show active patient
    scrollToActivePatient(patientId);

    // Show loading
    const panel = document.getElementById('mainPanel');
    panel.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading patient data...</p></div>';

    // Use cached detail if available, otherwise fetch new
    let detail;
    if (patientsDetailCache[patientId]) {
        detail = patientsDetailCache[patientId];

        // Update sidebar badge with cached data
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

    // Timeline events
    const timelineTrack = clone.querySelector('.timeline-track');
    if (patient.timeline_events && patient.timeline_events.length > 0) {
        const typeIcons = {
            admission: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
            warning: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            alert: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            intervention: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            observation: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
        };
        patient.timeline_events.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = `timeline-event type-${event.type}`;
            const icon = typeIcons[event.type] || typeIcons.observation;
            eventEl.innerHTML = `
                <div class="timeline-node">${icon}</div>
                <div class="timeline-event-header">
                    <span class="timeline-event-name">${event.event}</span>
                    <span class="timeline-event-time">${event.time}</span>
                </div>
                <div class="timeline-event-detail">${event.detail}</div>
            `;
            timelineTrack.appendChild(eventEl);
        });
    } else {
        timelineTrack.innerHTML = '<div class="timeline-event type-observation"><div class="timeline-node"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="timeline-event-header"><span class="timeline-event-name">No events recorded</span></div></div>';
    }

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
                ${factor.change === 'increased' ? '\u2191' : '\u2193'} ${Math.abs(factor.delta).toFixed(2)}
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
        alertsList.innerHTML = '<div class="alert-item" style="background: var(--success-dim); border-color: var(--success); color: var(--success);">No critical alerts</div>';
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

    // AI Clinical Intelligence Report
    const aiReportContent = clone.querySelector('.ai-report-content');
    const aiConfidenceValue = clone.querySelector('.ai-confidence-value');
    const confidenceRingFill = clone.querySelector('.confidence-ring-fill');
    if (patient.ai_clinical_report) {
        aiReportContent.textContent = patient.ai_clinical_report;
    } else {
        aiReportContent.textContent = 'AI clinical report is being generated...';
    }
    if (patient.ai_report_confidence) {
        aiConfidenceValue.textContent = `${patient.ai_report_confidence.toFixed(0)}%`;
        // Animate the SVG ring gauge
        const circumference = 2 * Math.PI * 30; // r=30 in the SVG
        const offset = circumference - (patient.ai_report_confidence / 100) * circumference;
        if (confidenceRingFill) {
            confidenceRingFill.style.strokeDasharray = circumference;
            confidenceRingFill.style.strokeDashoffset = circumference; // start empty
            // Animate after DOM insertion
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    confidenceRingFill.style.strokeDashoffset = offset;
                });
            });
        }
    } else {
        aiConfidenceValue.textContent = '--';
    }

    // Render
    panel.innerHTML = '';
    panel.appendChild(clone);

    // Animate risk bars
    animateRiskBars();

    // Fetch and render sparklines
    renderVitalsSparklines(patient.patient_id);
}

async function renderVitalsSparklines(patientId) {
    const history = await fetchVitalsHistory(patientId);

    // Parse history: API returns {history: [{heart_rate, sepsis_risk, timestamp, ...}, ...]}
    let hrData = null;
    let riskData = null;
    let timestamps = null;
    if (history && history.history && Array.isArray(history.history) && history.history.length > 0) {
        hrData = history.history.map(d => d.heart_rate);
        riskData = history.history.map(d => d.sepsis_risk);
        timestamps = history.history.map(d => d.timestamp || '');
    }

    if (hrData && hrData.length > 0) {
        const hrOptions = {
            min: Math.min(...hrData) - 5,
            max: Math.max(...hrData) + 5
        };
        // Store data globally for tooltip hover
        sparklineDataStore.sparklineHR = {
            data: hrData,
            timestamps: timestamps || [],
            color: '#2563EB',
            options: hrOptions
        };
        requestAnimationFrame(() => {
            renderSparkline('sparklineHR', hrData, '#2563EB', hrOptions);
        });
    } else {
        // Generate synthetic data from current vitals for display
        const detail = patientsDetailCache[patientId];
        if (detail) {
            const baseHR = detail.vitals.heart_rate;
            const syntheticHR = Array.from({ length: 24 }, (_, i) =>
                baseHR + (Math.sin(i * 0.5) * 8) + (Math.random() * 6 - 3)
            );
            const syntheticTimestamps = Array.from({ length: 24 }, (_, i) => `${24 - i}h ago`);
            const hrOptions = {
                min: Math.min(...syntheticHR) - 5,
                max: Math.max(...syntheticHR) + 5
            };
            sparklineDataStore.sparklineHR = {
                data: syntheticHR,
                timestamps: syntheticTimestamps,
                color: '#2563EB',
                options: hrOptions
            };
            requestAnimationFrame(() => {
                renderSparkline('sparklineHR', syntheticHR, '#2563EB', hrOptions);
            });
        }
    }

    if (riskData && riskData.length > 0) {
        const riskOptions = { min: 0, max: 100 };
        sparklineDataStore.sparklineRisk = {
            data: riskData,
            timestamps: timestamps || [],
            color: '#DC2626',
            options: riskOptions
        };
        requestAnimationFrame(() => {
            renderSparkline('sparklineRisk', riskData, '#DC2626', riskOptions);
        });
    } else {
        // Generate synthetic risk data
        const detail = patientsDetailCache[patientId];
        if (detail) {
            const baseRisk = detail.risk_prediction.sepsis_risk;
            const syntheticRisk = Array.from({ length: 24 }, (_, i) =>
                Math.max(0, Math.min(100, baseRisk + (Math.sin(i * 0.3) * 10) + (Math.random() * 5 - 2.5)))
            );
            const syntheticTimestamps = Array.from({ length: 24 }, (_, i) => `${24 - i}h ago`);
            const riskOptions = { min: 0, max: 100 };
            sparklineDataStore.sparklineRisk = {
                data: syntheticRisk,
                timestamps: syntheticTimestamps,
                color: '#DC2626',
                options: riskOptions
            };
            requestAnimationFrame(() => {
                renderSparkline('sparklineRisk', syntheticRisk, '#DC2626', riskOptions);
            });
        }
    }

    // Initialize tooltip handlers after sparklines are rendered
    setTimeout(() => initSparklineTooltips(), 200);
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
// Window resize handler for sparklines
// ============================================

let resizeTimeout = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentPatient) {
            renderVitalsSparklines(currentPatient.patient_id);
        }
    }, 200);
});

// ============================================
// Initialization
// ============================================

async function initApp() {
    console.log('Initializing Sepsis Navigator Dashboard...');

    // Initialize dark mode toggle
    initThemeToggle();

    // Load patients
    const patients = await fetchPatients();
    patientsCache = patients;
    renderPatientList(patients);

    // Update patient count
    const countEl = document.getElementById('patientCountNum');
    if (countEl) countEl.textContent = patients.length;

    // Fetch system status for header metrics
    fetchSystemStatus();

    // Update risk scores
    await updatePatientRisks();

    // Auto-select the first patient (P001)
    if (patientsCache.length > 0) {
        const firstPatientId = patientsCache[0].patient_id;
        console.log('Auto-selecting first patient:', firstPatientId);
        await selectPatient(firstPatientId);
    }

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
