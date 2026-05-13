import React from 'react';
import FormModal from './FormModal';
import ExplorationDataView from './ExplorationDataView';

/**
 * مودال خفيف لعرض بيانات نموذج الاستكشاف لسجل (قراءة فقط).
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title?: string,
 *   record?: {
 *     explorationTypeId?: string,
 *     explorationTypeName?: string,
 *     explorationFieldValues?: Record<string, any>,
 *   } | null,
 * }} props
 */
const ExplorationDataModal = ({ open, onClose, title, record }) => {
  return (
    <FormModal
      open={open}
      onClose={onClose}
      size="lg"
      title={title || 'بيانات نموذج الاستكشاف'}
    >
      <ExplorationDataView
        explorationTypeId={record?.explorationTypeId}
        explorationTypeName={record?.explorationTypeName}
        explorationFieldValues={record?.explorationFieldValues}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button type="button" className="google-btn" onClick={onClose} style={{ width: 'auto', marginTop: 0 }}>
          إغلاق
        </button>
      </div>
    </FormModal>
  );
};

export default ExplorationDataModal;
