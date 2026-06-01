import { useEffect, useState } from 'react';
import {
  Button, Card, Col, Form, Modal, Row, Spinner, Toast, ToastContainer,
  Table,
} from 'react-bootstrap';
import { BarChart2, TrendingUp, Users } from 'lucide-react';
import { getDashboard, getKnnK, getModelStats, getUsers, runSeed, updateKnnK } from '../api/admin';
import StatCard from '../components/StatCard';

// ── helpers ─────────────────────────────────────────────────────────────────

function maeColor(mae) {
  if (mae < 8) return 'text-success';
  if (mae < 12) return 'text-warning';
  return 'text-danger';
}

// ── sub-components ───────────────────────────────────────────────────────────

function MetricRow({ label, value, valueClass }) {
  return (
    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
      <span className="text-muted small">{label}</span>
      <span className={`fw-semibold${valueClass ? ` ${valueClass}` : ''}`}>{value}</span>
    </div>
  );
}

function CourseBar({ name, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between mb-1">
        <span className="small fw-medium">{name}</span>
        <span className="small text-muted">{count}</span>
      </div>
      <div style={{ height: '10px', borderRadius: '5px', backgroundColor: '#e9ecef' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: '5px',
            backgroundColor: 'var(--bs-primary)',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [dashData, setDashData] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [kInput, setKInput] = useState('');
  const [kError, setKError] = useState('');

  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [kSaving, setKSaving] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [toasts, setToasts] = useState([]);

  function addToast(msg, variant = 'success') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  useEffect(() => {
    async function load() {
      const [dashRes, kRes] = await Promise.allSettled([
        getDashboard(),
        getKnnK(),
      ]);
      if (dashRes.status === 'fulfilled') setDashData(dashRes.value.data);
      if (kRes.status === 'fulfilled') {
        const d = kRes.value.data;
        const k = d?.value ?? d?.knn_k ?? d;
        setKInput(String(k ?? ''));
      }
      try {
        const { data } = await getUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        addToast('שגיאה בטעינת משתמשי המערכת', 'danger');
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    getModelStats()
      .then(({ data }) => setModelStats(data))
      .catch(() => {});
  }, []);

  async function handleRerunStats() {
    setRerunning(true);
    try {
      const { data } = await getModelStats();
      setModelStats(data);
      addToast('הערכת המודל הושלמה בהצלחה');
    } catch {
      addToast('שגיאה בהרצת ההערכה', 'danger');
    } finally {
      setRerunning(false);
    }
  }

  async function handleSaveK() {
    const k = parseInt(kInput, 10);
    if (isNaN(k) || k < 1 || k > 100) {
      setKError('יש להזין מספר שלם בין 1 ל-100');
      return;
    }
    setKError('');
    setKSaving(true);
    try {
      await updateKnnK({ value: k });
      addToast('ערך K עודכן בהצלחה');
    } catch {
      addToast('שגיאה בעדכון ערך K', 'danger');
    } finally {
      setKSaving(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await runSeed();
      setConfirmSeed(false);
      addToast('נתוני האימון רועננו בהצלחה');
    } catch {
      addToast('שגיאה ברענון נתוני האימון', 'danger');
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <main className="container py-5 text-center">
        <Spinner animation="border" />
      </main>
    );
  }

  const courses = dashData?.most_predicted_courses ?? [];
  const maxCount = courses.length > 0 ? Math.max(...courses.map((c) => c.prediction_count)) : 0;

  return (
    <>
      <main className="container py-4">
        <h1 className="h4 fw-semibold mb-4">לוח בקרה - מנהל</h1>

        {/* ── Stat cards ── */}
        <Row xs={1} sm={3} className="g-3 mb-4">
          <Col>
            <StatCard
              title='סה"כ משתמשים'
              value={dashData?.total_users ?? '—'}
              icon={<Users size={22} />}
              color="primary"
            />
          </Col>
          <Col>
            <StatCard
              title='סה"כ תחזיות'
              value={dashData?.total_predictions ?? '—'}
              icon={<TrendingUp size={22} />}
              color="success"
            />
          </Col>
          <Col>
            <StatCard
              title="ממוצע ציונים בדאטה"
              value={
                dashData?.avg_historical_grade != null
                  ? Number(dashData.avg_historical_grade).toFixed(1)
                  : '—'
              }
              icon={<BarChart2 size={22} />}
              color="info"
            />
          </Col>
        </Row>

        {/* ── Model performance + System settings ── */}
        <Row className="g-3 mb-4">
          <Col md={7}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 fw-semibold mb-0">ביצועי המודל</h2>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleRerunStats}
                    disabled={rerunning}
                  >
                    {rerunning ? (
                      <>
                        <Spinner as="span" size="sm" animation="border" className="me-1" />
                        מריץ…
                      </>
                    ) : 'הרץ הערכה מחדש'}
                  </Button>
                </div>

                {modelStats ? (
                  <>
                    <MetricRow
                      label="MAE (שגיאה ממוצעת מוחלטת)"
                      value={Number(modelStats.mae).toFixed(2)}
                      valueClass={maeColor(modelStats.mae)}
                    />
                    <MetricRow
                      label="RMSE (שגיאת שורש ממוצע ריבועי)"
                      value={Number(modelStats.rmse).toFixed(2)}
                    />
                    <MetricRow
                      label="גודל מדגם"
                      value={modelStats.sample_size?.toLocaleString('he-IL') ?? '—'}
                    />
                    <MetricRow
                      label="זמן ריצה"
                      value={
                        modelStats.runtime_ms != null
                          ? `${Math.round(modelStats.runtime_ms)} ms`
                          : '—'
                      }
                    />
                  </>
                ) : (
                  <p className="text-muted small mb-0">לא ניתן לטעון נתוני מודל</p>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col md={5}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <h2 className="h6 fw-semibold mb-3">הגדרות מערכת</h2>

                <Form.Label className="small fw-medium mb-1" htmlFor="kInput">
                  ערך K (שכנים קרובים)
                </Form.Label>
                <div className="d-flex gap-2 align-items-start mb-1">
                  <Form.Control
                    id="kInput"
                    type="number"
                    min={1}
                    max={100}
                    value={kInput}
                    onChange={(e) => { setKInput(e.target.value); setKError(''); }}
                    isInvalid={!!kError}
                    style={{ width: '90px' }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveK}
                    disabled={kSaving}
                  >
                    {kSaving ? <Spinner as="span" size="sm" animation="border" /> : 'עדכן'}
                  </Button>
                </div>
                {kError && (
                  <div className="text-danger small">{kError}</div>
                )}

                <hr className="my-3" />

                <p className="text-muted small mb-2">
                  רענון נתוני האימון: משתמשים רשומים, ציונים ותחזיות יישמרו
                </p>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setConfirmSeed(true)}
                >
                  רענן נתוני אימון
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ── Most predicted courses ── */}
        {courses.length > 0 && (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h2 className="h6 fw-semibold mb-4">קורסים מנובאים ביותר</h2>
              {courses.map((c) => (
                <CourseBar
                  key={c.name}
                  name={c.name}
                  count={c.prediction_count}
                  maxCount={maxCount}
                />
              ))}
            </Card.Body>
          </Card>
        )}

        <Card className="border-0 shadow-sm mt-4">
          <Card.Body className="p-4">
            <h2 className="h6 fw-semibold mb-3">משתמשים במערכת</h2>
            <div className="border rounded">
              <Table hover responsive className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>שם משתמש</th>
                    <th>שם מלא</th>
                    <th>תפקיד</th>
                    <th>מחלקה</th>
                    <th>נוצר בתאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        אין משתמשים להצגה
                      </td>
                    </tr>
                  ) : (
                    users.map((systemUser) => (
                      <tr key={systemUser.id}>
                        <td className="fw-medium">{systemUser.username}</td>
                        <td>{systemUser.full_name}</td>
                        <td>{systemUser.role === 'admin' ? 'מנהל' : 'סטודנט'}</td>
                        <td>{systemUser.department}</td>
                        <td>
                          {systemUser.created_at
                            ? new Date(systemUser.created_at).toLocaleDateString('he-IL')
                            : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </main>

      {/* ── Seed confirmation modal ── */}
      <Modal show={confirmSeed} onHide={() => !seeding && setConfirmSeed(false)} centered>
        <Modal.Header closeButton={!seeding}>
          <Modal.Title className="fs-6 fw-semibold">אישור רענון נתוני אימון</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            פעולה זו תרענן רק את הקורסים ונתוני הסטודנטים ההיסטוריים שסומנו כנתוני Seed. משתמשים רשומים, ציונים אישיים, תחזיות והגדרות מערכת יישמרו. האם להמשיך?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmSeed(false)} disabled={seeding}>
            ביטול
          </Button>
          <Button variant="danger" onClick={handleSeed} disabled={seeding}>
            {seeding ? (
              <>
                <Spinner as="span" size="sm" animation="border" className="me-2" />
                מריץ…
              </>
            ) : 'אישור — רענן נתונים'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Toast stack ── */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1100 }}>
        {toasts.map((t) => (
          <Toast
            key={t.id}
            show
            autohide
            delay={5000}
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            bg={t.variant}
          >
            <Toast.Body className="text-white fw-semibold">{t.msg}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </>
  );
}

