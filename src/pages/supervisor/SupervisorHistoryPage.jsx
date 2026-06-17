import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Eye, MapPin, Calendar, Star } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import { hasValidGps, openGoogleMaps } from '../../utils/maps';
import { formatVisitRatingLabel } from '../../utils/visitRating';

const SupervisorHistoryPage = ({ user }) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const supervisorId = useMemo(() => user?.uid || user?.id, [user?.uid, user?.id]);

  useEffect(() => {
    const fetchMyReports = async () => {
      setLoading(true);
      setError('');
      if (!supervisorId) {
        setReports([]);
        setLoading(false);
        setError('تعذر تحديد هوية المشرف. أعد تسجيل الدخول.');
        return;
      }
      try {
        const api = FirestoreApi.Api;
        const ref = api.getSupervisorReportsCollection(supervisorId);
        const docs = await api.getDocuments(ref);
        const data = docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        setReports(data);
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء جلب سجل زياراتك');
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyReports();
  }, [supervisorId]);

  if (loading) return <div className="loading-spinner page-loading-md" />;

  return (
    <div className="portal-page supervisor-history-page">
      <PageHeader
        icon={History}
        iconColor="var(--md-primary)"
        title="سجل زياراتي الميدانية"
        subtitle="مراجعة التقارير والتقييمات التي قمت برفعها سابقاً"
      />

      {error && <div className="app-alert app-alert--error portal-page-alert">{error}</div>}

      {reports.length === 0 ? (
        <div className="surface-card portal-empty-card">
          لا توجد زيارات مسجلة باسمك حتى الآن. ابدأ بأول زيارة من شاشة &quot;تسجيل زيارة ميدانية&quot;.
        </div>
      ) : (
        <div className="portal-history-grid">
          {reports.map((rpt) => (
            <div key={rpt.id} className="surface-card portal-history-card">
              <div className="portal-history-card__head">
                <span className="portal-history-card__date">
                  <Calendar size={14} /> {rpt.timestamp?.split('T')[0]}
                </span>
                <span className="portal-history-card__rating">
                  <Star size={14} className="portal-history-card__star" /> {formatVisitRatingLabel(rpt.teacherRating)}
                </span>
              </div>

              <h3 className="portal-history-card__school">{rpt.schoolName}</h3>
              <p className="portal-history-card__subject">
                {rpt.subjectName} - أسبوع {rpt.week}
              </p>

              {hasValidGps(rpt.gpsLocation) && (
                <button
                  type="button"
                  className="map-location-open map-location-open--inline"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleMaps(rpt.gpsLocation.lat, rpt.gpsLocation.lng);
                  }}
                >
                  <MapPin size={16} />
                  <span>موقع الزيارة على الخريطة</span>
                </button>
              )}

              <div className="portal-history-card__footer">
                <div className="portal-history-card__attachments">
                  {rpt.mediaUrls?.length || 0} مرفقات
                </div>
                <button
                  type="button"
                  className="google-btn portal-history-card__view-btn"
                  onClick={() => navigate(`/supervisor/reports/${rpt.id}`)}
                >
                  <Eye size={16} /> عرض التفاصيل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupervisorHistoryPage;
