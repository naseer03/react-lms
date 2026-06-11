import Modal from './Modal';
import Spinner from './Spinner';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger', loading }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
          >
            {loading ? <Spinner size="sm" /> : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
    </Modal>
  );
};

export default ConfirmDialog;
