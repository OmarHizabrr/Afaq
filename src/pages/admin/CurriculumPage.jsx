import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2, Save, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal from '../../components/FormModal';
import usePermissions from '../../context/usePermissions';
import { PERMISSION_PAGE_IDS } from '../../config/permissionRegistry';

const CurriculumPage = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
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
      setError('حدث خطأ أثناء جلب المناهج');
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
      setSuccess('تمت إضافة المادة بنجاح.');
      setError('');
      fetchSubjects();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء إضافة المادة');
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      const api = FirestoreApi.Api;
      await api.deleteData(api.getCurriculumDoc(id));
      setSuccess('تم حذف المادة بنجاح.');
      setError('');
      fetchSubjects();
    } catch (err) {
      console.error(err);
      setError('لا يمكن الحذف في الوقت الحالي.');
    }
  };

  const startEditingWeeks = (subject) => {
    if (editingSubject && editingSubject.id !== subject.id) {
      setConfirmConfig({
        title: 'تجاهل التعديلات غير المحفوظة',
        message: 'لديك تعديلات حالية غير محفوظة. هل تريد تجاهلها وفتح مادة أخرى؟',
        confirmLabel: 'تجاهل وفتح',
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
      setError('يرجى إدخال اسم المادة قبل الحفظ');
      return;
    }

    try {
      setLoading(true);
      const api = FirestoreApi.Api;

      await api.updateData({
        docRef: api.getCurriculumDoc(editingSubject.id),
        data: { name, weeks: editingWeeks },
      });
      
      setSuccess('تم حفظ توزيع المنهج بنجاح.');
      setError('');
      setEditingSubject(null);
      fetchSubjects();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ المنهج');
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
    <div>
      <PageHeader
        icon={BookOpen}
        title="إدارة المناهج الأساسية"
        subtitle="توزيع خطة الأسابيع (٥٠ أسبوعاً)"
      >
        {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_add_subject') && (
          <button type="button" className="google-btn google-btn--toolbar" onClick={() => setIsAdding(true)}>
            <Plus size={18} />
            <span>إضافة مادة جديدة</span>
          </button>
        )}
      </PageHeader>

      {error && <div className="app-alert app-alert--error curriculum-alert">{error}</div>}
      {success && <div className="app-alert app-alert--success curriculum-alert">{success}</div>}

      {/* Add New Subject Modal */}
      <FormModal
        open={isAdding}
        title="إضافة مادة جديدة"
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleAddSubject}>
          <input 
            type="text" 
            placeholder="اسم المادة (مثال: العقيدة)"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            autoFocus
            className="app-input"
            style={{ marginBottom: '1rem' }}
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

      {/* List of Subjects */}
      {loading && !isAdding && !editingSubject ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
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
                style={{
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: isExpanded ? 'var(--md-primary)' : 'var(--border-color)',
                }}
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
                    <div className="curriculum-item__actions">
                      {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_print_subject') && (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/print/curriculum/${subject.id}`, { state: { autoPrint: true } });
                          }}
                          title="طباعة الخطة أو حفظ PDF (صفحة منفصلة)"
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
                              title: 'تأكيد حذف المادة',
                              message: `سيتم حذف مادة "${subject.name}" وخطة الأسابيع بالكامل.`,
                              confirmLabel: 'حذف نهائي',
                              danger: true,
                              onConfirm: () => handleDeleteSubject(subject.id, subject.name)
                            });
                          }} 
                          title="حذف المادة نهائياً"
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
                        placeholder="مثال: العقيدة"
                        autoComplete="off"
                        className="app-input"
                      />
                    </label>
                    <div className="curriculum-editor__head">
                      <h4 className="curriculum-editor__subtitle">توزيع الدروس الأسبوعية</h4>
                      {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_save_subject') && (
                        <button 
                          className="google-btn curriculum-editor__save-btn" 
                          onClick={handleSaveCurriculum}
                          disabled={loading}
                        >
                          <Save size={18} /> حفظ التوزيع
                        </button>
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
                            placeholder="حدد الدرس أو الهدف..."
                            value={wConfig.lesson}
                            onChange={(e) => handleWeekChange(index, e.target.value)}
                            className="curriculum-editor__week-input"
                          />
                        </div>
                      ))}
                    </div>
                    
                    {can(PERMISSION_PAGE_IDS.curriculum, 'curriculum_save_subject') && (
                      <div className="curriculum-editor__footer">
                        <button 
                          className="google-btn curriculum-editor__save-btn curriculum-editor__save-btn--final" 
                          onClick={handleSaveCurriculum}
                          disabled={loading}
                        >
                           حفظ التوزيع النهائي للمادة
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmConfig}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmLabel={confirmConfig?.confirmLabel || 'تأكيد'}
        danger={!!confirmConfig?.danger}
        onCancel={() => setConfirmConfig(null)}
        onConfirm={async () => {
          const action = confirmConfig?.onConfirm;
          setConfirmConfig(null);
          if (action) await action();
        }}
      />
    </div>
  );
};

export default CurriculumPage;
