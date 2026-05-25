export default function Home() {
  const products = [
    "Lápices",
    "Marcadores permanentes",
    "Marcadores de agua",
    "Lapiceros",
    "Ligas",
    "Clips",
    "Ganchos para folder",
    "Tape",
    "Folders 8 1/2 x 11",
    "Folders 8 1/2 x 14",
    "Grapas",
    "Hojas blancas"
  ];

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <h1 style={styles.logo}>XPRESS</h1>

        <nav style={styles.menu}>
          <button style={styles.menuButton}>📦 Inventario</button>
          <button style={styles.menuButton}>📥 Entradas</button>
          <button style={styles.menuButton}>📤 Salidas</button>
          <button style={styles.menuButton}>📄 Reportes</button>
          <button style={styles.menuButton}>⚠️ Stock mínimo</button>
          <button style={styles.menuButton}>👥 Empleados</button>
          <button style={styles.menuButton}>⚙️ Configuración</button>
        </nav>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Dashboard de Inventario</h2>
            <p style={styles.subtitle}>
              Gestión moderna de útiles de oficina
            </p>
          </div>

          <div style={styles.userCard}>
            <div style={styles.userCircle}>X</div>
            <div>
              <strong>XPRESS</strong>
              <p style={{ margin: 0, opacity: 0.7 }}>4 empleados</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <section style={styles.statsGrid}>
          <div style={styles.cardBlue}>
            <h3>Total Productos</h3>
            <h1>12</h1>
          </div>

          <div style={styles.cardDark}>
            <h3>Entradas Hoy</h3>
            <h1>24</h1>
          </div>

          <div style={styles.cardDark}>
            <h3>Salidas Hoy</h3>
            <h1>13</h1>
          </div>

          <div style={styles.cardAlert}>
            <h3>Stock Bajo</h3>
            <h1>3</h1>
          </div>
        </section>

        {/* Products */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>Productos en Inventario</h2>

            <button style={styles.addButton}>
              + Nuevo Producto
            </button>
          </div>

          <div style={styles.productsGrid}>
            {products.map((product, index) => (
              <div key={index} style={styles.productCard}>
                <div style={styles.productImage}>
                  📦
                </div>

                <h3>{product}</h3>

                <p style={styles.stock}>
                  Stock Disponible:
                  <strong> {Math.floor(Math.random() * 100)}</strong>
                </p>

                <div style={styles.actions}>
                  <button style={styles.actionBlue}>
                    Entrada
                  </button>

                  <button style={styles.actionDark}>
                    Salida
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#0f172a",
    color: "white",
    fontFamily: "Arial"
  },

  sidebar: {
    width: "260px",
    background: "#111827",
    padding: "30px 20px",
    borderRight: "1px solid #1e293b"
  },

  logo: {
    color: "#3b82f6",
    fontSize: "36px",
    marginBottom: "40px"
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },

  menuButton: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "white",
    padding: "15px",
    borderRadius: "12px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "16px"
  },

  main: {
    flex: 1,
    padding: "40px"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px"
  },

  title: {
    fontSize: "36px",
    marginBottom: "10px"
  },

  subtitle: {
    opacity: 0.7
  },

  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    background: "#1e293b",
    padding: "12px 20px",
    borderRadius: "14px"
  },

  userCircle: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    background: "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold"
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "20px",
    marginBottom: "40px"
  },

  cardBlue: {
    background: "#2563eb",
    padding: "25px",
    borderRadius: "20px"
  },

  cardDark: {
    background: "#1e293b",
    padding: "25px",
    borderRadius: "20px"
  },

  cardAlert: {
    background: "#dc2626",
    padding: "25px",
    borderRadius: "20px"
  },

  section: {
    background: "#111827",
    padding: "25px",
    borderRadius: "20px"
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px"
  },

  addButton: {
    background: "#3b82f6",
    border: "none",
    color: "white",
    padding: "12px 18px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  productsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
    gap: "20px"
  },

  productCard: {
    background: "#1e293b",
    borderRadius: "18px",
    padding: "20px",
    border: "1px solid #334155"
  },

  productImage: {
    fontSize: "40px",
    marginBottom: "15px"
  },

  stock: {
    opacity: 0.8,
    marginTop: "10px"
  },

  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px"
  },

  actionBlue: {
    flex: 1,
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "10px",
    cursor: "pointer"
  },

  actionDark: {
    flex: 1,
    background: "#334155",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "10px",
    cursor: "pointer"
  }
};
