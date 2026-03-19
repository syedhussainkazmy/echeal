import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const DoctorLayout = lazy(() => import('./components/layout/DoctorLayout'));
const PatientLayout = lazy(() => import('./components/layout/PatientLayout'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminStaff = lazy(() => import('./pages/admin/Staff'));
const AdminAppointments = lazy(() => import('./pages/admin/Appointments'));
const AdminInventory = lazy(() => import('./pages/admin/Inventory'));
const AdminPrescriptions = lazy(() => import('./pages/admin/Prescriptions.tsx'));

const DoctorDashboard = lazy(() => import('./pages/doctor/Dashboard'));
const DoctorAppointments = lazy(() => import('./pages/doctor/Appointments'));
const DoctorPatients = lazy(() => import('./pages/doctor/Patients'));
const PatientEHR = lazy(() => import('./pages/doctor/PatientEHR'));
const DoctorProfile = lazy(() => import('./pages/doctor/Profile'));
const DoctorPrescriptions = lazy(() => import('./pages/doctor/Prescriptions.tsx'));
const DoctorPatientPurchases = lazy(() => import('./pages/doctor/PatientPurchases.tsx'));

const PatientDashboard = lazy(() => import('./pages/patient/Dashboard'));
const PatientAppointments = lazy(() => import('./pages/patient/Appointments'));
const PatientVitals = lazy(() => import('./pages/patient/Vitals'));
const PatientProfile = lazy(() => import('./pages/patient/Profile'));
const PatientPrescriptions = lazy(() => import('./pages/patient/Prescriptions.tsx'));
const PatientStore = lazy(() => import('./pages/patient/Store.tsx'));

const AppLoadingFallback = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<AppLoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Patient Routes */}
            <Route path="/patient/*" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientLayout>
                  <Routes>
                    <Route path="/" element={<PatientDashboard />} />
                    <Route path="/appointments" element={<PatientAppointments />} />
                    <Route path="/prescriptions" element={<PatientPrescriptions />} />
                    <Route path="/store" element={<PatientStore />} />
                    <Route path="/vitals" element={<PatientVitals />} />
                    <Route path="/profile" element={<PatientProfile />} />
                  </Routes>
                </PatientLayout>
              </ProtectedRoute>
            } />

            {/* Doctor Routes */}
            <Route path="/doctor/*" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorLayout>
                  <Routes>
                    <Route path="/" element={<DoctorDashboard />} />
                    <Route path="/appointments" element={<DoctorAppointments />} />
                    <Route path="/patients" element={<DoctorPatients />} />
                    <Route path="/prescriptions" element={<DoctorPrescriptions />} />
                    <Route path="/patient-purchases" element={<DoctorPatientPurchases />} />
                    <Route path="/patients/:patientId/ehr" element={<PatientEHR />} />
                    <Route path="/profile" element={<DoctorProfile />} />
                  </Routes>
                </DoctorLayout>
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/staff" element={<AdminStaff />} />
                    <Route path="/appointments" element={<AdminAppointments />} />
                    <Route path="/prescriptions" element={<AdminPrescriptions />} />
                    <Route path="/inventory" element={<AdminInventory />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
