export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        fontFamily: "Arial",
        padding: "40px"
      }}
    >
      <h1 style={{ color: "#3b82f6", fontSize: "48px" }}>
        XPRESS INVENTORY
      </h1>

      <p style={{ fontSize: "20px", marginTop: "20px" }}>
        Sistema de inventario moderno para XPRESS
      </p>

      <div
        style={{
          marginTop: "40px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "20px"
        }}
      >
        <div style={card}>
          <h2>📦 Productos</h2>
          <p>Control total del inventario</p>
        </div>

        <div style={card}>
          <h2>📥 Entradas</h2>
          <p>Registro de compras y stock</p>
        </div>

        <div style={card}>
          <h2>📤 Salidas</h2>
          <p>Entrega de productos</p>
        </div>

        <div style={card}>
          <h2>⚠️ Stock mínimo</h2>
          <p>Alertas automáticas</p>
        </div>
      </div>
    </div>
  );
}

const card = {
  background: "#1e293b",
  padding: "20px",
  borderRadius: "16px",
  border: "1px solid #3b82f6"
};
