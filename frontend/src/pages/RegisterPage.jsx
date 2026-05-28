import { useState } from 'react';
import { Alert, Badge, Button, Card, Container, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getMe, login as apiLogin, register as apiRegister } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const EMPTY_ERRORS = { fullName: '', username: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState(EMPTY_ERRORS);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function clearFieldError(field) {
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate() {
    const errors = { ...EMPTY_ERRORS };
    let valid = true;

    if (!fullName.trim()) {
      errors.fullName = 'שם מלא הוא שדה חובה';
      valid = false;
    }
    if (!username.trim()) {
      errors.username = 'שם משתמש הוא שדה חובה';
      valid = false;
    }
    if (!password) {
      errors.password = 'סיסמה היא שדה חובה';
      valid = false;
    } else if (password.length < 6) {
      errors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
      valid = false;
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'אימות סיסמה הוא שדה חובה';
      valid = false;
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'הסיסמאות אינן תואמות';
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  }

  async function handleRegister() {
    if (!validate()) return;

    setServerError('');
    setLoading(true);
    try {
      await apiRegister({ username, password, full_name: fullName });

      // Auto-login after successful registration
      const { data: loginData } = await apiLogin({ username, password });
      const token = loginData.access_token;
      localStorage.setItem('token', token);
      const { data: userData } = await getMe();
      login(token, userData);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.response?.status === 409) {
        setServerError('שם המשתמש כבר קיים');
      } else {
        setServerError('אירעה שגיאה בהרשמה, נסה שנית');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleRegister();
  }

  return (
    <Container
      className="d-flex align-items-center justify-content-center py-4"
      style={{ minHeight: 'calc(100vh - 56px)' }}
    >
      <Card style={{ width: '100%', maxWidth: '400px' }} className="shadow-sm">
        <Card.Body className="p-4">
          <h1 className="h5 mb-4 text-center fw-semibold">הרשמה למערכת</h1>

          {serverError && (
            <Alert variant="danger" onClose={() => setServerError('')} dismissible>
              {serverError}
            </Alert>
          )}

          <div className="mb-3 px-2 py-2 bg-light rounded d-flex align-items-center gap-2">
            <span className="text-muted small">מחלקה:</span>
            <Badge bg="secondary">מדעי המחשב</Badge>
          </div>

          <Form.Group className="mb-3" controlId="reg-fullName">
            <Form.Label>שם מלא</Form.Label>
            <Form.Control
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); clearFieldError('fullName'); }}
              onKeyDown={handleKeyDown}
              placeholder="הכנס שם מלא"
              isInvalid={!!fieldErrors.fullName}
              autoComplete="name"
              autoFocus
              disabled={loading}
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.fullName}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="reg-username">
            <Form.Label>שם משתמש</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearFieldError('username'); }}
              onKeyDown={handleKeyDown}
              placeholder="הכנס שם משתמש"
              isInvalid={!!fieldErrors.username}
              autoComplete="username"
              disabled={loading}
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.username}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="reg-password">
            <Form.Label>סיסמה</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
              onKeyDown={handleKeyDown}
              placeholder="לפחות 6 תווים"
              isInvalid={!!fieldErrors.password}
              autoComplete="new-password"
              disabled={loading}
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.password}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4" controlId="reg-confirmPassword">
            <Form.Label>אימות סיסמה</Form.Label>
            <Form.Control
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
              onKeyDown={handleKeyDown}
              placeholder="הכנס סיסמה שנית"
              isInvalid={!!fieldErrors.confirmPassword}
              autoComplete="new-password"
              disabled={loading}
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.confirmPassword}
            </Form.Control.Feedback>
          </Form.Group>

          <Button
            variant="primary"
            className="w-100"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                נרשם...
              </>
            ) : (
              'הירשם'
            )}
          </Button>

          <p className="text-center text-muted mt-3 mb-0 small">
            כבר רשום?{' '}
            <Link to="/login" className="text-decoration-none">
              התחבר
            </Link>
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}
