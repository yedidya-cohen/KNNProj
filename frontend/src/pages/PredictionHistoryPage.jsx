import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Modal, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getMyPredictionHistory, getPrediction } from '../api/predictions';
import PredictionResult from '../components/PredictionResult';

// ── helpers ────────────────────────────────────────────────────────────────

const CONFIDENCE_MAP = {
  high:   { bg: 'success', label: 'ביטחון גבוה',   textDark: false },
  medium: { bg: 'warning', label: 'ביטחון בינוני', textDark: true  },
  low:    { bg: 'danger',  label: 'ביטחון נמוך',   textDark: false },
};

function resolveConf(confidence) {
  if (typeof confidence === 'string') return CONFIDENCE_MAP[confidence.toLowerCase()] ?? CONFIDENCE_MAP.medium;
  if (typeof confidence === 'number') {
    if (confidence >= 0.7) return CONFIDENCE_MAP.high;
    if (confidence >= 0.4) return CONFIDENCE_MAP.medium;
    return CONFIDENCE_MAP.low;
  }
  return CONFIDENCE_MAP.medium;
}

function gradeColor(g) {
  if (g >= 85) return '#198754';
  if (g >= 65) return '#fd7e14';
  return '#dc3545';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ── component ──────────────────────────────────────────────────────────────

export default function PredictionHistoryPage() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Detail modal
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await getMyPredictionHistory();
        setHistory(Array.isArray(data) ? data : []);
      } catch {
        setPageError('שגיאה בטעינת ההיסטוריה. נסה לרענן את הדף.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [history],
  );

  async function handleRowClick(id) {
    setActiveId(id);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    setModalOpen(true);
    try {
      const { data } = await getPrediction(id);
      setDetail(data);
    } catch {
      setDetailError('שגיאה בטעינת פרטי התחזית.');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setActiveId(null);
  }

  const activeRecord = useMemo(
    () => history.find((h) => h.id === activeId),
    [history, activeId],
  );

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="container py-5 text-center">
        <Spinner animation="border" />
      </main>
    );
  }

  return (
    <>
      <main className="container py-4" style={{ maxWidth: '860px' }}>
        <h1 className="h4 fw-semibold mb-4">היסטוריית התחזיות שלי</h1>

        {pageError && (
          <Alert variant="danger" dismissible onClose={() => setPageError('')}>
            {pageError}
          </Alert>
        )}

        {sorted.length === 0 && !pageError ? (
          /* ── Empty state ── */
          <div className="text-center py-5">
            <div className="display-6 mb-3" style={{ color: '#9ca3af' }}>📋</div>
            <p className="text-muted mb-4 fs-6">עדיין לא ביצעת תחזיות</p>
            <Button variant="primary" onClick={() => navigate('/predict')}>
              לבקשת תחזית ראשונה
            </Button>
          </div>
        ) : (
          /* ── Table ── */
          <div className="border rounded">
            <Table striped hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>תאריך</th>
                  <th>קורס</th>
                  <th style={{ width: '110px' }}>ציון חזוי</th>
                  <th style={{ width: '150px' }}>רמת ביטחון</th>
                  <th style={{ width: '32px' }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => {
                  const conf = resolveConf(item.confidence);
                  const rounded = Math.round(item.predicted_grade);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item.id)}
                      style={{ cursor: 'pointer' }}
                      aria-label={`פרטי תחזית לקורס ${item.course_name}`}
                    >
                      <td className="text-muted small" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(item.created_at)}
                      </td>
                      <td className="fw-medium">{item.course_name}</td>
                      <td>
                        <span
                          className="fw-bold fs-5"
                          style={{ color: gradeColor(rounded) }}
                        >
                          {rounded}
                        </span>
                      </td>
                      <td>
                        <Badge
                          bg={conf.bg}
                          className={`px-2 py-1${conf.textDark ? ' text-dark' : ''}`}
                        >
                          {conf.label}
                        </Badge>
                      </td>
                      <td className="text-muted">
                        <ChevronLeft size={15} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </main>

      {/* ── Detail modal ── */}
      <Modal show={modalOpen} onHide={closeModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-semibold">
            תחזית{activeRecord?.course_name ? `: ${activeRecord.course_name}` : ''}
            {activeRecord?.created_at && (
              <span className="text-muted fw-normal small me-2">
                {formatDate(activeRecord.created_at)}
              </span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          {detailLoading && (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          )}
          {detailError && <Alert variant="danger" className="mt-3">{detailError}</Alert>}
          {detail && <PredictionResult result={detail} />}
        </Modal.Body>
      </Modal>
    </>
  );
}

