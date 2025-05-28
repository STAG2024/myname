import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  Badge,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";

const NotificationCenter = ({ token }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    // WebSocket 연결 설정
    const newSocket = io(process.env.REACT_APP_API_URL, {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
    });

    newSocket.on("security-notification", (notification) => {
      handleNewNotification(notification);
    });

    newSocket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const handleNewNotification = (notification) => {
    // 알림 목록에 추가
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // 스낵바 표시
    setSnackbar({
      open: true,
      message: notification.title,
      severity: getSeverityColor(notification.severity),
    });

    // 브라우저 알림 (사용자가 허용한 경우)
    if (Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/notification-icon.png",
      });
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      default:
        return "success";
    }
  };

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
    setUnreadCount(0);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    // 브라우저 알림 권한 요청
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <>
      <IconButton color="inherit" onClick={handleDrawerOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerClose}>
        <Box sx={{ width: 350, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            보안 알림
          </Typography>
          <List>
            {notifications.map((notification, index) => (
              <ListItem
                key={index}
                sx={{
                  mb: 1,
                  bgcolor: "background.paper",
                  borderRadius: 1,
                  boxShadow: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle1"
                      color={getSeverityColor(notification.severity)}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.timestamp).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
            {notifications.length === 0 && (
              <Typography color="text.secondary" align="center">
                새로운 알림이 없습니다.
              </Typography>
            )}
          </List>
        </Box>
      </Drawer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationCenter;
