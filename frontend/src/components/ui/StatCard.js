const StatCard = ({ title, value, icon: Icon, color = 'primary', trend, loading }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="card hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          {loading ? (
            <div className="skeleton h-8 w-24 mt-1" />
          ) : (
            <p className="text-3xl font-bold text-slate-800">{value ?? '—'}</p>
          )}
          {trend && (
            <p className={`text-xs mt-1.5 font-medium ${trend.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.up ? '↑' : '↓'} {trend.value} {trend.label}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
