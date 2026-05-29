import { useState } from 'react';
import { Alert, Button, Card, Container, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getMe, login as apiLogin } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function validate() {
    if (!username.trim() || !password.trim()) {
      setError('יש למלא את כל השדות');
      return false;
    }
    return true;
  }

  async function handleLogin() {
    if (!validate()) return;

    setError('');
    setLoading(true);
    try {
      const { data: loginData } = await apiLogin({ username, password });
      const token = loginData.access_token;

      // Store token so the request interceptor attaches it for getMe()
      localStorage.setItem('token', token);
      const { data: userData } = await getMe();

      login(token, userData);
      navigate(userData.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      localStorage.removeItem('token');
      if (!err.response) {
        setError('שגיאת חיבור — ודא שהשרת פועל על פורט 8000');
      } else {
        setError('שם משתמש או סיסמה שגויים');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <Container
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: 'calc(100vh - 56px)' }}
    >
      <Card style={{ width: '100%', maxWidth: '400px' }} className="shadow-sm">
        <Card.Body className="p-4">
          <h1 className="h5 mb-4 text-center fw-semibold">
            התחברות למערכת חיזוי ציונים
          </h1>

          {error && (
            <Alert variant="danger" onClose={() => setError('')} dismissible>
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3" controlId="username">
            <Form.Label>שם משתמש</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="הכנס שם משתמש"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-4" controlId="password">
            <Form.Label>סיסמה</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="הכנס סיסמה"
              autoComplete="current-password"
              disabled={loading}
            />
          </Form.Group>

          <Button
            variant="primary"
            className="w-100"
            onClick={handleLogin}
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
                מתחבר...
              </>
            ) : (
              'התחבר'
            )}
          </Button>

          <p className="text-center text-muted mt-3 mb-0 small">
            אין לך חשבון?{' '}
            <Link to="/register" className="text-decoration-none">
              הירשם כאן
            </Link>
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}
