import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2, Save, ChevronDown, ChevronUp, Printer, Compass } from 'lucide-react';
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
import useMediaQuery, { MOBILE_QUERY } from '../../hooks/useMediaQuery';
import useAppTranslation from '../../hooks/useAppTranslation';

const CurriculumPage = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const { can, actorUser, explorationBridgeAllowed } = usePermissions();
  const storageUserId = actorUser?.uid || actorUser?.id || '';
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isExploringAdding, setIsExploringAdding] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const [viewingExplorationOf, setViewingExplorationOf] = useState(null);
  const expForm = useExplorationForm(isExploringAdding, actorUser, null, PERMISSION_PAGE_IDS.curriculum);
  const [confirmConfig, setConfirmConfig] = useState(null);
  
  // Expanded state for the accordion
  const [expandedId, setExpandedId] = useState(null);

  // Local state for editing weeks of a specific subject before saving
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingSubjectName, setEditingSubjectName] = useState('');
  const [editingWeeks, setEditingWeeks] = useState([]); // [{week: 1, lesson: ''}, ...]

  const buildWeeksFromSubject = (subject) => {
    let currentWeeks = Array.isArray(subject.weeks) ? [...subject.weeks] : [];
    if (currentWeeks.length < 50) {
      const existingWeeks = currentWeeks.reduce((acc, w) => {
        acc[w.week] = w.lesson;
        return acc;
      }, {});
      currentWeeks = Array.from({ length: 50 }, (_, i) => ({
        week: i + 1,
        lesson: existingWeeks[i + 1] || '',
      }));
    }
    return currentWeeks;
  };

  const openSubjectEditor = (subject) => {
    setExpandedId(subject.id);
    setEditingSubject(subject);
    setEditingSubjectName(subject.name || '');
    setEditingWeeks(buildWeeksFromSubject(subject));
  };

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const ref = api.getCurriculumCollection();
      const docs = await api.getDocuments(ref);
      const data = docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(data);
    } catch (err) {
      console.error(err);
      setError(t('pages.CurriculumPage.حدث_خطأ_أثناء_جلب_المناهج', 'حدث خطأ أثناء جلب المناهج'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    try {
      setLoading(true);
      const api = FirestoreApi.Api;
      const docId = api.getNewId('curriculum');
      
      // Initialize 50 weeks empty
      const initialWeeks = Array.from({ length: 50 }, (_, i) => ({
        week: i + 1,
        lesson: ''
      }));

      await api.setData({
        docRef: api.getCurriculumDoc(docId),
        data: {
          name: newSubjectName.trim(),
          weeks: initialWeeks
        }
      });

      setNewSubjectName('');
      setIsAdding(false);
      setSuccess(t('pages.CurriculumPage.تمت_إضافة_المادة_بنجاح', 'تمت إضافة المادة بنجاح.'));
      setError('');
      fetchSubjects();
    } catch (err) {
      console.error(err);
      setError(t('pages.CurriculumPage.حدث_خطأ_أثناء_إضافة_المادة', 'حدث خطأ أثناء إضافة المادة'));
      setLoading(false);
    }
  };

  const handleExplorationAddSubject = async (e) => {
    e.preventDefault();
    if (expSaving) return;
    const missing = expForm.validate();
    if (missing.length > 0) {
      setError(`الحقول التالية مطلوبة أو غير صالحة: ${missing.join('، ')}`);
      return;
    }
    const fallbackName = expForm.selectedType?.name ? `مادة - ${expForm.selectedType.name}` : '';
    const derivedName = expForm.deriveDisplayName(fallbackName);
    if (!derivedName) {
      setError(t('pages.CurriculumPage.لا_يمكن_استخراج_اسم_المادة_من_حقول_النموذج_أضف_حقلاً_نصياً_ي', 'لا يمكن استخراج اسم المادة من حقول النموذج. أضف حقلاً نصياً يحوي "اسم".'));
      return;
    }

    try {
      setExpSaving(true);
      const api = FirestoreApi.Api;
      const docId = api.getNewId('curriculum');
      const initialWeeks = Array.from({ length: 50 }, (_, i) => ({
        week: i + 1,
        lesson: '',
      }));

      await api.setData({
        docRef: api.getCurriculumDoc(docId),
        data: {
          name: derivedName,
          weeks: initialWeeks,
          explorationTypeId: expForm.selectedType?.id || '',
          explorationTypeName: expForm.selectedType?.name || '',
          explorationFieldValues: expForm.sanitize(),
        },
        userData: actorUser || {},
      });

      setIsExploringAdding(false);
      expForm.reset();
      setSuccess(t('pages.CurriculumPage.تمت_إضافة_المادة_من_نموذج_الاستكشاف_بنجاح', 'تمت إضافة المادة من نموذج الاستكشاف بنجاح.'));
      setError('');
      fetchSubjects();
    } catch (err) {
      console.error(err);
      setError(t('pages.CurriculumPage.حدث_خطأ_أثناء_إضافة_المادة_من_الاستكشاف', 'حدث خطأ أثناء إضافة المادة من الاستكشاف'));
    } finally {
      setExpSaving(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      const api = FirestoreApi.Api;
      await api.deleteData(api.getCurriculumDoc(id));
      setSuccess(t('pages.CurriculumPage.تم_حذف_المادة_بنجاح', 'تم حذف المادة بنجاح.'));
      setError('');
      fetchSubjects();
    } catch (err) {
      console.error(err);
      setError(t('pages.CurriculumPage.لا_يمكن_الحذف_في_الوقت_الحالي', 'لا يمكن الحذف في الوقت الحالي.'));
    }
  };

  const startEditingWeeks = (subject) => {
    if (editingSubject && editingSubject.id !== subject.id) {
      setConfirmConfig({
        title: t('pages.CurriculumPage.تجاهل_التعديلات_غير_المحفوظة', 'تجاهل التعديلات غير المحفوظة'),
        message: t('pages.CurriculumPage.لديك_تعديلات_حالية_غير_محفوظة_هل_تريد_تجاهلها_وفتح_مادة_أخرى', 'لديك تعديلات حالية غير محفوظة. هل تريد تجاهلها وفتح مادة أخرى؟'),
        confirmLabel: t('pages.CurriculumPage.تجاهل_وفتح', 'تجاهل وفتح'),
        danger: true,
        onConfirm: () => {
          openSubjectEditor(subject);
        },
      });
      return;
    }

    openSubjectEditor(subject);
  };

  const handleWeekChange = (index, value) => {
    const updated = [...editingWeeks];
    updated[index].lesson = value;
    setEditingWeeks(updated);
  };

  const handleSaveCurriculum = async () => {
    if (!editingSubject) return;

    const name = editingSubjectName.trim();
    if (!name) {
      setError(t('pages.CurriculumPage.يرجى_إدخال_اسم_المادة_قبل_الحفظ', 'يرجى إدخال اسم المادة قبل الحفظ'));
      return;
    }

    try {
      setLoading(true);
      const api = FirestoreApi.Api;

      await api.updateData({
        docRef: api.getCurriculumDoc(editingSubject.id),
        data: { name, weeks: editingWeeks },
      });
      
      setSuccess(t('pages.CurriculumPage.تم_حفظ_توزيع_المنهج_بنجاح', 'تم حفظ توزيع المنهج بنجاح.'));
      setError('');
      setEditingSubject(null);
      fetchSubjects();
    } catch (err) {
      console.error(err);
      setError(t('pages.CurriculumPage.حدث_خطأ_أثناء_حفظ_المنهج', 'حدث خطأ أثناء حفظ المنهج'));
      setLoading(false);
    }
  };

  const toggleExpand = (subject) => {
    if (expandedId === subject.id) {
      setExpandedId(null);
      setEditingSubject(null);
    } else {
      startEditingWeeks(subject);
    }
  };

  return (
    <div className={`curriculum-page${isMobile && expandedId ? ' curriculum-page--editing' : ''}`}>
      <PageHeader
        icon={BookOpen}
        title={t('pages.CurriculumPage.إدارة_المناهج_الأساسية', 'إدارة المناهج الأساسية')}
        subtitle={t('pages.CurriculumPage.توزيع_خطة_الأسابيع_٥٠_أسبوعاً', 'توزيع خطة الأسابيع (٥٠ أسبوعاً)')}
      >
        {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_add_subject') && (
          <button type="button" className="google-btn google-btn--toolbar" onClick={() => setIsAdding(true)}>
            <Plus size={18} />
            <span>{t('pages.CurriculumPage.إضافة_مادة_جديدة', 'إضافة مادة جديدة')}</span>
          </button>
        )}
        {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_add_subject') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.add) && (
          <button
            type="button"
            className="google-btn google-btn--toolbar"
            onClick={() => {
              setIsExploringAdding(true);
            }}
          >
            <Compass size={18} />
            <span className="curriculum-toolbar__long">إضافة من الاستكشاف</span>
            <span className="curriculum-toolbar__short">{t('utils.explorationTargetPages.استكشاف', 'استكشاف')}</span>
          </button>
        )}
      </PageHeader>

      {error && <div className="app-alert app-alert--error curriculum-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success curriculum-alert">{success}</div>}

      {/* Add New Subject Modal */}
      <FormModal
        open={isAdding}
        title={t('pages.CurriculumPage.إضافة_مادة_جديدة', 'إضافة مادة جديدة')}
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleAddSubject}>
          <input 
            type="text" 
            placeholder={t('pages.CurriculumPage.اسم_المادة_مثال_العقيدة', 'اسم المادة (مثال: العقيدة)')}
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            autoFocus
            className="app-input curriculum-modal__input"
          />
          <div className="curriculum-modal-actions">
            <button type="button" className="google-btn curriculum-modal-actions__btn" onClick={() => setIsAdding(false)}>
              إلغاء
            </button>
            <button type="submit" className="google-btn google-btn--filled curriculum-modal-actions__btn">
              إنشاء الخطة
            </button>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={isExploringAdding}
        title={t('pages.CurriculumPage.إضافة_مادة_من_نموذج_الاستكشاف', 'إضافة مادة من نموذج الاستكشاف')}
        onClose={() => setIsExploringAdding(false)}
      >
        <form onSubmit={handleExplorationAddSubject}>
          <ExplorationFormSection
            controller={expForm}
            actorUser={actorUser}
            storageUserId={storageUserId}
            heading={t('components.ExplorationDataModal.حقول_نموذج_الاستكشاف', 'حقول نموذج الاستكشاف')}
            currentPageId={PERMISSION_PAGE_IDS.curriculum}
          />
          <div className="curriculum-modal-actions curriculum-modal-actions--spaced">
            <button type="button" className="google-btn curriculum-modal-actions__btn" onClick={() => setIsExploringAdding(false)}>
              إلغاء
            </button>
            <BusyButton type="submit" busy={expSaving} className="google-btn google-btn--filled curriculum-modal-actions__btn">
              إنشاء الخطة
            </BusyButton>
          </div>
        </form>
      </FormModal>

      {/* List of Subjects */}
      {loading && !isAdding && !editingSubject ? (
        <div className="loading-spinner page-loading"></div>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          لا توجد مناهج مضافة. ابدأ بإضافة مواد الخطة السنوية.
        </div>
      ) : (
        <div className="curriculum-list">
          {subjects.map(subject => {
            const isExpanded = expandedId === subject.id;
            
            return (
              <div
                key={subject.id}
                className={`surface-card accordion-item ${isExpanded ? 'accordion-item--open' : ''}`}
              >
                {/* Header (Accordion Clickable) */}
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(subject); } }}
                  onClick={() => toggleExpand(subject)}
                  className={`accordion-item__header ${isExpanded ? 'accordion-item__header--active' : ''}`}
                >
                  <h3 className={`curriculum-item__title ${isExpanded ? 'curriculum-item__title--active' : ''}`}>
                    {subject.name}
                  </h3>
                  
                  <div className="curriculum-item__meta-row">
                    <div className="curriculum-item__badge">
                      الخطة: 50 أسبوع
                    </div>
                    {explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.view) && (
                      <ExplorationBadge
                        record={subject}
                        onClick={() => setViewingExplorationOf(subject)}
                      />
                    )}
                    <div className="curriculum-item__actions">
                      {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_print_subject') && (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/print/curriculum/${subject.id}`, { state: { autoPrint: true } });
                          }}
                          title={t('pages.CurriculumPage.طباعة_الخطة_أو_حفظ_PDF_صفحة_منفصلة', 'طباعة الخطة أو حفظ PDF (صفحة منفصلة)')}
                        >
                          <Printer size={18} color="var(--md-primary)" />
                        </button>
                      )}
                      {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_delete_subject') && (
                        <button 
                          className="icon-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmConfig({
                              title: t('pages.CurriculumPage.تأكيد_حذف_المادة', 'تأكيد حذف المادة'),
                              message: `سيتم حذف مادة "${subject.name}" وخطة الأسابيع بالكامل.`,
                              confirmLabel: t('pages.CurriculumPage.حذف_نهائي', 'حذف نهائي'),
                              danger: true,
                              onConfirm: () => handleDeleteSubject(subject.id, subject.name)
                            });
                          }} 
                          title={t('pages.CurriculumPage.حذف_المادة_نهائياً', 'حذف المادة نهائياً')}
                        >
                          <Trash2 size={18} color="var(--danger-color)" />
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content (50 Weeks Form) */}
                {isExpanded && editingSubject?.id === subject.id && (
                  <div className="curriculum-editor">
                    <label htmlFor={`subject-name-${subject.id}`} className="app-field app-field--grow curriculum-editor__subject-name">
                      <span className="app-label">اسم المادة</span>
                      <input
                        id={`subject-name-${subject.id}`}
                        type="text"
                        value={editingSubjectName}
                        onChange={(e) => setEditingSubjectName(e.target.value)}
                        placeholder={t('pages.CurriculumPage.مثال_العقيدة', 'مثال: العقيدة')}
                        autoComplete="off"
                        className="app-input"
                      />
                    </label>
                    <div className="curriculum-editor__head">
                      <h4 className="curriculum-editor__subtitle">توزيع الدروس الأسبوعية</h4>
                      {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_save_subject') && (
                        <BusyButton
                          type="button"
                          className="google-btn curriculum-editor__save-btn"
                          onClick={handleSaveCurriculum}
                          busy={loading}
                        >
                          <span className="btn-inner btn-inner--sm">
                            <Save size={18} aria-hidden />
                            حفظ التوزيع
                          </span>
                        </BusyButton>
                      )}
                    </div>

                    <div className="curriculum-editor__weeks-grid">
                      {editingWeeks.map((wConfig, index) => (
                        <div key={index} className="surface-card curriculum-editor__week-item">
                          <div className="curriculum-editor__week-badge">
                            الأسبوع {wConfig.week}
                          </div>
                          <input 
                            type="text" 
                            placeholder={t('pages.CurriculumPage.حدد_الدرس_أو_الهدف', 'حدد الدرس أو الهدف...')}
                            value={wConfig.lesson}
                            onChange={(e) => handleWeekChange(index, e.target.value)}
                            className="curriculum-editor__week-input"
                          />
                        </div>
                      ))}
                    </div>
                    
                    {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_save_subject') && (
                      <div className="curriculum-editor__footer curriculum-editor__footer--desktop">
                        <BusyButton
                          type="button"
                          className="google-btn curriculum-editor__save-btn curriculum-editor__save-btn--final"
                          onClick={handleSaveCurriculum}
                          busy={loading}
                        >
                          حفظ التوزيع النهائي للمادة
                        </BusyButton>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isMobile && expandedId && editingSubject && can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_save_subject') && (
        <div className="curriculum-mobile-save-bar">
          <span className="curriculum-mobile-save-bar__label">{editingSubjectName || editingSubject.name}</span>
          <BusyButton
            type="button"
            className="google-btn google-btn--filled curriculum-editor__save-btn"
            onClick={handleSaveCurriculum}
            busy={loading}
          >
            <Save size={18} aria-hidden />
            حفظ
          </BusyButton>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmConfig}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmLabel={confirmConfig?.confirmLabel || t('components.ConfirmDialog.تأكيد', 'تأكيد')}
        danger={!!confirmConfig?.danger}
        onCancel={() => setConfirmConfig(null)}
        onConfirm={async () => {
          const action = confirmConfig?.onConfirm;
          setConfirmConfig(null);
          if (action) await action();
        }}
      />

      <ExplorationDataModal
        open={!!viewingExplorationOf}
        onClose={() => setViewingExplorationOf(null)}
        title={viewingExplorationOf ? `بيانات النموذج — ${viewingExplorationOf.name || ''}` : t('pages.CurriculumPage.بيانات_النموذج', 'بيانات النموذج')}
        record={viewingExplorationOf}
        actorUser={actorUser}
        storageUserId={storageUserId}
        canEdit={
          can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_save_subject') &&
          explorationBridgeAllowed(EXPLORATION_BRIDGE_ACTION_IDS.edit)
        }
        fallbackName={viewingExplorationOf?.name}
        onSave={async ({ fieldValues, derivedName, selectedType }) => {
          const target = viewingExplorationOf;
          if (!target) return;
          const api = FirestoreApi.Api;
          await api.updateData({
            docRef: api.getCurriculumDoc(target.id),
            data: {
              name: derivedName || target.name || '',
              explorationTypeId: selectedType?.id || target.explorationTypeId || '',
              explorationTypeName: selectedType?.name || target.explorationTypeName || '',
              explorationFieldValues: fieldValues,
            },
            userData: actorUser || {},
          });
          setSuccess(t('pages.CurriculumPage.تم_تحديث_بيانات_نموذج_المادة', 'تم تحديث بيانات نموذج المادة.'));
          setError('');
          fetchSubjects();
        }}
      />
    </div>
  );
};

export default CurriculumPage;
