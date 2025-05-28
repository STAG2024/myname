import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
  DevicesOther as DevicesIcon,
  Language as LanguageIcon,
} from "@mui/icons-material";
import axios from "axios";

const SecurityAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    loadSecurityAnalysis();
  }, []);

  const loadSecurityAnalysis = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/security-analysis/risk-analysis");
      setAnalysis(response.data.analysis);
    } catch (error) {
      setError("보안 분석 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "default";
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case "high":
        return <ErrorIcon color="error" />;
      case "medium":
        return <WarningIcon color="warning" />;
      case "low":
        return <CheckCircleIcon color="success" />;
      default:
        return <SecurityIcon />;
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          보안 분석 리포트
        </Typography>

        {/* 전체 위험도 */}
        <Card sx={{ mb: 4, bgcolor: "background.default" }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item>{getRiskIcon(analysis.riskLevel)}</Grid>
              <Grid item xs>
                <Typography variant="h6">전체 보안 위험도</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={analysis.riskLevel.toUpperCase()}
                    color={getRiskLevelColor(analysis.riskLevel)}
                  />
                  <Typography variant="body2">
                    위험 점수: {analysis.riskScore}/100
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 비정상 활동 목록 */}
        <Typography variant="h6" gutterBottom>
          감지된 비정상 활동
        </Typography>
        <List>
          {analysis.unusualActivities.map((activity, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                {activity.type.includes("login") && (
                  <SecurityIcon color="primary" />
                )}
                {activity.type.includes("device") && (
                  <DevicesIcon color="primary" />
                )}
                {activity.type.includes("ip") && (
                  <LanguageIcon color="primary" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={activity.message}
                secondary={
                  activity.type === "multiple_locations" &&
                  activity.locations?.join(", ")
                }
              />
            </ListItem>
          ))}
          {analysis.unusualActivities.length === 0 && (
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="감지된 비정상 활동이 없습니다." />
            </ListItem>
          )}
        </List>

        {/* 보안 권장사항 */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          보안 권장사항
        </Typography>
        <List>
          {analysis.recommendations.map((recommendation, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={recommendation} />
            </ListItem>
          ))}
          {analysis.recommendations.length === 0 && (
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="현재 추가 보안 조치가 필요하지 않습니다." />
            </ListItem>
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default SecurityAnalysis;
