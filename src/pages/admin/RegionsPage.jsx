import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, MapPin, Map, Eye, Compass } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import AppSelect from '../../components/AppSelect';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS, EXPLORATION_BRIDGE_ACTION_IDS } from '../../config/permissionRegistry';
import BusyButton from '../../components/BusyButton';
import ExplorationFormSection from '../../components/ExplorationFormSection';
import ExplorationBadge from '../../components/ExplorationBadge';
import ExplorationDataModal from '../../components/ExplorationDataModal';
import { useExplorationForm } from '../../hooks/useExplorationForm';
import {
  DATA_SCOPE_MEMBERSHIP,
  filterGovernoratesByScope,
  filterRegionsByScope,
} from '../../utils/permissionDataScope';
import useAppTranslation from '../../hooks/useAppTranslation';

const RegionsPage = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser, explorationBridgeAllowed } = perm;
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [regions, setRegions] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  
  // Form State
  const [regionName, setRegionName] = useState('');
  const [selectedGovId, setSelectedGovId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [viewingExplorationOf, setViewingExplorationOf] = useState(null);
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const expForm = useExplorationForm(isExploringAdding, actorUser, null, PERMISSION_PAGE_IDS.regions);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const scope = pageDataScope(PERMISSION_PAGE_IDS.regions);

      const govRef = api.getGovernoratesCollection();
      const [govDocs, regDocs] = await Promise.all([
        api.getDocuments(govRef),
        api.getCollectionGroupDocuments('regions'),
      ]);

      let regData = regDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      let govData = govDocs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (scope === DATA_SCOPE_MEMBERSHIP) {
        regData = filterRegionsByScope(regData, membershipGroupIds, scope);
        govData = filterGovernoratesByScope(govData, regData, scope);
      }

      setGovernorates(govData);
      setRegions(regData);
    } catch (err) {
      console.error(err);
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_جلب_البيانات', 'حدث خطأ أثناء جلب البيانات'));
    } finally {
      setLoading(false);
    }
  }, [pageDataScope, membershipGroupIds]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.regions) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    fetchData();
  }, [ready, membershipLoading, fetchData, pageDataScope]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!regionName.trim() || !selectedGovId) {
      setError(t('pages.RegionsPage.يرجى_إدخال_اسم_المنطقة_واختيار_المحافظة', 'يرجى إدخال اسم المنطقة واختيار المحافظة'));
      return;
    }

    try {
      const api = FirestoreApi.Api;
      // The new ID is for the region document
      const regId = api.getNewId('regions');
      // The parent document in the 'regions' collection is named after the govId
      const docRef = api.getRegionDoc(selectedGovId, regId);
      
      await api.setData({
        docRef,
        data: { 
          name: regionName.trim(),
          govId: selectedGovId 
        }
      });

      setRegionName('');
      setSelectedGovId('');
      setIsAdding(false);
      setError('');
      setSuccess(t('pages.RegionsPage.تمت_إضافة_المنطقة_بنجاح', 'تمت إضافة المنطقة بنجاح.'));
      fetchData();
    } catch (err) {
      console.error(err);
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_الإضافة', 'حدث خطأ أثناء الإضافة'));
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!regionName.trim() || !selectedGovId || !isEditing) {
      setError(t('pages.RegionsPage.يرجى_إدخال_اسم_المنطقة_واختيار_المحافظة', 'يرجى إدخال اسم المنطقة واختيار المحافظة'));
      return;
    }

    try {
      const api = FirestoreApi.Api;
      const docRef = api.getRegionDoc(isEditing.govId, isEditing.id);
      
      await api.updateData({
        docRef,
        data: { 
          name: regionName.trim(),
          govId: selectedGovId 
        }
      });

      setRegionName('');
      setSelectedGovId('');
      setIsEditing(null);
      setError('');
      setSuccess(t('pages.RegionsPage.تم_تحديث_المنطقة_بنجاح', 'تم تحديث المنطقة بنجاح.'));
      fetchData();
    } catch (err) {
      console.error(err);
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_التحديث', 'حدث خطأ أثناء التحديث'));
    }
  };

  const startEdit = (region) => {
      setIsEditing(region);
      setRegionName(region.name);
      setSelectedGovId(region.govId);
      setIsAdding(false);
  };

  const handleDelete = async (region) => {
    try {
      const api = FirestoreApi.Api;
      const docRef = api.getRegionDoc(region.govId, region.id);
      await api.deleteData(docRef);
      setSuccess(t('pages.RegionsPage.تم_حذف_المنطقة_بنجاح', 'تم حذف المنطقة بنجاح.'));
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(t('pages.CurriculumPage.لا_يمكن_الحذف_في_الوقت_الحالي', 'لا يمكن الحذف في الوقت الحالي.'));
    }
  };

  const handleExplorationAdd = async (e) => {
    e.preventDefault();
    if (expSaving) return;
    const missing = expForm.validate();
    if (missing.length > 0) {
      setError(`${t('components.ExplorationDataModal.الحقول_التالية_مطلوبة_أو_غير_صالحة', 'الحقول التالية مطلوبة أو غير صالحة:')} ${missing.join(t('components.ExplorationDataModal.،', '، '))}`);
      return;
    }
    const govId = expForm.getValueBySource('governorates');
    if (!govId) {
      setError(t('pages.RegionsPage.يجب_أن_يحتوي_نموذج_الاستكشاف_على_حقل_مصدره_المحافظات_لاختيار', 'يجب أن يحتوي نموذج الاستكشاف على حقل مصدره «المحافظات» لاختيار المحافظة الأم.'));
      return;
    }
    const fallbackName = expForm.selectedType?.name ? `منطقة - ${expForm.selectedType.name}` : '';
    const derivedName = expForm.deriveDisplayName(fallbackName);
    if (!derivedName) {
      setError(t('pages.RegionsPage.لا_يمكن_استخراج_اسم_المنطقة_من_حقول_النموذج_أضف_حقلاً_نصياً_', 'لا يمكن استخراج اسم المنطقة من حقول النموذج. أضف حقلاً نصياً يحوي "اسم".'));
      return;
    }
    setExpSaving(true);
    try {
      const api = FirestoreApi.Api;
      const regId = api.getNewId('regions');
      await api.setData({
        docRef: api.getRegionDoc(govId, regId),
        data: {
          name: derivedName,
          govId,
          explorationTypeId: expForm.selectedType?.id || '',
          explorationTypeName: expForm.selectedType?.name || '',
          explorationFieldValues: expForm.sanitize(),
        },
        userData: actorUser || {},
      });
      setIsExploringAdding(false);
      expForm.reset();
      setSuccess(t('pages.RegionsPage.تمت_إضافة_المنطقة_من_نموذج_الاستكشاف_بنجاح', 'تمت إضافة المنطقة من نموذج الاستكشاف بنجاح.'));
      setError('');
      fetchData();
    } catch (err) {
      console.error(err);
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_الإضافة', 'حدث خطأ أثناء الإضافة'));
    } finally {
      setExpSaving(false);
    }
  };

  const getGovName = (govId) => {
    const gov = governorates.find(g => g.id === govId);
    return gov ? gov.name : t('pages.RegionsPage.غير_معروف', 'غير معروف');
  };

  return (
    <div className="regions-page geo-page">
      <PageHeader icon={MapPin} title={t('pages.RegionsPage.إدارة_المناطق', 'إدارة المناطق')}>
        {can(PERMISSION_PAGE_IDS.regions, 'region_add') && (
          <button type="button" className="google-btn google-btn--toolbar" onClick={() => { setIsAdding(true); setIsEditing(null); setRegionName(''); setSelectedGovId(''); }}>
            <Plus size={18} />
            <span className="geo-toolbar__long">{t('config.permissionRegistry.إضافة_منطقة', 'إضافة منطقة')}</span>
            <span className="geo-toolbar__short">{t('components.ReportTextList.إضافة', 'إضافة')}</span>
          </button>
        )}
        {can(PERMISSION_PAGE_IDS.regions, 'region_add') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.add) && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={() => setIsExploringAdding(true)}
          >
            <Compass size={18} />
            <span className="geo-toolbar__long">{t('pages.CurriculumPage.إضافة_من_الاستكشاف', 'إضافة من الاستكشاف')}</span>
            <span className="geo-toolbar__short">{t('utils.explorationTargetPages.استكشاف', 'استكشاف')}</span>
          </button>
        )}
      </PageHeader>

      {ready && pageDataScope(PERMISSION_PAGE_IDS.regions) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info geo-page-alert">
          {t('pages.RegionsPage.عرض_محدود_المناطق', 'عرض محدود: المناطق والمحافظات الظاهرة مرتبطة بمجموعاتك (عضوية منطقة أو ما يترتب عليها).')}
        </div>
      )}
      {error && <div className="app-alert app-alert--error geo-page-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success geo-page-alert">{success}</div>}

      {/* Add/Edit Modal */}
      <FormModal
        open={isAdding || !!isEditing}
        title={isEditing ? t('pages.RegionsPage.تعديل_المنطقة', 'تعديل المنطقة') : t('config.permissionRegistry.إضافة_منطقة', 'إضافة منطقة')}
        onClose={() => { setIsAdding(false); setIsEditing(null); setRegionName(''); setSelectedGovId(''); }}
      >
        <form onSubmit={isEditing ? handleEdit : handleAdd} className="geo-form">
          <AppSelect searchable
            value={selectedGovId}
            onChange={(e) => setSelectedGovId(e.target.value)}
            className="app-select geo-form__field geo-form__field--sm"
          >
            <option value="">{t('pages.RegionsPage.اختر_المحافظة', '-- اختر المحافظة --')}</option>
            {governorates.map(gov => (
              <option key={gov.id} value={gov.id}>{gov.name}</option>
            ))}
          </AppSelect>

          <input 
            type="text" 
            placeholder={t('pages.RegionsPage.اسم_المنطقة_مثال_أزال', 'اسم المنطقة (مثال: أزال)')}
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            className="app-input geo-form__field"
          />
          <div className="modal-footer-actions">
            <button type="button" className="google-btn modal-footer-actions__btn" onClick={() => { setIsAdding(false); setIsEditing(null); setRegionName(''); setSelectedGovId(''); }}>
              {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
            </button>
            <BusyButton type="submit" busy={loading} className="google-btn google-btn--filled modal-footer-actions__btn">
              {isEditing ? t('pages.GovernoratesPage.تحديث', 'تحديث') : t('components.MessengerPanel.حفظ', 'حفظ')}
            </BusyButton>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={isExploringAdding}
        title={t('pages.RegionsPage.إضافة_منطقة_من_نموذج_الاستكشاف', 'إضافة منطقة من نموذج الاستكشاف')}
        onClose={() => setIsExploringAdding(false)}
      >
        <form onSubmit={handleExplorationAdd}>
          <div className="app-alert app-alert--info geo-page-alert geo-page-alert--tight">
            النموذج يحتاج حقلاً مصدره «المحافظات» لربط المنطقة بالمحافظة الأم.
          </div>
          <ExplorationFormSection
            controller={expForm}
            actorUser={actorUser}
            storageUserId={storageUserId}
            heading={t('components.ExplorationDataModal.حقول_نموذج_الاستكشاف', 'حقول نموذج الاستكشاف')}
            currentPageId={PERMISSION_PAGE_IDS.regions}
          />
          <div className="modal-footer-actions modal-footer-actions--spaced">
            <button type="button" className="google-btn modal-footer-actions__btn" onClick={() => setIsExploringAdding(false)}>
              {t('components.ConfirmDialog.إلغاء', 'إلغاء')}
            </button>
            <BusyButton type="submit" busy={expSaving} className="google-btn google-btn--filled modal-footer-actions__btn">
              حفظ المنطقة
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {/* Regions List */}
      {loading ? (
        <div className="loading-spinner page-loading" />
      ) : regions.length === 0 ? (
        <div className="empty-state">
          لا توجد مناطق مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid entity-grid--md">
          {regions.map(region => (
            <div key={region.id} className="surface-card surface-card--entity geo-entity-card">
              <div className="geo-entity-card__body">
                <h3 className="geo-entity-card__title">{region.name}</h3>
                <div className="geo-entity-card__location">
                  <Map size={14} aria-hidden />
                  <span>المحافظة: {getGovName(region.govId)}</span>
                </div>
                <div className="geo-entity-card__badge">
                  {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view) && (
                    <ExplorationBadge record={region} onClick={() => setViewingExplorationOf(region)} />
                  )}
                </div>
              </div>
              <div className="geo-entity-card__actions">
                {can(PERMISSION_PAGE_IDS.regions, 'region_view') && (
                  <button className="icon-btn" onClick={() => navigate(`/regions/${region.id}`)} title={t('config.permissionRegistry.عرض_التفاصيل', 'عرض التفاصيل')}>
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.regions, 'region_edit') && (
                  <button className="icon-btn" onClick={() => startEdit(region)} title={t('components.ExplorationListCard.تعديل', 'تعديل')}>
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.regions, 'region_delete') && (
                  <button className="icon-btn" onClick={() => setPendingDelete(region)} title={t('components.ExplorationListCard.حذف', 'حذف')}>
                    <Trash2 size={16} color="var(--danger-color)" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ExplorationDataModal
        open={!!viewingExplorationOf}
        onClose={() => setViewingExplorationOf(null)}
        title={viewingExplorationOf ? `بيانات النموذج — ${viewingExplorationOf.name}` : t('pages.CurriculumPage.بيانات_النموذج', 'بيانات النموذج')}
        record={viewingExplorationOf}
        actorUser={actorUser}
        storageUserId={storageUserId}
        canEdit={
          can(PERMISSION_PAGE_IDS.regions, 'region_edit') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.edit)
        }
        fallbackName={viewingExplorationOf?.name}
        onSave={async ({ fieldValues, derivedName, selectedType, controller }) => {
          const target = viewingExplorationOf;
          if (!target) return;
          const api = FirestoreApi.Api;
          const nextGovId = controller.getValueBySource('governorates') || target.govId;
          const nextData = {
            name: derivedName || target.name || '',
            govId: nextGovId,
            explorationTypeId: selectedType?.id || target.explorationTypeId || '',
            explorationTypeName: selectedType?.name || target.explorationTypeName || '',
            explorationFieldValues: fieldValues,
          };
          if (nextGovId !== target.govId) {
            const { id: _id, ...rest } = target;
            await api.setData({
              docRef: api.getRegionDoc(nextGovId, target.id),
              data: { ...rest, ...nextData },
              userData: actorUser || {},
            });
            await api.deleteData(api.getRegionDoc(target.govId, target.id));
          } else {
            await api.updateData({
              docRef: api.getRegionDoc(target.govId, target.id),
              data: nextData,
              userData: actorUser || {},
            });
          }
          setSuccess(t('pages.RegionsPage.تم_تحديث_بيانات_نموذج_المنطقة', 'تم تحديث بيانات نموذج المنطقة.'));
          setError('');
          fetchData();
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('pages.RegionsPage.تأكيد_حذف_المنطقة', 'تأكيد حذف المنطقة')}
        message={`سيتم حذف المنطقة "${pendingDelete?.name || ''}" نهائياً.`}
        confirmLabel={t('pages.CurriculumPage.حذف_نهائي', 'حذف نهائي')}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await handleDelete(item);
        }}
      />
    </div>
  );
};

export default RegionsPage;
