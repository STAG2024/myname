import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  Container,
  Avatar,
  Grid,
  IconButton,
} from "@mui/material";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import axios from "axios";

const ProfileForm = ({ user, onUpdateProfile }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
      });
      setPreviewUrl(user.profileImage || "");
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("이미지 크기는 5MB를 초과할 수 없습니다.");
        return;
      }
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        formDataToSend.append(key, formData[key]);
      });
      if (profileImage) {
        formDataToSend.append("profileImage", profileImage);
      }

      const response = await axios.put("/api/users/profile", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setSuccess("프로필이 성공적으로 업데이트되었습니다.");
      if (onUpdateProfile) {
        onUpdateProfile(response.data.user);
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "프로필 업데이트 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          프로필 관리
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container justifyContent="center" sx={{ mb: 3 }}>
            <Grid item>
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={previewUrl}
                  sx={{ width: 100, height: 100, mb: 2 }}
                />
                <input
                  accept="image/*"
                  type="file"
                  id="profile-image"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
                <label htmlFor="profile-image">
                  <IconButton
                    color="primary"
                    component="span"
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      backgroundColor: "white",
                    }}
                  >
                    <PhotoCamera />
                  </IconButton>
                </label>
              </Box>
            </Grid>
          </Grid>

          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="이름"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="이메일"
            name="email"
            value={formData.email}
            disabled
          />
          <TextField
            margin="normal"
            fullWidth
            id="phone"
            label="전화번호"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            id="bio"
            label="자기소개"
            name="bio"
            multiline
            rows={4}
            value={formData.bio}
            onChange={handleChange}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? "업데이트 중..." : "프로필 업데이트"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfileForm;
