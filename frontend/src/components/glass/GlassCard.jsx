// Generalizes the `bg-white dark:bg-gray-900 border rounded-xl p-4` pattern
// repeated across StatCard/CollectionCard/panels throughout the app, now
// on the shared `.glass-panel` translucent-blur surface.
export default function GlassCard({ as: Tag = 'div', className = '', raised, children, ...rest }) {
  return (
    <Tag className={`glass-panel ${raised ? 'glass-panel-raised' : ''} rounded-2xl p-4 ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
