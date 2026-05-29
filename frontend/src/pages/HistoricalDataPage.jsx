import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Badge, Button, Form, Modal, Pagination, Row, Col,
  Spinner, Table, Toast, ToastContainer,
} from 'react-bootstrap';
import { Info } from 'lucide-react';
import { createHistoricalStudent, getHistoricalStudents } from '../api/admin';

// ── constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const YEAR_MIN = 1990;
const YEAR_MAX = new Date().getFullYear() + 6;

// ── helpers ──────────────────────────────────────────────────────────────────

function buildPageList(current, total) {
  const set = new Set([1, total]);
  for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) set.add(i);
  const sorted = [...set].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

function validateAddForm(form) {
  const errs = {};
  if (!form.department.trim()) errs.department = 'מחלקה היא שדה חובה';
  const yr = parseInt(form.graduation_year, 10);
  if (!form.graduation_year) {
    errs.graduation_year = 'שנת סיום היא שדה חובה';
  } else if (isNaN(yr) || yr < YEAR_MIN || yr > YEAR_MAX) {
    errs.graduation_year = `שנה חייבת להיות בין ${YEAR_MIN} ל-${YEAR_MAX}`;
  }
  return errs;
}

// ── AddStudentModal ───────────────────────────────────────────────────────────

function AddStudentModal({ show, onHide, onAdded }) {
  const [form, setForm] = useState({ graduation_year: '', department: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({ graduation_year: '', department: '' });
      setErrors({});
    }
  }, [show]);

  function field(key) {
    return {
      value: form[key],
      isInvalid: !!errors[key],
      onChange(e) {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        if (errors[key]) setErrors((er) => ({ ...er, [key]: '' }));
      },
    };
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    const errs = validateAddForm(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const { data } = await createHistoricalStudent({
        graduation_year: parseInt(form.graduation_year, 10),
        department: form.department.trim(),
      });
      onAdded(data);
    } catch {
      setErrors({ _form: 'שגיאה בהוספת הרשומה. נסה שנית.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-semibold">הוספת רשומה ידנית</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form id="addStudentForm" onSubmit={handleSubmit} noValidate>
          {errors._form && <Alert variant="danger" className="mb-3">{errors._form}</Alert>}

          <Form.Group className="mb-3" controlId="fDept">
            <Form.Label className="small fw-medium">מחלקה *</Form.Label>
            <Form.Control
              type="text"
              placeholder="לדוגמה: מדעי המחשב"
              {...field('department')}
            />
            <Form.Control.Feedback type="invalid">{errors.department}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group controlId="fYear">
            <Form.Label className="small fw-medium">שנת סיום *</Form.Label>
            <Form.Control
              type="number"
              min={YEAR_MIN}
              max={YEAR_MAX}
              placeholder={String(new Date().getFullYear())}
              {...field('graduation_year')}
            />
            <Form.Control.Feedback type="invalid">{errors.graduation_year}</Form.Control.Feedback>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>ביטול</Button>
        <Button type="submit" form="addStudentForm" variant="primary" disabled={saving}>
          {saving
            ? <><Spinner as="span" size="sm" animation="border" className="me-2" />מוסיף…</>
            : 'הוסף רשומה'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ── Paginator ────────────────────────────────────────────────────────────────

function Paginator({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = buildPageList(page, totalPages);
  return (
    <Pagination className="mb-0 justify-content-center flex-wrap" size="sm">
      <Pagination.Prev disabled={page === 1} onClick={() => onChange(page - 1)} />
      {pages.map((p, i) =>
        p === '…' ? (
          <Pagination.Ellipsis key={`e${i}`} disabled />
        ) : (
          <Pagination.Item key={p} active={p === page} onClick={() => onChange(p)}>
            {p}
          </Pagination.Item>
        ),
      )}
      <Pagination.Next disabled={page === totalPages} onClick={() => onChange(page + 1)} />
    </Pagination>
  );
}

// ── HistoricalDataPage ────────────────────────────────────────────────────────

export default function HistoricalDataPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  function addToast(msg, variant = 'success') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  useEffect(() => {
    async function load() {
      try {
        const { data } = await getHistoricalStudents();
        setRecords(Array.isArray(data) ? data : []);
      } catch {
        addToast('שגיאה בטעינת הנתונים', 'danger');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        String(r.graduation_year).includes(q) ||
        r.department?.toLowerCase().includes(q),
    );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleAdded(newRecord) {
    setRecords((prev) => [newRecord, ...prev]);
    setPage(1);
    setSearch('');
    setModalOpen(false);
    addToast('הרשומה נוספה בהצלחה');
  }

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
      <main className="container py-4" style={{ maxWidth: '900px' }}>
        {/* ── Header ── */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h4 fw-semibold mb-0">ניהול דאטה היסטורית (בסיס ה-KNN)</h1>
            <p className="text-muted small mb-0 mt-1">
              סה&quot;כ{' '}
              <strong className="text-body">{records.length.toLocaleString('he-IL')}</strong>{' '}
              רשומות בבסיס הנתונים
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            + הוסף רשומה ידנית
          </Button>
        </div>

        {/* ── Info banner ── */}
        <Alert variant="info" className="d-flex gap-2 align-items-start mb-3 py-2">
          <Info size={16} className="flex-shrink-0 mt-1" />
          <span className="small">
            רשומות אלו מייצגות סטודנטים היסטוריים סינתטיים המשמשים כבסיס הנתונים לאלגוריתם
            KNN. ככל שיש יותר רשומות עם ציונים, כך התחזיות מדויקות יותר.
          </span>
        </Alert>

        {/* ── Search + filter ── */}
        <Row className="g-2 mb-3">
          <Col>
            <Form.Control
              type="search"
              placeholder="חיפוש לפי מחלקה או שנת סיום…"
              value={search}
              onChange={handleSearch}
            />
          </Col>
          <Col xs="auto" className="d-flex align-items-center">
            <span className="text-muted small">
              {filtered.length !== records.length
                ? `${filtered.length.toLocaleString('he-IL')} תוצאות`
                : `${records.length.toLocaleString('he-IL')} רשומות`}
            </span>
          </Col>
        </Row>

        {/* ── Table ── */}
        <div className="border rounded mb-3">
          <Table hover className="mb-0 align-middle">
            <thead
              className="table-light"
              style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa' }}
            >
              <tr>
                <th style={{ width: '90px' }}>מזהה</th>
                <th style={{ width: '110px' }}>שנת סיום</th>
                <th>מחלקה</th>
                <th style={{ width: '120px' }}>מספר ציונים</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-5">
                    {search ? 'לא נמצאו רשומות התואמות לחיפוש' : 'אין רשומות בבסיס הנתונים'}
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id}>
                    <td className="text-muted small">{r.id}</td>
                    <td>{r.graduation_year ?? '—'}</td>
                    <td>{r.department ?? '—'}</td>
                    <td>
                      <Badge
                        bg={r.grade_count > 0 ? 'primary' : 'secondary'}
                        className="fw-normal"
                      >
                        {r.grade_count ?? 0}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* ── Pagination ── */}
        <div className="d-flex align-items-center justify-content-between">
          <span className="text-muted small">
            {filtered.length > 0 &&
              `עמוד ${safePage} מתוך ${totalPages} · שורות ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)}`}
          </span>
          <Paginator page={safePage} totalPages={totalPages} onChange={setPage} />
        </div>
      </main>

      {/* ── Add modal ── */}
      <AddStudentModal
        show={modalOpen}
        onHide={() => setModalOpen(false)}
        onAdded={handleAdded}
      />

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

