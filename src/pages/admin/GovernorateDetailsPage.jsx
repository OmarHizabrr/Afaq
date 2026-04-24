import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, MapPin, Home, ChevronRight, Info } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';

const GovernorateDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [gov, setGov] = useState(null);
    const [regions, setRegions] = useState([]);
    const [villages, setVillages] = useState([]);
    const [loading, setLoading] = useState(true);
    const { can, ready, pageDataScope, membershipGroupIds, membershipLoading } = usePermissions();

    useEffect(() => {
        const fetchGovDetails = async () => {
            if (!id) return;
            try {
                const api = FirestoreApi.Api;
                // Fetch Governorate
                const govRef = api.getGovernorateDoc(id);
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

    useEffect(() => {
        if (loading || !gov || !id) return;
        if (!ready || membershipLoading) return;
        const scope = pageDataScope(PERMISSION_PAGE_IDS.governorates);
        if (scope !== DATA_SCOPE_MEMBERSHIP || membershipGroupIds.size === 0) return;
        if (regions.some((r) => membershipGroupIds.has(r.id))) return;
        let cancelled = false;
        (async () => {
            const api = FirestoreApi.Api;
            const schoolDocs = await api.getCollectionGroupDocuments('schools');
            if (cancelled) return;
            const villageIds = new Set(villages.map((v) => v.id));
            const schoolOk = schoolDocs.some((d) => {
                if (!membershipGroupIds.has(d.id)) return false;
                const data = d.data() || {};
                const vid = data.villageId || d.ref.parent.parent?.id || '';
                return villageIds.has(vid);
            });
            if (!schoolOk) navigate('/governorates', { replace: true });
        })();
        return () => {
            cancelled = true;
        };
    }, [
        loading,
        gov,
        regions,
        villages,
        id,
        ready,
        membershipLoading,
        pageDataScope,
        membershipGroupIds,
        navigate,
    ]);

    if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }}></div>;
    if (!gov) return <div className="empty-state">المحافظة غير موجودة</div>;

    return (
        <div className="governorate-details-page">
            <PageHeader
              topRow={
                <div className="governorate-details-page__top-row">
                  <button type="button" className="page-nav-back" onClick={() => navigate('/governorates')}>
                    <ChevronRight size={20} aria-hidden /> إدارة المحافظات
                  </button>
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)', opacity: 0.35 }} aria-hidden />
                </div>
              }
              title={<>محافظة: <span style={{ color: 'var(--md-primary)' }}>{gov.name}</span></>}
            />

            <div className="governorate-details-grid">
                {/* Regions List */}
                <div className="surface-card surface-card--lg governorate-details-panel">
                    <div className="governorate-details-panel__head">
                        <h2 className="governorate-details-panel__title">
                           <MapPin size={18} color="var(--accent-color)" /> المناطق التابعة
                        </h2>
                    </div>
                    {regions.length === 0 ? <p className="governorate-details-panel__empty">لا توجد مناطق مضافة لهذه المحافظة.</p> : (
                        <div className="governorate-details-list">
                           {regions.map(reg => (
                              <div key={reg.id} className="governorate-details-item">
                                 <h4 className="governorate-details-item__name">{reg.name}</h4>
                                 {can(PERMISSION_PAGE_IDS.governorates, 'governorate_region_view') && (
                                   <button onClick={() => navigate(`/regions/${reg.id}`)} className="icon-btn"><Info size={16}/></button>
                                 )}
                              </div>
                           ))}
                        </div>
                    )}
                </div>

                {/* Villages List */}
                <div className="surface-card surface-card--lg governorate-details-panel">
                    <div className="governorate-details-panel__head">
                        <h2 className="governorate-details-panel__title">
                           <Home size={18} color="var(--success-color)" /> القرى التابعة
                        </h2>
                    </div>
                    {villages.length === 0 ? <p className="governorate-details-panel__empty">لا توجد قرى مضافة في هذه المحافظة.</p> : (
                        <div className="governorate-details-list">
                           {villages.map(vil => (
                              <div key={vil.id} className="governorate-details-item">
                                 <h4 className="governorate-details-item__name">{vil.villageName}</h4>
                                 {can(PERMISSION_PAGE_IDS.governorates, 'governorate_village_view') && (
                                   <button onClick={() => navigate(`/villages/${vil.id}`)} className="icon-btn"><Info size={16}/></button>
                                 )}
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
