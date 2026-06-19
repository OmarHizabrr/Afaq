import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Home, ChevronRight } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';
import { DATA_SCOPE_MEMBERSHIP } from '../../utils/permissionDataScope';
import useAppTranslation from '../../hooks/useAppTranslation';


const GovernorateDetailsPage = () => {
    const { t } = useAppTranslation();
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
                const govRef = api.getGovernorateDoc(id);
                const govDoc = await api.getData(govRef);
                if (!govDoc) return;
                setGov({ id, ...govDoc });

                const allRegions = await api.getCollectionGroupDocuments('regions');
                const govRegions = allRegions.filter(r => r.data().govId === id).map(r => ({ id: r.id, ...r.data() }));
                setRegions(govRegions);

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

    if (loading) return <div className="loading-spinner page-loading-lg" />;
    if (!gov) return <div className="empty-state">{t('pages.GovernorateDetailsPage.المحافظة_غير_موجودة', 'المحافظة غير موجودة')}</div>;

    return (
        <div className="governorate-details-page portal-page">
            <PageHeader
              topRow={
                <div className="governorate-details-page__top-row">
                  <button type="button" className="page-nav-back" onClick={() => navigate('/governorates')}>
                    <ChevronRight size={20} aria-hidden /> {t('pages.GovernorateDetailsPage.إدارة_المحافظات', 'إدارة المحافظات')}
                  </button>
                  <ChevronRight size={16} className="page-nav-separator" aria-hidden />
                </div>
              }
              title={<>{t('pages.GovernorateDetailsPage.محافظة', 'محافظة:')} <span className="page-header-accent">{gov.name}</span></>}
              subtitle={t('pages.GovernorateDetailsPage.الدولة', `الدولة: ${gov.country || t('pages.GovernorateDetailsPage.غير_محددة', 'غير محددة')}`)}
            />

            <div className="governorate-details-grid">
                <div className="surface-card surface-card--lg governorate-details-panel">
                    <div className="governorate-details-panel__head">
                        <h2 className="governorate-details-panel__title">
                           <MapPin size={18} color="var(--accent-color)" /> {t('pages.GovernorateDetailsPage.المناطق_التابعة', 'المناطق التابعة')}
                        </h2>
                    </div>
                    {regions.length === 0 ? (
                      <p className="governorate-details-panel__empty">{t('pages.GovernorateDetailsPage.لا_مناطق', 'لا توجد مناطق مضافة لهذه المحافظة.')}</p>
                    ) : (
                        <div className="governorate-details-list">
                           {regions.map(reg => (
                              can(PERMISSION_PAGE_IDS.governorates, 'governorate_region_view') ? (
                                <button
                                  key={reg.id}
                                  type="button"
                                  className="governorate-details-item"
                                  onClick={() => navigate(`/regions/${reg.id}`)}
                                >
                                  <h4 className="governorate-details-item__name">{reg.name}</h4>
                                  <ChevronRight size={18} className="geo-details-item__chevron" aria-hidden />
                                </button>
                              ) : (
                                <div key={reg.id} className="governorate-details-item">
                                  <h4 className="governorate-details-item__name">{reg.name}</h4>
                                </div>
                              )
                           ))}
                        </div>
                    )}
                </div>

                <div className="surface-card surface-card--lg governorate-details-panel">
                    <div className="governorate-details-panel__head">
                        <h2 className="governorate-details-panel__title">
                           <Home size={18} color="var(--success-color)" /> {t('pages.GovernorateDetailsPage.القرى_التابعة', 'القرى التابعة')}
                        </h2>
                    </div>
                    {villages.length === 0 ? (
                      <p className="governorate-details-panel__empty">{t('pages.GovernorateDetailsPage.لا_قرى', 'لا توجد قرى مضافة في هذه المحافظة.')}</p>
                    ) : (
                        <div className="governorate-details-list">
                           {villages.map(vil => (
                              can(PERMISSION_PAGE_IDS.governorates, 'governorate_village_view') ? (
                                <button
                                  key={vil.id}
                                  type="button"
                                  className="governorate-details-item"
                                  onClick={() => navigate(`/villages/${vil.id}`)}
                                >
                                  <h4 className="governorate-details-item__name">{vil.villageName}</h4>
                                  <ChevronRight size={18} className="geo-details-item__chevron" aria-hidden />
                                </button>
                              ) : (
                                <div key={vil.id} className="governorate-details-item">
                                  <h4 className="governorate-details-item__name">{vil.villageName}</h4>
                                </div>
                              )
                           ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GovernorateDetailsPage;
