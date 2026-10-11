import Dialog from '../common/Dialog'

// Thin glass-styled alias of the shared accessible Dialog, kept so existing
// call sites don't change.
export default function GlassModal({ open, onClose, title, className = '', children }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} className={className}>
      {children}
    </Dialog>
  )
}
