import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function PageRefreshButton() {
  const { refreshPage } = useOutletContext() || {};

  return (
    <button
      type="button"
      className="page-refresh-btn page-refresh-btn--inline"
      onClick={refreshPage}
      title="Refresh current page"
      aria-label="Refresh current page"
    >
      <RefreshCw size={15} />
      <span>Refresh</span>
    </button>
  );
}
