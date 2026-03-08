import { createContext, useContext, useState, useEffect } from "react";
import axios from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate user from JWT token on mount / page refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.get("/api/auth/me")
        .then(res => {
        const usr = res.data.user;
        // if mentor lacks department, treat as unauthorized
        if (usr.role === 'mentor' && !usr.department) {
          localStorage.removeItem("token");
          setUser(null);
        } else {
          setUser(usr);
        }
      })
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      const usr = res.data.user;
      if (usr.role === 'mentor' && !usr.department) {
        throw new Error('Mentor account not linked to any department. Contact admin.');
      }
      setUser(usr);
      return res.data.user; // return user so caller can read role
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Login failed";
      throw new Error(message);
    }
  };

  const register = async (data) => {
    try {
      await axios.post("/api/auth/register", data);
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Registration failed";
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
