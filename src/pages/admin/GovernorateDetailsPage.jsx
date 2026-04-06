import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, MapPin, Home, ChevronRight, Info } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';

const GovernorateDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [gov, setGov] = useState(null);
    const [regions, setRegions] = useState([]);
    const [villages, setVillages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGovDetails = async () => {
            if (!id) return;
            try {
                const api = FirestoreApi.Api;
                // Fetch Governorate
                const govRef = api.getDocument('governorates', id);
                const govDoc = await api.getData(govRef);
                if (!govDoc) return;
                setGov({ id, ...govDoc });

                // Fetch Regions in this Gov
                const allRegions = await api.getCollectionGroupDocuments('regions');
                const govRegions = allRegions.filter(r => r.data().govId === id).map(r => ({ id: r.id, ...r.data() }));
                setRegions(govRegions);

                // Fetch Villages in this Gov (Villages are children of Regions in the data structure)
                const allVillages = await api.getCollectionGroupDocuments('villages');
                const regIds = govRegions.map(r => r.id);
                const govVillages = allVillages.filter(v => regIds.includes(v.data().regionId)).map(v => ({ id: v.id, ...v.data() }));
                setVillages(govVillages);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchGovDetails();
    }, [id]);

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!gov) return <div style={{ padding: '2rem', textAlign: 'center' }}>المحافظة غير موجودة</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => navigate('/governorates')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={20} /> إدارة المحافظات
                </button>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.3 }} />
                <h1 style={{ margin: 0, fontSize: '1.6rem' }}>محافظة: <span style={{ color: 'var(--accent-color)' }}>{gov.name}</span></h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Regions List */}
                <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <MapPin size={18} color="var(--accent-color)" /> المناطق التابعة
                        </h2>
                    </div>
                    {regions.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>لا توجد مناطق مضافة لهذه المحافظة.</p> : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                           {regions.map(reg => (
                              <div key={reg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                 <h4 style={{ margin: 0 }}>{reg.name}</h4>
                                 <button onClick={() => navigate(`/admin/regions/${reg.id}`)} className="icon-btn"><Info size={16}/></button>
                              </div>
                           ))}
                        </div>
                    )}
                </div>

                {/* Villages List */}
                <div style={{ background: 'var(--panel-color)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <Home size={18} color="var(--success-color)" /> القرى التابعة
                        </h2>
                    </div>
                    {villages.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>لا توجد قرى مضافة في هذه المحافظة.</p> : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                           {villages.map(vil => (
                              <div key={vil.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                 <h4 style={{ margin: 0 }}>{vil.villageName}</h4>
                                 <button onClick={() => navigate(`/admin/villages/${vil.id}`)} className="icon-btn"><Info size={16}/></button>
                              </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GovernorateDetailsPage;
