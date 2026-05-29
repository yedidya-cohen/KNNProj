import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Badge, Button, Col, Form, Modal, Row, Spinner, Table, Toast, ToastContainer,
} from 'react-bootstrap';
import { createCourse, deleteCourse, getCourses, updateCourse } from '../api/courses';

// ── constants & helpers ──────────────────────────────────────────────────────

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  credits: '',
  semester_recommended: '',
};

function validate(form) {
  const errs = {};
  if (!form.code.trim()) errs.code = 'קוד קורס הוא שדה חובה';
  if (!form.name.trim()) errs.name = 'שם הקורס הוא שדה חובה';
  if (form.credits !== '') {
    const n = Number(form.credits);
    if (isNaN(n) || n <= 0) errs.credits = 'נקודות זכות חייבות להיות מספר חיובי';
  }
  if (form.semester_recommended !== '') {
    const s = parseInt(form.semester_recommended, 10);
    if (isNaN(s) || s < 1 || s > 8) errs.semester_recommended = 'סמסטר מומלץ חייב להיות בין 1 ל-8';
  }
  return errs;
}

function courseToForm(c) {
  return {
    code: c.code ?? '',
    name: c.name ?? '',
    description: c.description ?? '',
    credits: c.credits != null ? String(c.credits) : '',
    semester_recommended: c.semester_recommended != null ? String(c.semester_recommended) : '',
  };
}

// ── CourseFormModal ──────────────────────────────────────────────────────────

function CourseFormModal({ show, onHide, course, onSaved }) {
  const isEdit = !!course;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset form whenever the modal opens / switches between add and edit
  useEffect(() => {
    if (show) {
      setForm(course ? courseToForm(course) : EMPTY_FORM);
      setErrors({});
    }
  }, [show, course]);

  function field(key) {
    return {
      value: form[key],
      isInvalid: !!errors[key],
      onChange(e) {
        const v = e.target.value;
        setForm((f) => ({ ...f, [key]: v }));
        if (errors[key]) setErrors((er) => ({ ...er, [key]: '' }));
      },
    };
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      ...(form.description.trim() && { description: form.description.trim() }),
      ...(form.credits !== '' && { credits: Number(form.credits) }),
      ...(form.semester_recommended !== '' && { semester_recommended: parseInt(form.semester_recommended, 10) }),
    };

    setSaving(true);
    try {
      const { data } = isEdit
        ? await updateCourse(course.id, payload)
        : await createCourse(payload);
      onSaved(data, isEdit, course);
    } catch (err) {
      const detail = String(err.response?.data?.detail ?? '').toLowerCase();
      if (detail.includes('already') || detail.includes('exist') || detail.includes('כבר')) {
        setErrors({ code: 'קוד קורס כבר קיים במערכת' });
      } else {
        setErrors({ _form: 'שגיאה בשמירת הקורס. נסה שנית.' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-semibold">
          {isEdit ? 'עריכת קורס' : 'הוספת קורס חדש'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form id="courseForm" onSubmit={handleSubmit} noValidate>
          {errors._form && <Alert variant="danger" className="mb-3">{errors._form}</Alert>}

          <Form.Group className="mb-3" controlId="fCode">
            <Form.Label className="small fw-medium">קוד קורס *</Form.Label>
            <Form.Control type="text" placeholder="לדוגמה: CS101" {...field('code')} />
            <Form.Control.Feedback type="invalid">{errors.code}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="fName">
            <Form.Label className="small fw-medium">שם הקורס *</Form.Label>
            <Form.Control type="text" placeholder="לדוגמה: מבוא לתכנות" {...field('name')} />
            <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="fDesc">
            <Form.Label className="small fw-medium">תיאור</Form.Label>
            <Form.Control as="textarea" rows={2} placeholder="תיאור הקורס (אופציונלי)" {...field('description')} />
          </Form.Group>

          <Row className="g-3">
            <Col>
              <Form.Group controlId="fCredits">
                <Form.Label className="small fw-medium">נקודות זכות</Form.Label>
                <Form.Control type="number" min={0} step={0.5} placeholder="3" {...field('credits')} />
                <Form.Control.Feedback type="invalid">{errors.credits}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group controlId="fSemester">
                <Form.Label className="small fw-medium">סמסטר מומלץ</Form.Label>
                <Form.Control type="number" min={1} max={8} placeholder="1–8" {...field('semester_recommended')} />
                <Form.Control.Feedback type="invalid">{errors.semester_recommended}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          ביטול
        </Button>
        <Button type="submit" form="courseForm" variant="primary" disabled={saving}>
          {saving
            ? <><Spinner as="span" size="sm" animation="border" className="me-2" />שומר…</>
            : isEdit ? 'עדכן קורס' : 'הוסף קורס'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ── CoursesManagement ────────────────────────────────────────────────────────

export default function CoursesManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toasts, setToasts] = useState([]);

  function addToast(msg, variant = 'success') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  useEffect(() => {
    async function load() {
      try {
        const { data } = await getCourses();
        setCourses(Array.isArray(data) ? data : []);
      } catch {
        addToast('שגיאה בטעינת הקורסים', 'danger');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q),
    );
  }, [courses, search]);

  function openAdd() {
    setEditingCourse(null);
    setFormOpen(true);
  }

  function openEdit(course) {
    setEditingCourse(course);
    setFormOpen(true);
  }

  function handleSaved(savedData, isEdit, originalCourse) {
    if (isEdit) {
      setCourses((prev) =>
        prev.map((c) => (c.id === originalCourse.id ? { ...originalCourse, ...savedData } : c)),
      );
      addToast('הקורס עודכן בהצלחה');
    } else {
      setCourses((prev) => [...prev, savedData]);
      addToast('הקורס נוסף בהצלחה');
    }
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCourse(deleteTarget.id);
      // Soft delete: reflect in table as inactive
      setCourses((prev) =>
        prev.map((c) => (c.id === deleteTarget.id ? { ...c, is_active: false } : c)),
      );
      addToast('הקורס הושבת בהצלחה');
      setDeleteTarget(null);
    } catch {
      addToast('שגיאה במחיקת הקורס', 'danger');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="container py-5 text-center">
        <Spinner animation="border" />
      </main>
    );
  }

  return (
    <>
      <main className="container py-4" style={{ maxWidth: '960px' }}>
        {/* ── Header ── */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h1 className="h4 fw-semibold mb-0">ניהול קורסים</h1>
          <Button variant="primary" size="sm" onClick={openAdd}>
            + הוסף קורס חדש
          </Button>
        </div>

        {/* ── Search ── */}
        <Form.Control
          type="search"
          placeholder="חיפוש לפי שם או קוד…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />

        {/* ── Table ── */}
        <div className="border rounded">
          <Table hover className="mb-0 align-middle">
            <thead
              className="table-light"
              style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa' }}
            >
              <tr>
                <th>קוד</th>
                <th>שם</th>
                <th style={{ width: '70px' }}>נ&quot;ז</th>
                <th style={{ width: '100px' }}>סמסטר</th>
                <th style={{ width: '80px' }}>פעיל</th>
                <th style={{ width: '130px' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-5">
                    {search ? 'לא נמצאו קורסים התואמים לחיפוש' : 'אין קורסים במערכת'}
                  </td>
                </tr>
              ) : (
                filtered.map((course) => {
                  const active = course.is_active !== false;
                  return (
                    <tr key={course.id} className={active ? '' : 'text-muted'}>
                      <td className="small text-muted">{course.code}</td>
                      <td className="fw-medium">{course.name}</td>
                      <td>{course.credits ?? '—'}</td>
                      <td>{course.semester_recommended ?? '—'}</td>
                      <td>
                        <Badge bg={active ? 'success' : 'secondary'} className="fw-normal">
                          {active ? 'פעיל' : 'לא פעיל'}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => openEdit(course)}
                          >
                            ערוך
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => setDeleteTarget(course)}
                            disabled={!active}
                          >
                            מחק
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <p className="text-muted small mt-2 mb-0">
            מציג {filtered.length} מתוך {courses.length} קורסים
          </p>
        )}
      </main>

      {/* ── Course form modal (add / edit) ── */}
      <CourseFormModal
        show={formOpen}
        onHide={() => setFormOpen(false)}
        course={editingCourse}
        onSaved={handleSaved}
      />

      {/* ── Delete confirmation modal ── */}
      <Modal show={!!deleteTarget} onHide={() => !deleting && setDeleteTarget(null)} centered>
        <Modal.Header closeButton={!deleting}>
          <Modal.Title className="fs-6 fw-semibold">אישור מחיקת קורס</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-1">
            האם להשבית את הקורס{' '}
            <strong>{deleteTarget?.name}</strong>
            {deleteTarget?.code && <span className="text-muted"> ({deleteTarget.code})</span>}?
          </p>
          <p className="text-muted small mb-0">
            הקורס יסומן כלא פעיל ולא יופיע לסטודנטים.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            ביטול
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting
              ? <><Spinner as="span" size="sm" animation="border" className="me-2" />מוחק…</>
              : 'השבת קורס'}
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

