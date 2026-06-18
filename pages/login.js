import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function signIn(e) {
    e.preventDefault();

    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>
          XPRESS
        </h1>

        <h2 style={styles.title}>
          Iniciar Sesión
        </h2>

        <form onSubmit={signIn}>
          <input
            style={styles.input}
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />

          <button
            style={styles.button}
            type="submit"
          >
            {loading
              ? "Entrando..."
              : "Entrar"}
          </button>
        </form>
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
    background:
      "linear-gradient(to right,#020617,#0f172a)"
  },

  card: {
    background: "#111827",
    padding: "40px",
    borderRadius: "20px",
    width: "350px"
  },

  logo: {
    color: "#3b82f6",
    textAlign: "center",
    marginBottom: "10px",
    fontSize: "40px"
  },

  title: {
    color: "white",
    textAlign: "center",
    marginBottom: "30px"
  },

  input: {
    width: "100%",
    padding: "14px",
    marginBottom: "15px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "white"
  },

  button: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg,#2563eb,#3b82f6)",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer"
  }
};