import React from 'react';
import { useLang } from '../../context/LanguageContext';

const StatusBadge = ({ status, config = {} }) => {
  const { t } = useLang();

  const defaultStatusConfig = {
    // Users / Partners
    active: { label: t.active || 'Active', color: 'bg-green-100 text-green-600' },
    inactive: { label: t.inactive || 'Inactive', color: 'bg-gray-100 text-gray-500' },
    suspended: { label: t.suspended || 'Suspended', color: 'bg-red-100 text-red-600' },
    banned: { label: t.banned || 'Banned', color: 'bg-black text-white' },
    pending: { label: t.pending || 'Pending', color: 'bg-orange-100 text-orange-600' },
    reject: { label: t.rejected || 'Rejected', color: 'bg-gray-100 text-gray-400' },
    rejected: { label: t.rejected || 'Rejected', color: 'bg-gray-100 text-gray-400' },
    
    // Reports
    lost: { label: t.lost || 'Lost', color: 'bg-orange-100 text-orange-600' },
    sighted: { label: t.sighted || 'Sighted', color: 'bg-green-100 text-green-600' },
    resolved: { label: t.resolved || 'Resolved', color: 'bg-blue-100 text-blue-600' },
    found: { label: t.found || 'Found', color: 'bg-blue-100 text-blue-600' },
    rescued: { label: t.rescued || 'Rescued', color: 'bg-green-100 text-green-600' },
    recovered: { label: t.recovered || 'Recovered', color: 'bg-teal-100 text-teal-600' },
    recoverd: { label: t.recovered || 'Recovered', color: 'bg-teal-100 text-teal-600' },
    
    // Redemptions / Donations
    shipped: { label: t.shipped || 'Shipped', color: 'bg-green-100 text-green-600' },
    delivered: { label: t.delivered || 'Delivered', color: 'bg-blue-100 text-blue-600' },
    cancelled: { label: t.cancelled || 'Cancelled', color: 'bg-red-100 text-red-600' },
    approved: { label: t.approved || 'Approved', color: 'bg-green-100 text-green-600' },
    completed: { label: t.approved || 'Approved', color: 'bg-green-100 text-green-600' },
  };

  const s = status?.toLowerCase();
  const item = config[s] || defaultStatusConfig[s] || { label: status, color: 'bg-gray-100 text-gray-600' };

  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.color}`}>
      {item.label}
    </span>
  );
};

export default StatusBadge;
