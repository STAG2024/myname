import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

const SecurityDashboard = () => {
  const [timeRange, setTimeRange] = useState(7);
  const [overview, setOverview] = useState(null);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [ipThreats, setIpThreats] = useState([]);
  const [userActivities, setUserActivities] = useState([]);
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      const [overviewData, hourlyData, threatData, activityData, alertData] =
        await Promise.all([
          axios.get(`/api/security/dashboard/overview?timeRange=${timeRange}`),
          axios.get(
            `/api/security/dashboard/hourly-stats?timeRange=${timeRange}`
          ),
          axios.get(
            `/api/security/dashboard/ip-threats?timeRange=${timeRange}`
          ),
          axios.get(
            `/api/security/dashboard/user-activities?timeRange=${timeRange}`
          ),
          axios.get("/api/security/dashboard/alerts"),
        ]);

      setOverview(overviewData.data);
      setHourlyStats(formatHourlyStats(hourlyData.data));
      setIpThreats(threatData.data);
      setUserActivities(activityData.data);
      setAlerts(alertData.data);
    } catch (error) {
      console.error("대시보드 데이터 로딩 실패:", error);
    }
  };

  const formatHourlyStats = (data) => {
    return data.map((stat) => ({
      time: `${stat._id.month}/${stat._id.day} ${stat._id.hour}:00`,
      total: stat.count,
      critical: stat.criticalCount,
    }));
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          보안 대시보드
        </Typography>

        <FormControl sx={{ mb: 3, minWidth: 120 }}>
          <InputLabel>기간</InputLabel>
          <Select
            value={timeRange}
            label="기간"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value={1}>24시간</MenuItem>
            <MenuItem value={7}>7일</MenuItem>
            <MenuItem value={30}>30일</MenuItem>
          </Select>
        </FormControl>

        {/* 보안 개요 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  전체 보안 이벤트
                </Typography>
                <Typography variant="h4">
                  {overview?.totalEvents || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  심각한 이벤트
                </Typography>
                <Typography variant="h4" color="error">
                  {overview?.criticalEvents || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  로그인 성공률
                </Typography>
                <Typography variant="h4" color="success">
                  {overview?.loginAttempts
                    ? Math.round(
                        (overview.loginAttempts.success /
                          (overview.loginAttempts.success +
                            overview.loginAttempts.failure)) *
                          100
                      )
                    : 0}
                  %
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  감사 로그
                </Typography>
                <Typography variant="h4">
                  {overview?.totalAuditLogs || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 시간별 통계 차트 */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            시간별 보안 이벤트
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                name="전체 이벤트"
                stroke="#8884d8"
              />
              <Line
                type="monotone"
                dataKey="critical"
                name="심각한 이벤트"
                stroke="#ff4444"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        {/* IP 위협 테이블 */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            IP 위협 분석
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>IP 주소</TableCell>
                  <TableCell>총 이벤트</TableCell>
                  <TableCell>로그인 실패</TableCell>
                  <TableCell>의심 활동</TableCell>
                  <TableCell>국가</TableCell>
                  <TableCell>마지막 활동</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ipThreats.map((threat) => (
                  <TableRow key={threat._id}>
                    <TableCell>{threat._id}</TableCell>
                    <TableCell>{threat.totalEvents}</TableCell>
                    <TableCell>{threat.failedLogins}</TableCell>
                    <TableCell>{threat.suspiciousActivities}</TableCell>
                    <TableCell>{threat.countries.join(", ")}</TableCell>
                    <TableCell>
                      {new Date(threat.lastSeen).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 사용자 활동 테이블 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            사용자 활동
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>사용자</TableCell>
                  <TableCell>총 활동</TableCell>
                  <TableCell>고유 IP</TableCell>
                  <TableCell>마지막 활동</TableCell>
                  <TableCell>활동 유형</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userActivities.map((activity) => (
                  <TableRow key={activity._id}>
                    <TableCell>{activity.username}</TableCell>
                    <TableCell>{activity.totalActions}</TableCell>
                    <TableCell>{activity.uniqueIPCount}</TableCell>
                    <TableCell>
                      {new Date(activity.lastAction).toLocaleString()}
                    </TableCell>
                    <TableCell>{activity.actionTypes.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
};

export default SecurityDashboard;
