import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Home, School, Users, ChevronRight, Info, PieChart, MapPin } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';

const VillageDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [village, setVillage] = useState(null);
    const [schools, setSchools] = useState([]);
    const [newMuslims, setNewMuslims] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVillageDetails = async () => {
            if (!id) return;
            try {
                const api = FirestoreApi.Api;
                // Fetch Village
                const allVillages = await api.getCollectionGroupDocuments('villages');
                const vilDoc = allVillages.find(v => v.id === id);
                if (!vilDoc) return;
                setVillage({ id, ...vilDoc.data() });

                // Fetch Schools in this Village
                const allSchools = await api.getCollectionGroupDocuments('schools');
                const vilSchools = allSchools.filter(s => s.data().villageId === id).map(s => ({ id: s.id, ...s.data() }));
                setSchools(vilSchools);

                const newMuslimsDocs = await api.getDocuments(api.getCollection('new_muslims'));
                const villageNewMuslims = newMuslimsDocs
                  .map((doc) => ({ id: doc.id, ...doc.data() }))
                  .filter((doc) => doc.villageId === id);
                setNewMuslims(villageNewMuslims);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchVillageDetails();
    }, [id]);

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!village) return <div style={{ padding: '2rem', textAlign: 'center' }}>القرية غير موجودة</div>;

    const StatBox = ({ label, value, color }) => (
        <div className="surface-card" style={{ padding: '1.25rem', borderRadius: '16px', flex: 1, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{label}</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: color }}>{value}</h3>
        </div>
    );

    const menCount = newMuslims.filter((m) => m.type === 'رجل').length;
    const womenCount = newMuslims.filter((m) => m.type === 'امرأة').length;
    const childrenCount = newMuslims.filter((m) => m.type === 'طفل').length;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader
              topRow={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="page-nav-back" onClick={() => navigate('/villages')}>
                    <ChevronRight size={20} aria-hidden /> إدارة القرى
                  </button>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.35 }} aria-hidden />
                </div>
              }
              title={<>إحصائيات قرية: <span style={{ color: 'var(--md-primary)' }}>{village.villageName}</span></>}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Demographics Card */}
                    <div className="surface-card surface-card--lg" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <PieChart size={24} color="var(--accent-color)" />
                            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>الإحصائيات السكانية والديموغرافية</h2>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <StatBox label="إجمالي السكان" value={village.populationCount} color="var(--text-primary)" />
                            <StatBox label="المسلمون" value={village.muslimsCount} color="var(--success-color)" />
                            <StatBox label="غير المسلمين" value={village.nonMuslimsCount} color="var(--danger-color)" />
                        </div>
                        
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--success-color)' }}>المهتدون الجدد (New Muslims)</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div><strong>👨 رجال:</strong> {menCount}</div>
                                <div><strong>👩 نساء:</strong> {womenCount}</div>
                                <div><strong>👧 أطفال:</strong> {childrenCount}</div>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                              {newMuslims.length === 0 ? (
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>لا توجد سجلات مهتدين مضافة بعد.</p>
                              ) : (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                  {newMuslims.map((m) => (
                                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 10px' }}>
                                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{m.name}</span>
                                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{m.type}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                        </div>
                    </div>

                    {/* Schools Card */}
                    <div className="surface-card surface-card--lg" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <School size={24} color="var(--accent-color)" />
                            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>المدارس والمراكز التعليمية في القرية</h2>
                        </div>
                        {schools.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>لا توجد مدارس مسجلة في هذه القرية حالياً.</p> : (
                            <div style={{ display: 'grid', gap: '10px' }}>
                                {schools.map(sch => (
                                    <div key={sch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                        <div>
                                            <h4 style={{ margin: 0 }}>{sch.name}</h4>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🆔 {sch.id}</p>
                                        </div>
                                        <button onClick={() => navigate(`/schools/${sch.id}`)} className="icon-btn"><Info size={18}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="surface-card surface-card--lg" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} color="var(--accent-color)"/> التصنيف الميداني</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1.25rem' }}>
                            <div style={{ fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>اسم المجموعة:</span><br/>
                                <strong>{village.groupName || 'غير محدد'}</strong>
                            </div>
                            <div style={{ fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>تصنيف LTI:</span><br/>
                                <strong>{village.ltiName || 'غير محدد'}</strong>
                            </div>
                            <div style={{ fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>معرف المنطقة:</span><br/>
                                <strong>{village.regionId}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VillageDetailsPage;
