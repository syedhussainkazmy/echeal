# eHeal Feature Testing Guide

## Test Accounts

### Admin
- Email: `admin@echeal.com`
- Password: `Admin@123`

### Doctor
- Email: `doctor.ayesha@echeal.com`
- Password: `Doctor@123`

### Patient
- Email: `patient.ali@echeal.com`
- Password: `Patient@123`

---

## Phase 1: HIPAA Compliance Features

### 1. Audit Logging
All PHI access is logged automatically.

**Test:**
- Login as any role
- Perform actions (view patient, create prescription, etc.)
- Check audit logs in database or verify logs are created

### 2. Data Encryption
Sensitive fields are encrypted in the database.

**Test:**
- View database records directly
- Verify PHI fields (name, email, medical history) are encrypted

### 3. RBAC (Role-Based Access Control)
- Patients can only access their own data
- Doctors can access their patients' data
- Admins have full access

**Test:**
- Try to access another user's data directly via API
- Should return 403 Forbidden

### 4. Consent Management
- Patients can grant/revoke consent for data sharing

**Test (Patient Panel):**
1. Login as patient
2. Go to Profile or check consent settings
3. Grant consent for 'data_sharing'
4. Verify in database Consent collection

---

## Phase 2: Data Pipelines

### Patient Panel Features

#### 1. Health Analytics (`/patient/analytics`)
**Route:** `/patient/analytics`

**Test:**
1. Login as patient
2. Navigate to "Health Analytics" in sidebar
3. View:
   - Alerts summary (abnormal vital signs)
   - Averages for all vitals
   - Blood pressure trend chart
   - Heart rate trend chart
   - Recent readings with alerts highlighted

#### 2. Vital Signs with Alerts (`/patient/vitals`)
**Route:** `/patient/vitals`

**Test:**
1. Login as patient
2. Go to "My Vitals"
3. Add new vital signs (including abnormal values like BP 180/110)
4. Check analytics page for alert indicators

### Doctor Panel Features

#### 1. Analytics Dashboard (`/doctor/analytics`)
**Route:** `/doctor/analytics`

**Test:**
1. Login as doctor
2. Navigate to "Analytics"
3. View:
   - Patients with critical alerts (from abnormal vitals)
   - Appointment statistics
   - Prescriptions count
   - Daily appointments bar chart

#### 2. Patient Vitals Access
**Test:**
1. Login as doctor
2. Go to "My Patients"
3. Select a patient
4. View their EHR to see their vitals with alerts

### Admin Panel Features

#### 1. Reports (`/admin/reports`)
**Route:** `/admin/reports`

**Test:**
1. Login as admin
2. Navigate to "Reports"
3. Test each report type:
   - **Appointments**: Filter by date range and status
   - **Prescriptions**: Filter by date range and status
   - **Patient Summary**: View patient's complete medical summary
   - **Analytics**: View system-wide analytics
4. Use Print button to print report

---

## Phase 3: LLM Integration

> **Note:** Requires `OPENAI_API_KEY` in server .env file

### 1. Symptom Checker
**Route:** `/patient/symptom-checker`

**Test:**
1. Login as patient
2. Navigate to "Symptom Checker"
3. Enter symptoms (e.g., "Headache for 2 days, mild fever")
4. Add duration and severity
5. Click "Analyze Symptoms"
6. View AI-generated analysis with:
   - Possible causes
   - Self-care recommendations
   - Warning signs
   - Doctor visit recommendation

### 2. Health Assistant (Chatbot)
**Route:** `/patient/chatbot`

**Test:**
1. Login as patient
2. Navigate to "Health Assistant"
3. Ask questions like:
   - "What are benefits of exercise?"
   - "How much water should I drink?"
   - "What are side effects of ibuprofen?"
4. View AI responses

### Doctor Panel - Medical Scribe
**Test (via API):**
```bash
curl -X POST http://localhost:5000/api/llm/scribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <doctor_token>" \
  -d '{
    "consultationNotes": "Patient presents with chest pain for 2 days. BP 140/90. Heart rate 90. Otherwise normal exam.",
    "patientInfo": {"name": "John", "age": 45, "gender": "Male"}
  }'
```

### Appointment Triage
**Test (via API):**
```bash
curl -X POST http://localhost:5000/api/llm/triage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "concern": "Severe chest pain radiating to arm",
    "symptoms": "chest pain, sweating, shortness of breath"
  }'
```

---

## Video Consultation (Previously Implemented)

### Start Video Call (Doctor)
**Test:**
1. Login as doctor
2. Go to "Appointments"
3. Find a confirmed appointment
4. Click "Start Video Consultation"
5. Wait for patient to join

### Join Video Call (Patient)
**Test:**
1. Login as patient (in another browser/incognito)
2. Go to "Appointments"
3. Find the same appointment
4. Click "Join Video Call"
5. Video call should connect

---

## API Endpoints Summary

### Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/vitals/alerts` | GET | Get vitals with alert indicators |
| `/api/analytics/vitals/trends` | GET | Get vital trends over time |
| `/api/analytics/vitals/alerts-summary` | GET | Get alerts summary |
| `/api/analytics/patients/alerts` | GET | Doctor: Get patients with critical alerts |
| `/api/analytics/patients/:patientId/vitals` | GET | Doctor: Get patient's vitals |
| `/api/analytics/doctor` | GET | Doctor analytics |
| `/api/analytics/admin` | GET | Admin analytics |

### Reporting
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reporting/patient/summary` | GET | Patient medical summary |
| `/api/reporting/patient/export` | GET | Export patient data (HIPAA) |
| `/api/reporting/patient/:patientId/history` | GET | Patient medical history |
| `/api/reporting/appointments` | GET | Appointment report |
| `/api/reporting/prescriptions` | GET | Prescription report |

### LLM
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/llm/status` | GET | Check if LLM is configured |
| `/api/llm/symptoms` | POST | Symptom analysis |
| `/api/llm/scribe` | POST | Medical scribe |
| `/api/llm/chat` | POST | Healthcare chatbot |
| `/api/llm/triage` | POST | Appointment triage |
| `/api/llm/prescriptions/summary` | POST | Prescription summary |

### Consent
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/consent/types` | GET | Get consent types |
| `/api/consent` | GET | Get patient consents |
| `/api/consent/grant` | POST | Grant consent |
| `/api/consent/revoke` | POST | Revoke consent |

---

## Quick Test Checklist

- [ ] Login as Admin → View empty dashboard (no data yet)
- [ ] Login as Doctor → View Analytics (no data yet)
- [ ] Login as Patient → View Health Analytics (no data yet)
- [ ] Run seed script to populate test data
- [ ] Retry dashboards to see populated data
- [ ] Test Reports functionality
- [ ] Test Symptom Checker (if LLM configured)
- [ ] Test Healthcare Chatbot (if LLM configured)
- [ ] Test Video Consultation

---

## Running Seed Data

```bash
cd server
npm run seed
```

This creates:
- 1 Admin user
- 3 Doctors
- 3 Patients
- Sample appointments
- Sample vitals
- Sample inventory items
