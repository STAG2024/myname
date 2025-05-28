import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  Container,
  Divider,
  Chip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  DevicesOther as DevicesIcon,
} from "@mui/icons-material";
import axios from "axios";

const DeviceManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [blockedDevices, setBlockedDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadDeviceData();
  }, []);

  const loadDeviceData = async () => {
    try {
      const [sessionsRes, trustedRes] = await Promise.all([
        axios.get("/api/security/sessions"),
        axios.get("/api/device/trusted"),
      ]);

      setSessions(sessionsRes.data.sessions);
      setTrustedDevices(trustedRes.data.devices);
    } catch (error) {
      setError("디바이스 정보를 불러오는데 실패했습니다.");
    }
  };

  const handleTrustDevice = async (deviceId) => {
    try {
      await axios.post(`/api/device/trust/${deviceId}`);
      setTrustedDevices([...trustedDevices, deviceId]);
      setSuccess("디바이스가 신뢰할 수 있는 목록에 추가되었습니다.");
      loadDeviceData();
    } catch (error) {
      setError("디바이스를 신뢰할 수 있는 목록에 추가하는데 실패했습니다.");
    }
  };

  const handleRemoveTrust = async (deviceId) => {
    try {
      await axios.delete(`/api/device/trust/${deviceId}`);
      setTrustedDevices(trustedDevices.filter((id) => id !== deviceId));
      setSuccess("디바이스가 신뢰할 수 있는 목록에서 제거되었습니다.");
      loadDeviceData();
    } catch (error) {
      setError("디바이스를 신뢰할 수 있는 목록에서 제거하는데 실패했습니다.");
    }
  };

  const handleBlockDevice = async (deviceId) => {
    try {
      await axios.post(`/api/device/block/${deviceId}`);
      setBlockedDevices([...blockedDevices, deviceId]);
      setSuccess("디바이스가 차단되었습니다.");
      loadDeviceData();
    } catch (error) {
      setError("디바이스 차단에 실패했습니다.");
    }
  };

  const handleUnblockDevice = async (deviceId) => {
    try {
      await axios.delete(`/api/device/block/${deviceId}`);
      setBlockedDevices(blockedDevices.filter((id) => id !== deviceId));
      setSuccess("디바이스 차단이 해제되었습니다.");
      loadDeviceData();
    } catch (error) {
      setError("디바이스 차단 해제에 실패했습니다.");
    }
  };

  const handleConfirmDialog = (device, action) => {
    setSelectedDevice(device);
    setConfirmAction(action);
    setConfirmDialog(true);
  };

  const handleConfirm = async () => {
    switch (confirmAction) {
      case "trust":
        await handleTrustDevice(selectedDevice._id);
        break;
      case "untrust":
        await handleRemoveTrust(selectedDevice._id);
        break;
      case "block":
        await handleBlockDevice(selectedDevice._id);
        break;
      case "unblock":
        await handleUnblockDevice(selectedDevice._id);
        break;
    }
    setConfirmDialog(false);
  };

  const getDeviceStatus = (device) => {
    if (blockedDevices.includes(device._id)) {
      return <Chip label="차단됨" color="error" size="small" />;
    }
    if (trustedDevices.includes(device._id)) {
      return <Chip label="신뢰됨" color="success" size="small" />;
    }
    return null;
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          디바이스 관리
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
            활성 세션
          </Typography>
          <List>
            {sessions.map((device) => (
              <ListItem key={device._id}>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <DevicesIcon />
                      <Typography>
                        {device.browser} on {device.os}
                      </Typography>
                      {getDeviceStatus(device)}
                    </Box>
                  }
                  secondary={`IP: ${device.ip} - Last active: ${new Date(
                    device.lastActive
                  ).toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  {!trustedDevices.includes(device._id) && (
                    <IconButton
                      edge="end"
                      onClick={() => handleConfirmDialog(device, "trust")}
                      title="신뢰하기"
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  )}
                  {trustedDevices.includes(device._id) && (
                    <IconButton
                      edge="end"
                      onClick={() => handleConfirmDialog(device, "untrust")}
                      title="신뢰 해제"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                  {!blockedDevices.includes(device._id) && (
                    <IconButton
                      edge="end"
                      onClick={() => handleConfirmDialog(device, "block")}
                      title="차단하기"
                      sx={{ ml: 1 }}
                    >
                      <BlockIcon />
                    </IconButton>
                  )}
                  {blockedDevices.includes(device._id) && (
                    <IconButton
                      edge="end"
                      onClick={() => handleConfirmDialog(device, "unblock")}
                      title="차단 해제"
                      sx={{ ml: 1 }}
                    >
                      <BlockIcon color="error" />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>

        <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
          <DialogTitle>
            {confirmAction === "trust" && "디바이스 신뢰"}
            {confirmAction === "untrust" && "디바이스 신뢰 해제"}
            {confirmAction === "block" && "디바이스 차단"}
            {confirmAction === "unblock" && "디바이스 차단 해제"}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {confirmAction === "trust" &&
                "이 디바이스를 신뢰할 수 있는 목록에 추가하시겠습니까?"}
              {confirmAction === "untrust" &&
                "이 디바이스를 신뢰할 수 있는 목록에서 제거하시겠습니까?"}
              {confirmAction === "block" && "이 디바이스를 차단하시겠습니까?"}
              {confirmAction === "unblock" &&
                "이 디바이스의 차단을 해제하시겠습니까?"}
            </Typography>
            {selectedDevice && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {selectedDevice.browser} on {selectedDevice.os}
                <br />
                IP: {selectedDevice.ip}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)}>취소</Button>
            <Button onClick={handleConfirm} color="primary">
              확인
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default DeviceManagement;
