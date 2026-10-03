import React, { useState } from "react";
import { loginUser } from "../../data/api";

export default function AdminLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState("admin@worklink.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await loginUser({
        email,
        password,
      });

      if (!result.success) {
        setError(result.message || "Invalid admin credentials");
        setLoading(false);
        return;
      }

      // Only admin can access admin panel
      if (result.user.role !== "admin") {
        setError("This account is not an admin account.");
        setLoading(false);
        return;
      }

      // loginUser() already saves token and user
      onLogin(result.user);

    } catch (err) {
      console.error("Admin login error:", err);

      setError(
        err.message || "Unable to connect to server."
      );
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <div style={styles.icon}>🛡️</div>

        <h2 style={styles.title}>Admin Login</h2>

        <p style={styles.subtitle}>
          WorkLink Administration Panel
        </p>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>

          <label style={styles.label}>
            Admin Email
          </label>

          <input
            type="email"
            placeholder="admin@worklink.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>
            Password
          </label>

          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>

        </form>

        <button
          type="button"
          onClick={onBack}
          style={styles.backButton}
        >
          ← Back to WorkLink
        </button>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f5f5",
    padding: "20px",
  },

  card: {
    width: "380px",
    padding: "35px",
    background: "#ffffff",
    borderRadius: "14px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
  },

  icon: {
    textAlign: "center",
    fontSize: "42px",
    marginBottom: "10px",
  },

  title: {
    textAlign: "center",
    margin: "0 0 8px",
    fontSize: "26px",
  },

  subtitle: {
    textAlign: "center",
    color: "#777",
    marginBottom: "25px",
  },

  error: {
    background: "#ffe5e5",
    color: "#c62828",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "15px",
    fontSize: "14px",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "600",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "18px",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    borderRadius: "7px",
    fontSize: "15px",
  },

  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    background: "#222",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
  },

  backButton: {
    width: "100%",
    marginTop: "15px",
    padding: "10px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#555",
  },
};