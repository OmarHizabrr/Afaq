import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import FirestoreApi from '../../services/firestoreApi';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';

const CurriculumPage = () => {
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
  const [editingWeeks, setEditingWeeks] = useState([]); // [{week: 1, lesson: ''}, ...]

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const api = FirestoreApi.Api;
      const ref = api.getCollection('curriculum');
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
        docRef: api.getDocument('curriculum', docId),
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

  const handleDeleteSubject = async (id, name) => {
    try {
      const api = FirestoreApi.Api;
      await api.deleteData(api.getDocument('curriculum', id));
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
          setExpandedId(subject.id);
          setEditingSubject(subject);

          let currentWeeks = Array.isArray(subject.weeks) ? [...subject.weeks] : [];
          if (currentWeeks.length < 50) {
            const existingWeeks = currentWeeks.reduce((acc, w) => { acc[w.week] = w.lesson; return acc; }, {});
            currentWeeks = Array.from({ length: 50 }, (_, i) => ({
              week: i + 1,
              lesson: existingWeeks[i + 1] || ''
            }));
          }
          setEditingWeeks(currentWeeks);
        }
      });
      return;
    }
    
    setExpandedId(subject.id);
    setEditingSubject(subject);
    
    // Ensure it has 50 weeks backwards compatible if array is missing
    let currentWeeks = Array.isArray(subject.weeks) ? [...subject.weeks] : [];
    if (currentWeeks.length < 50) {
      const existingWeeks = currentWeeks.reduce((acc, w) => { acc[w.week] = w.lesson; return acc; }, {});
      currentWeeks = Array.from({ length: 50 }, (_, i) => ({
        week: i + 1,
        lesson: existingWeeks[i + 1] || ''
      }));
    }
    setEditingWeeks(currentWeeks);
  };

  const handleWeekChange = (index, value) => {
    const updated = [...editingWeeks];
    updated[index].lesson = value;
    setEditingWeeks(updated);
  };

  const handleSaveCurriculum = async () => {
    if (!editingSubject) return;
    
    try {
      setLoading(true);
      const api = FirestoreApi.Api;
      
      await api.updateData({
        docRef: api.getDocument('curriculum', editingSubject.id),
        data: { weeks: editingWeeks }
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
        <button type="button" className="google-btn google-btn--toolbar" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={18} />
          <span>إضافة مادة جديدة</span>
        </button>
      </PageHeader>

      {error && <div className="app-alert app-alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="app-alert app-alert--success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {/* Add New Subject Form */}
      {isAdding && (
        <form onSubmit={handleAddSubject} className="surface-card" style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <input 
            type="text" 
            placeholder="اسم المادة (مثال: العقيدة)"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          />
          <button type="submit" className="google-btn" style={{ marginTop: 0, width: 'auto', background: 'var(--accent-color)', color: '#fff' }}>
            إنشاء الخطة
          </button>
          <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '12px' }}>
            إلغاء
          </button>
        </form>
      )}

      {/* List of Subjects */}
      {loading && !isAdding && !editingSubject ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          لا توجد مناهج مضافة. ابدأ بإضافة مواد الخطة السنوية.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: isExpanded ? 'var(--md-primary)' : 'var(--text-primary)' }}>
                    {subject.name}
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '4px 10px', borderRadius: '12px' }}>
                      الخطة: 50 أسبوع
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
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
                      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content (50 Weeks Form) */}
                {isExpanded && editingSubject?.id === subject.id && (
                  <div style={{ padding: '2rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>توزيع الدروس الأسبوعية</h4>
                      <button 
                        className="google-btn" 
                        onClick={handleSaveCurriculum}
                        disabled={loading}
                        style={{ marginTop: 0, width: 'auto', background: 'var(--success-color)', color: '#fff' }}
                      >
                        <Save size={18} /> حفظ التوزيع
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                      {editingWeeks.map((wConfig, index) => (
                        <div key={index} className="surface-card" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            background: 'var(--accent-glow)', 
                            color: 'var(--accent-color)', 
                            padding: '12px 16px',
                            fontWeight: 'bold',
                            borderLeft: '1px solid var(--border-color)', // RTL layout
                            minWidth: '95px',
                            textAlign: 'center'
                          }}>
                            الأسبوع {wConfig.week}
                          </div>
                          <input 
                            type="text" 
                            placeholder="حدد الدرس أو الهدف..."
                            value={wConfig.lesson}
                            onChange={(e) => handleWeekChange(index, e.target.value)}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-primary)',
                              outline: 'none',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '2rem' }}>
                      <button 
                        className="google-btn" 
                        onClick={handleSaveCurriculum}
                        disabled={loading}
                        style={{ marginTop: 0, width: 'auto', background: 'var(--success-color)', color: '#fff', padding: '12px 32px' }}
                      >
                         حفظ התوزيع النهائي للمادة
                      </button>
                    </div>
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
