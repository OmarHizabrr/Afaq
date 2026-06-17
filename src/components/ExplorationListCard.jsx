import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const ExplorationListCard = ({ item, subtitle, canEdit, canDelete, onEdit, onDelete }) => (
  <article className="surface-card exploration-card">
    <div className="exploration-card__body">
      <h3 className="exploration-card__title">{item.explorationTypeName || 'نوع غير محدد'}</h3>
      <p className="exploration-card__location">
        {item.governorateName || '-'} / {item.regionName || '-'} / {item.villageName || '-'}
      </p>
      <p className="exploration-card__meta">{subtitle}</p>
    </div>
    <div className="exploration-card__actions">
      {canEdit ? (
        <button type="button" className="icon-btn" title="تعديل" onClick={onEdit}>
          <Edit2 size={16} />
        </button>
      ) : null}
      {canDelete ? (
        <button type="button" className="icon-btn" title="حذف" onClick={onDelete}>
          <Trash2 size={16} color="var(--danger-color)" />
        </button>
      ) : null}
    </div>
  </article>
);

export default ExplorationListCard;
