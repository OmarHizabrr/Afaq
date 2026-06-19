import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Map, Eye, X, Save, Compass } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
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

const GovernoratesPage = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const perm = usePermissions();
  const { can, ready, pageDataScope, membershipGroupIds, membershipLoading, actorUser, explorationBridgeAllowed } = perm;
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [governorates, setGovernorates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null); // stores gubernorate object being edited
  const [govName, setGovName] = useState('');
  const [govCountry, setGovCountry] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [showScopeNotice, setShowScopeNotice] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  /* مودال عرض بيانات نموذج الاستكشاف لسجل */
  const [viewingExplorationOf, setViewingExplorationOf] = useState(null);

  /* مودال «الإضافة من نموذج الاستكشاف» — يعرض حقول الاستكشاف فقط */
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const expForm = useExplorationForm(isExploringAdding, actorUser, null, PERMISSION_PAGE_IDS.governorates);

  const openExplorationModal = () => {
    setIsExploringAdding(true);
  };

  const fetchGovernorates = useCallback(async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const scope = pageDataScope(PERMISSION_PAGE_IDS.governorates);
      const ref = api.getGovernoratesCollection();
      const [govDocs, regDocs] = await Promise.all([
        api.getDocuments(ref),
        api.getCollectionGroupDocuments('regions'),
      ]);
      let regData = regDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      let data = govDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (scope === DATA_SCOPE_MEMBERSHIP) {
        regData = filterRegionsByScope(regData, membershipGroupIds, scope);
        data = filterGovernoratesByScope(data, regData, scope);
      }
      data.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
      setGovernorates(data);
    } catch (err) {
      console.error(err);
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_جلب_البيانات', 'حدث خطأ أثناء جلب البيانات'));
    } finally {
      setLoading(false);
    }
  }, [pageDataScope, membershipGroupIds]);

  useEffect(() => {
    if (!ready) return;
    if (pageDataScope(PERMISSION_PAGE_IDS.governorates) === DATA_SCOPE_MEMBERSHIP && membershipLoading) return;
    fetchGovernorates();
  }, [ready, membershipLoading, fetchGovernorates, pageDataScope]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 3500);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!ready) return;
    const scope = pageDataScope(PERMISSION_PAGE_IDS.governorates);
    setShowScopeNotice(scope === DATA_SCOPE_MEMBERSHIP);
  }, [ready, pageDataScope]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!govName.trim() || saving) return;

    try {
      setSaving(true);
      const api = FirestoreApi.Api;
      const docId = api.getNewId('governorates');
      const docRef = api.getGovernorateDoc(docId);
      
      await api.setData({
        docRef,
        data: { name: govName.trim(), country: govCountry.trim() }
      });

      setGovName('');
      setGovCountry('');
      setIsAdding(false);
      setSuccess(t('pages.GovernoratesPage.تمت_إضافة_المحافظة_بنجاح', 'تمت إضافة المحافظة بنجاح.'));
      setError('');
      fetchGovernorates(); // Refresh list
    } catch (err) {
      console.error(err);
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_الإضافة', 'حدث خطأ أثناء الإضافة'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!govName.trim() || !isEditing || saving) return;

    try {
      setSaving(true);
      const api = FirestoreApi.Api;
      const docRef = api.getGovernorateDoc(isEditing.id);
      
      await api.updateData({
        docRef,
        data: { name: govName.trim(), country: govCountry.trim() }
      });

      setGovName('');
      setGovCountry('');
      setIsEditing(null);
      setSuccess(t('pages.GovernoratesPage.تم_تحديث_المحافظة_بنجاح', 'تم تحديث المحافظة بنجاح.'));
      setError('');
      fetchGovernorates();
    } catch (err) {
      console.error(err);
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_التحديث', 'حدث خطأ أثناء التحديث'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (gov) => {
      setIsEditing(gov);
      setGovName(gov.name);
      setGovCountry(gov.country || '');
      setIsAdding(false);
  };

  const handleExplorationAdd = async (e) => {
    e.preventDefault();
    if (expSaving) return;
    const missing = expForm.validate();
    if (missing.length > 0) {
      setError(`الحقول التالية مطلوبة أو غير صالحة: ${missing.join('، ')}`);
      return;
    }
    const fallbackName = expForm.selectedType?.name ? `محافظة - ${expForm.selectedType.name}` : '';
    const derivedName = expForm.deriveDisplayName(fallbackName);
    if (!derivedName) {
      setError(t('pages.GovernoratesPage.لا_يمكن_استخراج_اسم_المحافظة_من_حقول_النموذج_أضف_حقلاً_نصياً', 'لا يمكن استخراج اسم المحافظة من حقول النموذج. أضف حقلاً نصياً يحوي "اسم" داخل النموذج.'));
      return;
    }
    setExpSaving(true);
    try {
      const api = FirestoreApi.Api;
      const docId = api.getNewId('governorates');
      const docRef = api.getGovernorateDoc(docId);
      await api.setData({
        docRef,
        data: {
          name: derivedName,
          explorationTypeId: expForm.selectedType?.id || '',
          explorationTypeName: expForm.selectedType?.name || '',
          explorationFieldValues: expForm.sanitize(),
        },
        userData: actorUser || {},
      });
      setIsExploringAdding(false);
      expForm.reset();
      setSuccess(t('pages.GovernoratesPage.تمت_إضافة_المحافظة_من_نموذج_الاستكشاف_بنجاح', 'تمت إضافة المحافظة من نموذج الاستكشاف بنجاح.'));
      setError('');
      fetchGovernorates();
    } catch (err) {
      console.error(err);
      setError(t('pages.GovernoratesPage.حدث_خطأ_أثناء_الإضافة', 'حدث خطأ أثناء الإضافة'));
    } finally {
      setExpSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const api = FirestoreApi.Api;
      const docRef = api.getGovernorateDoc(id);
      await api.deleteData(docRef);
      setSuccess(t('pages.GovernoratesPage.تم_حذف_المحافظة_بنجاح', 'تم حذف المحافظة بنجاح.'));
      setError('');
      fetchGovernorates();
    } catch (err) {
      console.error(err);
      setError(t('pages.CurriculumPage.لا_يمكن_الحذف_في_الوقت_الحالي', 'لا يمكن الحذف في الوقت الحالي.'));
    }
  };

  return (
    <div className="governorates-page geo-page">
      <PageHeader icon={Map} title={t('pages.GovernoratesPage.إدارة_المحافظات', 'إدارة المحافظات')}>
        {can(PERMISSION_PAGE_IDS.governorates, 'governorate_add') && (
          <button type="button" className="google-btn google-btn--toolbar" onClick={() => { setIsAdding(true); setIsEditing(null); setGovName(''); setGovCountry(''); }}>
            <Plus size={18} />
            <span className="geo-toolbar__long">{t('config.permissionRegistry.إضافة_محافظة', 'إضافة محافظة')}</span>
            <span className="geo-toolbar__short">{t('components.ReportTextList.إضافة', 'إضافة')}</span>
          </button>
        )}
        {can(PERMISSION_PAGE_IDS.governorates, 'governorate_add') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.add) && (
          <button type="button" className="google-btn google-btn--toolbar" onClick={openExplorationModal}>
            <Compass size={18} />
            <span className="geo-toolbar__long">إضافة من الاستكشاف</span>
            <span className="geo-toolbar__short">{t('utils.explorationTargetPages.استكشاف', 'استكشاف')}</span>
          </button>
        )}
      </PageHeader>

      {showScopeNotice && ready && pageDataScope(PERMISSION_PAGE_IDS.governorates) === DATA_SCOPE_MEMBERSHIP && (
        <div className="app-alert app-alert--info app-alert--dismissible geo-page-alert">
          <span>عرض محدود: المحافظات الظاهرة مرتبطة بمناطق مجموعاتك (عضوية منطقة أو ما يترتب عليها).</span>
          <button type="button" className="icon-btn app-alert__dismiss" title={t('components.InstallAppBanner.إغلاق', 'إغلاق')} onClick={() => setShowScopeNotice(false)}>
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="app-alert app-alert--error app-alert--dismissible geo-page-alert">
          <span>{error}</span>
          <button type="button" className="icon-btn app-alert__dismiss" title={t('components.InstallAppBanner.إغلاق', 'إغلاق')} onClick={() => setError('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className="app-alert app-alert--success app-alert--dismissible geo-page-alert">
          <span>{success}</span>
          <button type="button" className="icon-btn app-alert__dismiss" title={t('components.InstallAppBanner.إغلاق', 'إغلاق')} onClick={() => setSuccess('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <FormModal
        open={isAdding || !!isEditing}
        title={isEditing ? t('pages.GovernoratesPage.تعديل_المحافظة', 'تعديل المحافظة') : t('config.permissionRegistry.إضافة_محافظة', 'إضافة محافظة')}
        onClose={() => { setIsAdding(false); setIsEditing(null); setGovName(''); setGovCountry(''); }}
      >
        <form onSubmit={isEditing ? handleEdit : handleAdd} className="geo-form">
          <input 
            type="text" 
            placeholder={t('pages.GovernoratesPage.اسم_المحافظة_مثال_صنعاء', 'اسم المحافظة (مثال: صنعاء)')}
            value={govName}
            onChange={(e) => setGovName(e.target.value)}
            autoFocus
            className="app-input geo-form__field"
          />
          <input
            type="text"
            placeholder={t('pages.GovernoratesPage.الدولة_مثال_MALAWI', 'الدولة (مثال: MALAWI)')}
            value={govCountry}
            onChange={(e) => setGovCountry(e.target.value)}
            className="app-input geo-form__field"
          />
          <div className="modal-footer-actions">
            <button type="button" className="google-btn modal-footer-actions__btn" onClick={() => { setIsAdding(false); setIsEditing(null); setGovName(''); setGovCountry(''); }}>
              <span className="modal-footer-actions__btn-inner">
                <X size={14} aria-hidden /> إلغاء
              </span>
            </button>
            <BusyButton type="submit" busy={saving} className="google-btn google-btn--filled modal-footer-actions__btn">
              <span className="modal-footer-actions__btn-inner">
                <Save size={14} aria-hidden /> {isEditing ? t('pages.GovernoratesPage.تحديث', 'تحديث') : t('components.MessengerPanel.حفظ', 'حفظ')}
              </span>
            </BusyButton>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={isExploringAdding}
        title={t('pages.GovernoratesPage.إضافة_محافظة_من_نموذج_الاستكشاف', 'إضافة محافظة من نموذج الاستكشاف')}
        onClose={() => setIsExploringAdding(false)}
      >
        <form onSubmit={handleExplorationAdd}>
          <ExplorationFormSection
            controller={expForm}
            actorUser={actorUser}
            storageUserId={storageUserId}
            heading={t('components.ExplorationDataModal.حقول_نموذج_الاستكشاف', 'حقول نموذج الاستكشاف')}
            currentPageId={PERMISSION_PAGE_IDS.governorates}
          />
          <div className="modal-footer-actions modal-footer-actions--spaced">
            <button type="button" className="google-btn modal-footer-actions__btn" onClick={() => setIsExploringAdding(false)}>
              إلغاء
            </button>
            <BusyButton type="submit" busy={expSaving} className="google-btn google-btn--filled modal-footer-actions__btn">
              حفظ المحافظة
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {/* Governorates List */}
      {loading ? (
        <div className="loading-spinner page-loading" />
      ) : governorates.length === 0 ? (
        <div className="empty-state">
          لا توجد محافظات مضافة حتى الآن.
        </div>
      ) : (
        <div className="entity-grid">
          {governorates.map(gov => (
            <div key={gov.id} className="surface-card surface-card--entity geo-entity-card">
              <div className="geo-entity-card__body">
                <h3 className="geo-entity-card__title">{gov.name}</h3>
                <span className="geo-entity-card__id">ID: {gov.id.substring(0,8)}...</span>
                <div className="geo-entity-card__meta">
                  الدولة: {gov.country || t('pages.GovernorateDetailsPage.غير_محددة', 'غير محددة')}
                </div>
                <div className="geo-entity-card__badge">
                  {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view) && (
                    <ExplorationBadge record={gov} onClick={() => setViewingExplorationOf(gov)} />
                  )}
                </div>
              </div>
              <div className="geo-entity-card__actions">
                {can(PERMISSION_PAGE_IDS.governorates, 'governorate_view') && (
                  <button type="button" className="icon-btn" onClick={() => navigate(`/governorates/${gov.id}`)} title={t('config.permissionRegistry.عرض_التفاصيل', 'عرض التفاصيل')}>
                    <Eye size={16} color="var(--accent-color)" />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.governorates, 'governorate_edit') && (
                  <button type="button" className="icon-btn" onClick={() => startEdit(gov)} title={t('components.ExplorationListCard.تعديل', 'تعديل')}>
                    <Edit2 size={16} />
                  </button>
                )}
                {can(PERMISSION_PAGE_IDS.governorates, 'governorate_delete') && (
                  <button type="button" className="icon-btn" onClick={() => setPendingDelete({ id: gov.id, name: gov.name })} title={t('components.ExplorationListCard.حذف', 'حذف')}>
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
          can(PERMISSION_PAGE_IDS.governorates, 'governorate_edit') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.edit)
        }
        fallbackName={viewingExplorationOf?.name}
        onSave={async ({ fieldValues, derivedName, selectedType }) => {
          const target = viewingExplorationOf;
          if (!target) return;
          const api = FirestoreApi.Api;
          await api.updateData({
            docRef: api.getGovernorateDoc(target.id),
            data: {
              name: derivedName || target.name || '',
              explorationTypeId: selectedType?.id || target.explorationTypeId || '',
              explorationTypeName: selectedType?.name || target.explorationTypeName || '',
              explorationFieldValues: fieldValues,
            },
            userData: actorUser || {},
          });
          setSuccess(t('pages.GovernoratesPage.تم_تحديث_بيانات_نموذج_المحافظة', 'تم تحديث بيانات نموذج المحافظة.'));
          setError('');
          fetchGovernorates();
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('pages.GovernoratesPage.تأكيد_حذف_المحافظة', 'تأكيد حذف المحافظة')}
        message={`سيتم حذف المحافظة "${pendingDelete?.name || ''}" نهائياً.`}
        confirmLabel={t('pages.CurriculumPage.حذف_نهائي', 'حذف نهائي')}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const item = pendingDelete;
          setPendingDelete(null);
          if (item) await handleDelete(item.id, item.name);
        }}
      />
    </div>
  );
};

export default GovernoratesPage;
