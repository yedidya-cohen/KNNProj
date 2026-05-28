import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Spinner, Table, Toast, ToastContainer } from 'react-bootstrap';
import { getCourses } from '../api/courses';
import { bulkSaveGrades, getMyGrades } from '../api/grades';
import GradeInput from '../components/GradeInput';

function validateGrade(grade) {
  if (grade === '' || grade === null || grade === undefined) return 'חובה להזין ציון';
  const n = Number(grade);
  if (isNaN(n) || n < 0 || n > 100) return 'ציון חייב להיות בין 0 ל-100';
  return '';
}

export default function GradesPage() {
  const [courses, setCourses] = useState([]);
  const [rows, setRows] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [coursesRes, gradesRes] = await Promise.all([getCourses(), getMyGrades()]);
        const allCourses = coursesRes.data ?? [];
        const myGrades = gradesRes.data ?? [];

        const gradeByCoursId = {};
        myGrades.forEach((g) => {
          gradeByCoursId[g.course_id] = g.grade ?? g.score ?? '';
        });

        const initial = {};
        allCourses.forEach((c) => {
          const existing = gradeByCoursId[c.id];
          initial[c.id] = {
            checked: existing !== undefined,
            grade: existing !== undefined ? String(existing) : '',
            error: '',
          };
        });

        setCourses(allCourses);
        setRows(initial);
      } catch {
        setPageError('שגיאה בטעינת הנתונים. נסה לרענן את הדף.');
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
        c.code?.toLowerCase().includes(q) ||
        c.course_code?.toLowerCase().includes(q),
    );
  }, [courses, search]);

  const toggle = useCallback((courseId) => {
    setRows((prev) => {
      const row = prev[courseId];
      const checked = !row.checked;
      return {
        ...prev,
        [courseId]: { ...row, checked, error: checked ? row.error : '' },
      };
    });
  }, []);

  const setGrade = useCallback((courseId, value) => {
    setRows((prev) => ({
      ...prev,
      [courseId]: { ...prev[courseId], grade: value, error: validateGrade(value) },
    }));
  }, []);

  async function handleSave() {
    // Validate all checked rows before touching the network
    let hasError = false;
    const validated = { ...rows };
    Object.keys(validated).forEach((id) => {
      if (validated[id].checked) {
        const err = validateGrade(validated[id].grade);
        validated[id] = { ...validated[id], error: err };
        if (err) hasError = true;
      }
    });
    setRows(validated);
    if (hasError) return;

    const payload = {
      grades: Object.entries(validated)
        .filter(([, r]) => r.checked)
        .map(([id, r]) => ({ course_id: Number(id), grade: Number(r.grade) })),
    };

    setSaving(true);
    setPageError('');
    try {
      await bulkSaveGrades(payload);
      setShowToast(true);
    } catch {
      setPageError('שגיאה בשמירת הציונים. נסה שנית.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container py-5 text-center">
        <Spinner animation="border" />
      </main>
    );
  }

  const checkedCount = Object.values(rows).filter((r) => r.checked).length;

  return (
    <>
      <main className="container py-4" style={{ maxWidth: '780px' }}>
        <h1 className="h4 fw-semibold mb-1">הזנת היסטוריית ציונים</h1>
        <p className="text-muted mb-3 small">סמן את הקורסים שהשלמת והזן את הציון בכל אחד</p>

        {pageError && (
          <Alert variant="danger" dismissible onClose={() => setPageError('')}>
            {pageError}
          </Alert>
        )}

        <Form.Control
          type="search"
          placeholder="חיפוש לפי שם קורס או קוד…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />

        <div className="border rounded" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
          <Table hover className="mb-0 align-middle">
            <thead
              className="table-light"
              style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa' }}
            >
              <tr>
                <th style={{ width: '52px' }} className="text-center">
                  השלמתי
                </th>
                <th>קורס</th>
                <th style={{ width: '140px' }}>ציון</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-4">
                    לא נמצאו קורסים
                  </td>
                </tr>
              ) : (
                filtered.map((course) => {
                  const row = rows[course.id] ?? { checked: false, grade: '', error: '' };
                  return (
                    <tr key={course.id} className={row.checked ? 'table-primary' : ''}>
                      <td className="text-center">
                        <Form.Check
                          type="checkbox"
                          checked={row.checked}
                          onChange={() => toggle(course.id)}
                          aria-label={`השלמתי את ${course.name}`}
                        />
                      </td>
                      <td>
                        <div className="fw-medium">{course.name}</div>
                        {(course.code || course.course_code) && (
                          <div className="text-muted small">
                            {course.code ?? course.course_code}
                          </div>
                        )}
                      </td>
                      <td>
                        <GradeInput
                          value={row.grade}
                          onChange={(e) => setGrade(course.id, e.target.value)}
                          disabled={!row.checked}
                          error={row.error}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        <div className="mt-3 d-flex align-items-center justify-content-between">
          <span className="text-muted small">
            {checkedCount > 0 ? `${checkedCount} קורסים מסומנים` : ''}
          </span>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner as="span" size="sm" animation="border" className="me-2" />
                שומר…
              </>
            ) : (
              'שמור'
            )}
          </Button>
        </div>
      </main>

      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1100 }}>
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={4000} autohide bg="success">
          <Toast.Body className="text-white fw-semibold">הציונים נשמרו בהצלחה ✓</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

