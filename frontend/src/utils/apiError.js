const DEFAULT_ERROR = 'אירעה שגיאה. נסה שנית.';
const CONNECTION_ERROR = 'שגיאת חיבור - ודא שהשרת פועל על פורט 8000.';
const TIMEOUT_ERROR = 'השרת לא הגיב בזמן. נסה שוב או בדוק שהשרת לא תקוע.';

function formatDetail(detail) {
  if (!detail) return '';

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
        return field ? `${field}: ${item.msg}` : item.msg;
      })
      .filter(Boolean)
      .join('\n');
  }

  if (typeof detail === 'object' && detail.msg) {
    return detail.msg;
  }

  return '';
}

export function getApiErrorMessage(error, fallback = DEFAULT_ERROR) {
  if (error.code === 'ECONNABORTED') {
    return TIMEOUT_ERROR;
  }

  if (!error.response) {
    return CONNECTION_ERROR;
  }

  const detail = formatDetail(error.response.data?.detail ?? error.response.data?.message);
  return detail || fallback;
}
