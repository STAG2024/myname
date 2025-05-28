import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Container,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Grid,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import axios from "axios";

const SecuritySettings = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialog2FA, setDialog2FA] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      const [sessionsRes, historyRes] = await Promise.all([
        axios.get("/api/security/sessions"),
        axios.get("/api/security/login-history"),
      ]);

      setSessions(sessionsRes.data.sessions);
      setLoginHistory(historyRes.data.history);
    } catch (error) {
      setError("보안 정보를 불러오는데 실패했습니다.");
    }
  };

  const handle2FASetup = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/security/2fa/setup");
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setDialog2FA(true);
    } catch (error) {
      setError("2단계 인증 설정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async () => {
    try {
      setLoading(true);
      await axios.post("/api/security/2fa/verify", { token });
      setTwoFactorEnabled(true);
      setDialog2FA(false);
      setSuccess("2단계 인증이 활성화되었습니다.");
    } catch (error) {
      setError("인증 코드가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FADisable = async () => {
    try {
      setLoading(true);
      await axios.post("/api/security/2fa/disable", { token });
      setTwoFactorEnabled(false);
      setSuccess("2단계 인증이 비활성화되었습니다.");
    } catch (error) {
      setError("2단계 인증 비활성화 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSessionTerminate = async (sessionId) => {
    try {
      await axios.delete(`/api/security/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s._id !== sessionId));
      setSuccess("세션이 종료되었습니다.");
    } catch (error) {
      setError("세션 종료 중 오류가 발생했습니다.");
    }
  };

  const handleNotificationToggle = async () => {
    try {
      await axios.put("/api/security/settings", {
        loginNotifications: !loginNotifications,
      });
      setLoginNotifications(!loginNotifications);
      setSuccess("알림 설정이 업데이트되었습니다.");
    } catch (error) {
      setError("설정 업데이트 중 오류가 발생했습니다.");
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          보안 설정
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            2단계 인증
          </Typography>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <Switch
                checked={twoFactorEnabled}
                onChange={() =>
                  twoFactorEnabled ? handle2FADisable() : handle2FASetup()
                }
                disabled={loading}
              />
            </Grid>
            <Grid item>
              <Typography>
                {twoFactorEnabled ? "활성화됨" : "비활성화됨"}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            로그인 알림
          </Typography>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <Switch
                checked={loginNotifications}
                onChange={handleNotificationToggle}
                disabled={loading}
              />
            </Grid>
            <Grid item>
              <Typography>
                {loginNotifications ? "활성화됨" : "비활성화됨"}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            활성 세션
          </Typography>
          <List>
            {sessions.map((session) => (
              <ListItem key={session._id}>
                <ListItemText
                  primary={`${session.browser} on ${session.os}`}
                  secondary={`IP: ${session.ip} - Last active: ${new Date(
                    session.lastActive
                  ).toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleSessionTerminate(session._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            로그인 기록
          </Typography>
          <List>
            {loginHistory.slice(0, 5).map((log, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`${log.status === "success" ? "성공" : "실패"} - ${
                    log.deviceInfo
                  }`}
                  secondary={`IP: ${log.ip} - ${new Date(
                    log.timestamp
                  ).toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Dialog open={dialog2FA} onClose={() => setDialog2FA(false)}>
          <DialogTitle>2단계 인증 설정</DialogTitle>
          <DialogContent>
            <Typography paragraph>
              1. Google Authenticator 앱을 설치하세요.
            </Typography>
            <Typography paragraph>
              2. 아래 QR 코드를 스캔하거나 비밀키를 입력하세요.
            </Typography>
            {qrCode && (
              <Box sx={{ textAlign: "center", my: 2 }}>
                <img src={qrCode} alt="QR Code" />
              </Box>
            )}
            <Typography variant="caption" display="block" gutterBottom>
              비밀키: {secret}
            </Typography>
            <TextField
              fullWidth
              label="인증 코드"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog2FA(false)}>취소</Button>
            <Button onClick={handle2FAVerify} disabled={loading}>
              확인
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default SecuritySettings;
