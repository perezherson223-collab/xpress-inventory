import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import jsPDF from "jspdf";

export default function Home() {

  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [notification, setNotification] = useState("");
const [generalReceipt, setGeneralReceipt] = useState([
  {
    product: "",
    quantity: "",
    collaborator: "",
    department: "",
  },
]);

const [receiptDate, setReceiptDate] = useState(
  new Date().toISOString().split("T")[0]
);

const [receiptShift, setReceiptShift] = useState("AM");
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "",
    color: "",
    stock: 0
  });

useEffect(() => {
  checkUser();

  const productsChannel =
    supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products"
        },
        () => {
          getProducts();
        }
      )
      .subscribe();

  const movementsChannel =
    supabase
      .channel("movements-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "movements"
        },
        () => {
          getMovements();
        }
      )
      .subscribe();

  return () => {
    supabase.removeChannel(
      productsChannel
    );

    supabase.removeChannel(
      movementsChannel
    );
  };
}, []);

  async function checkUser() {

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    getProducts();
    getMovements();
  }

  function showNotification(message) {
    setNotification(message);

    setTimeout(() => {
      setNotification("");
    }, 3000);
  }

  function printInventory() {
    window.print();
  }

  function downloadPDF() {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("XPRESS INVENTARIO", 20, 20);

    doc.setFontSize(12);

    let y = 40;

    products.forEach((product) => {
      doc.text(
        `${product.name} | SKU: ${product.sku} | Stock: ${product.stock}`,
        20,
        y
      );

      y += 10;

      if (y >= 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("inventario-xpress.pdf");
  }
  function exportExcel() {

  const data = products.map((p) => ({
    Nombre: p.name,
    SKU: p.sku,
    Categoria: p.category,
    Color: p.color,
    Stock: p.stock
  }));

  const worksheet =
    XLSX.utils.json_to_sheet(data);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Inventario"
  );

  const excelBuffer =
    XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

  const fileData =
    new Blob(
      [excelBuffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    );

  saveAs(
    fileData,
    "inventario-xpress.xlsx"
  );

  showNotification(
    "📊 Excel descargado"
  );
}

  function generateReceipt(product) {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text("ACUSE DE RECIBIDO", 20, 20);

    doc.setFontSize(14);

    doc.text(`Producto: ${product.name}`, 20, 50);
    doc.text(`SKU: ${product.sku}`, 20, 65);
    doc.text(`Categoría: ${product.category}`, 20, 80);
    doc.text(`Color: ${product.color}`, 20, 95);
    doc.text(`Stock Actual: ${product.stock}`, 20, 110);

    doc.text(
      `Fecha: ${new Date().toLocaleDateString()}`,
      20,
      125
    );

    doc.text(
      "Firma: _______________________",
      20,
      170
    );

    doc.save(`acuse-${product.name}.pdf`);
}

function addReceiptRow() {
  setGeneralReceipt([
    ...generalReceipt,
    {
      product: "",
      quantity: "",
      collaborator: "",
      department: "",
    },
  ]);
}

function updateReceiptRow(index, field, value) {
  const updated = [...generalReceipt];
  updated[index][field] = value;
  setGeneralReceipt(updated);
}
async function generateGeneralReceipt() {
  const doc = new jsPDF("landscape");

  doc.setFontSize(20);
  doc.text("XPRESS", 15, 15);

  doc.setFontSize(18);
  doc.text("ACUSE GENERAL DE ENTREGA", 100, 15);

  doc.setFontSize(12);
  doc.text(`Fecha: ${receiptDate}`, 15, 30);
  doc.text(`Jornada: ${receiptShift}`, 80, 30);

  let y = 50;

  doc.text("Producto", 15, y);
  doc.text("Cantidad", 80, y);
  doc.text("Colaborador", 120, y);
  doc.text("Departamento", 190, y);
  doc.text("Firma", 250, y);

  y += 5;

  doc.line(15, y, 285, y);

  y += 10;

for (const item of generalReceipt) {
  const product = products.find(
    (p) => p.name === item.product
  );

  if (!product) continue;

  const quantity = Number(item.quantity || 0);
if (quantity > product.stock) {
  showNotification(
    `❌ Stock insuficiente para ${product.name}`
  );
  return;
}
  const newStock = product.stock - quantity;

 const { error } = await supabase
  .from("products")
  .update({
    stock: newStock
  })
  .eq("id", product.id);

if (error) {
  console.log("ERROR STOCK:", error);
}
  await saveMovement(
  product,
  "SALIDA",
  quantity,
  item.collaborator
);
}
  generalReceipt.forEach((item) => {
    doc.text(String(item.product || ""), 15, y);
    doc.text(String(item.quantity || ""), 80, y);
    doc.text(String(item.collaborator || ""), 120, y);
    doc.text(String(item.department || ""), 190, y);
    doc.text("_______________", 250, y);

    y += 12;
  });
await getProducts();
await getMovements();
 doc.autoPrint();

const pdfUrl = doc.output("bloburl");

window.open(pdfUrl, "_blank");
setGeneralReceipt([
  {
    product: "",
    quantity: "",
    collaborator: "",
    department: ""
  }
]);

}
async function getProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", {
        ascending: false
      });

    if (error) {
  console.log(error);
  showNotification("❌ Error cargando productos");
  setLoading(false);
  return;
}

    setProducts(data || []);
    setLoading(false);
  }

  async function getMovements() {
    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .order("id", {
        ascending: false
      });

    if (error) {
      console.log(error);
      return;
    }

    setMovements(data || []);
  }

 async function saveMovement(
  product,
  type,
  quantity,
  collaborator = ""
) {
    const { error } = await supabase
      .from("movements")
      .insert([
        {
          product_id: product.id,
          product_name: product.name,
          type,
          quantity,
          collaborator,
          created_at: new Date()
        }
      ]);

    if (error) {
      console.log(error);
    }

    getMovements();
  }

  async function uploadImage(file) {
    if (!file) return null;

    const fileName =
      Date.now() + "-" + file.name;

    const { error } =
      await supabase.storage
        .from("products")
        .upload(fileName, file);

    if (error) {
      console.log(error);
      showNotification("❌ Error subiendo imagen");
      return null;
    }

    const { data } =
      supabase.storage
        .from("products")
        .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function createProduct() {
    if (!newProduct.name) {
      showNotification("⚠️ Escribe un nombre");
      return;
    }

    let imageUrl = null;

    if (imageFile) {
      imageUrl =
        await uploadImage(imageFile);
    }

    const { error } = await supabase
      .from("products")
      .insert([
        {
          ...newProduct,
          image: imageUrl,
          created_at: new Date()
        }
      ]);

if (error) {
  console.log("ERROR REAL:", error);

  alert(JSON.stringify(error));

  showNotification(
    "❌ " + error.message
  );

  return;
}

    resetForm();

    showNotification("✅ Producto agregado");

    getProducts();
  }

  async function updateProduct() {
    let imageUrl = null;

    if (imageFile) {
      imageUrl =
        await uploadImage(imageFile);
    }

    const updateData = {
      name: newProduct.name,
      sku: newProduct.sku,
      category: newProduct.category,
      color: newProduct.color,
      stock: newProduct.stock
    };

    if (imageUrl) {
      updateData.image = imageUrl;
    }

    const { error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", editingId);

    if (error) {
      console.log(error);
      showNotification("❌ Error actualizando");
      return;
    }

    resetForm();

    showNotification("✏️ Producto actualizado");

    getProducts();
  }

  function editProduct(product) {
    setEditingId(product.id);

    setNewProduct({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      color: product.color || "",
      stock: product.stock || 0
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function resetForm() {
    setEditingId(null);

    setNewProduct({
      name: "",
      sku: "",
      category: "",
      color: "",
      stock: 0
    });

    setImageFile(null);
  }

  async function deleteProduct(id) {
    const ok = confirm(
      "¿Eliminar producto?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error);
      showNotification("❌ Error eliminando");
      return;
    }

    showNotification("🗑️ Producto eliminado");

    getProducts();
  }

  async function addStock(product) {
    const newStock =
      (product.stock || 0) + 1;

    await supabase
      .from("products")
      .update({
        stock: newStock
      })
      .eq("id", product.id);

    await saveMovement(
      product,
      "ENTRADA",
      1
    );

    showNotification("📦 Stock agregado");

    getProducts();
  }

  async function removeStock(product) {
    if (product.stock <= 0) {
      showNotification("⚠️ No hay stock");
      return;
    }

    const newStock =
      product.stock - 1;

    await supabase
      .from("products")
      .update({
        stock: newStock
      })
      .eq("id", product.id);

    await saveMovement(
      product,
      "SALIDA",
      1
    );

    showNotification("📤 Stock removido");

    getProducts();
  }

  const filteredProducts =
    products.filter(
      (product) =>
        product.name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        product.sku
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        product.category
          ?.toLowerCase()
          .includes(search.toLowerCase())
    );

  return (
    <div style={styles.container}>
      {notification && (
        <div style={styles.notification}>
          {notification}
        </div>
      )}

      <aside style={styles.sidebar}>
        <h1 style={styles.logo}>
          XPRESS
        </h1>

        <p style={styles.sidebarText}>
          Sistema Inventario
        </p>
      </aside>

      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              Dashboard Inventario
            </h2>

            <p style={styles.subtitle}>
              Sistema XPRESS PRO
            </p>
            <button
  style={{
    marginTop: "20px",
    background: "#ef4444",
    border: "none",
    color: "white",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  }}
  onClick={async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }}
>
  Cerrar Sesión
</button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "15px",
            marginBottom: "25px",
            flexWrap: "wrap"
          }}
        >
          <button
            style={styles.createButton}
            onClick={downloadPDF}
          >
            📄 Descargar PDF
          </button>
          <button
  style={styles.actionDark}
  onClick={exportExcel}
>
  📊 Exportar Excel
</button>

          <button
            style={styles.actionBlue}
            onClick={printInventory}
          >
            🖨️ Imprimir
          </button>
        </div>
<div
  style={{
    background: "#111827",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "25px",
  }}
>
  <h3 style={{ marginBottom: "15px" }}>
    Acuse General de Entrega
  </h3>

  <div
    style={{
      display: "flex",
      gap: "15px",
      marginBottom: "15px",
      flexWrap: "wrap",
    }}
  >
    <input
      type="date"
      value={receiptDate}
      onChange={(e) => setReceiptDate(e.target.value)}
      style={styles.input}
    />

    <select
      value={receiptShift}
      onChange={(e) => setReceiptShift(e.target.value)}
      style={styles.input}
    >
      <option value="AM">AM</option>
      <option value="PM">PM</option>
    </select>

    <button
      onClick={addReceiptRow}
      style={styles.actionBlue}
    >
      + Agregar Colaborador
    </button>

    <button
      onClick={generateGeneralReceipt}
      style={styles.createButton}
    >
      📄 Generar Acuse General
    </button>
  </div>
</div>
<div
  style={{
    background: "#1e293b",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
  }}
>
  {generalReceipt.map((item, index) => (
    <div
      key={index}
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 2fr 2fr",
        gap: "10px",
        marginBottom: "10px",
      }}
    >
      <select
  value={item.product}
  onChange={(e) =>
    updateReceiptRow(index, "product", e.target.value)
  }
  style={styles.input}
>
  <option value="">Seleccione producto</option>

  {products.map((product) => (
    <option
      key={product.id}
      value={product.name}
    >
      {product.name}
    </option>
  ))}
</select>

      <input
        placeholder="Cantidad"
        value={item.quantity}
        onChange={(e) =>
          updateReceiptRow(index, "quantity", e.target.value)
        }
        style={styles.input}
      />

      <input
        placeholder="Colaborador"
        value={item.collaborator}
        onChange={(e) =>
          updateReceiptRow(index, "collaborator", e.target.value)
        }
        style={styles.input}
      />

      <input
        placeholder="Departamento"
        value={item.department}
        onChange={(e) =>
          updateReceiptRow(index, "department", e.target.value)
        }
        style={styles.input}
      />
    </div>
  ))}
</div>
        <section style={styles.statsGrid}>
          <div style={styles.cardBlue}>
            <h3>Total Productos</h3>
            <h1>{products.length}</h1>
          </div>

          <div style={styles.cardDark}>
            <h3>Movimientos</h3>
            <h1>{movements.length}</h1>
          </div>

          <div style={styles.cardAlert}>
            <h3>Stock Bajo</h3>

            <h1>
              {
                products.filter(
                  (p) => p.stock <= 5
                ).length
              }
            </h1>
          </div>
        </section>

        <section style={styles.chartSection}>
          <h2 style={styles.chartTitle}>
            Estadísticas
          </h2>

          <div style={styles.chartBox}>
            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <BarChart data={products}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />

                <XAxis
                  dataKey="name"
                  stroke="#ffffff"
                />

                <YAxis stroke="#ffffff" />

                <Tooltip />

                <Bar
                  dataKey="stock"
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={styles.formSection}>
          <h2 style={{ marginBottom: "20px" }}>
            {editingId
              ? "Editar Producto"
              : "Agregar Producto"}
          </h2>

          <div style={styles.formGrid}>
            <input
              style={styles.input}
              placeholder="Nombre"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  name: e.target.value
                })
              }
            />

            <input
              style={styles.input}
              placeholder="SKU"
              value={newProduct.sku}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  sku: e.target.value
                })
              }
            />

            <input
              style={styles.input}
              placeholder="Categoría"
              value={newProduct.category}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  category: e.target.value
                })
              }
            />

            <input
              style={styles.input}
              placeholder="Color"
              value={newProduct.color}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  color: e.target.value
                })
              }
            />

            <input
              type="number"
              style={styles.input}
              placeholder="Stock"
              value={newProduct.stock}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  stock: Number(
                    e.target.value
                  )
                })
              }
            />

            <input
              type="file"
              style={styles.input}
              onChange={(e) =>
                setImageFile(
                  e.target.files[0]
                )
              }
            />

            <button
              style={styles.createButton}
              onClick={
                editingId
                  ? updateProduct
                  : createProduct
              }
            >
              {editingId
                ? "Actualizar Producto"
                : "Guardar Producto"}
            </button>

            {editingId && (
              <button
                style={styles.cancelButton}
                onClick={resetForm}
              >
                Cancelar
              </button>
            )}
          </div>
        </section>

        <section style={styles.searchSection}>
          <input
            style={styles.searchInput}
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Productos
          </h2>

          {loading ? (
            <p>Cargando...</p>
          ) : (
            <div style={styles.productsGrid}>
              {filteredProducts.map(
                (product) => (
                  <div
                    key={product.id}
                    style={{
                      ...styles.productCard,
                      border:
                        product.stock <= 5
                          ? "2px solid #ef4444"
                          : "1px solid #334155"
                    }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={
                          styles.productImage
                        }
                      />
                    ) : (
                      <div
                        style={
                          styles.productPlaceholder
                        }
                      >
                        📦
                      </div>
                    )}

                    <h3>{product.name}</h3>

                    <p style={styles.stock}>
                      SKU:
                      <strong>
                        {" "}
                        {product.sku}
                      </strong>
                    </p>

                    <p style={styles.stock}>
                      Categoría:
                      <strong>
                        {" "}
                        {
                          product.category
                        }
                      </strong>
                    </p>

                    <p style={styles.stock}>
                      Color:
                      <strong>
                        {" "}
                        {product.color}
                      </strong>
                    </p>

                    <p
                      style={{
                        ...styles.stock,
                        color:
                          product.stock <= 5
                            ? "#ef4444"
                            : "#22c55e",
                        fontWeight:
                          "bold"
                      }}
                    >
                      Stock:
                      <strong>
                        {" "}
                        {product.stock}
                      </strong>
                    </p>

                    {product.stock <=
                      5 && (
                      <div
                        style={
                          styles.alertBadge
                        }
                      >
                        ⚠️ STOCK BAJO
                      </div>
                    )}

                    <div
                      style={styles.actions}
                    >
                      <button
                        style={
                          styles.actionBlue
                        }
                        onClick={() =>
                          addStock(
                            product
                          )
                        }
                      >
                        +
                      </button>

                      <button
                        style={
                          styles.actionDark
                        }
                        onClick={() =>
                          removeStock(
                            product
                          )
                        }
                      >
                        -
                      </button>
                    </div>

                    <button
                      style={
                        styles.editButton
                      }
                      onClick={() =>
                        editProduct(
                          product
                        )
                      }
                    >
                      ✏️ Editar
                    </button>

                    <button
                      style={
                        styles.receiptButton
                      }
                      onClick={() =>
                        generateReceipt(
                          product
                        )
                      }
                    >
                      📄 Acuse PDF
                    </button>

                    <button
                      style={
                        styles.deleteButton
                      }
                      onClick={() =>
                        deleteProduct(
                          product.id
                        )
                      }
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <section style={styles.historySection}>
          <h2 style={{ marginBottom: "20px" }}>
            Historial Movimientos
          </h2>

          <div style={styles.historyTable}>
            {movements.map((move) => (
              <div
                key={move.id}
                style={{
                  ...styles.historyRow,
                  borderLeft:
                    move.type ===
                    "ENTRADA"
                      ? "5px solid #22c55e"
                      : "5px solid #ef4444"
                }}
              >
                <div>
                  <strong>
                    {move.product_name}
                  </strong>

                  <p
  style={{
    opacity: 0.7
  }}
>
  {move.type}
</p>

<p
  style={{
    fontSize: "12px",
    fontWeight: "bold"
  }}
>
  {move.collaborator}
</p>
<p
  style={{
    fontSize: "12px",
    opacity: 0.6
  }}
>
  {new Date(move.created_at).toLocaleString()}
</p>
                </div>

                <div>
                  <strong>
                    {move.quantity}
                  </strong>
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
    flexDirection: "row",
    minHeight: "100vh",
    background:
      "linear-gradient(to right,#020617,#0f172a)",
    color: "white",
    fontFamily: "Arial",
    flexWrap: "wrap"
  },

sidebar: {

  background: "#111827",
  padding: "30px 20px"
},

  sidebarText: {
    opacity: 0.7
  },

  logo: {
    color: "#3b82f6",
    fontSize: "35px",
    marginBottom: "20px",
    fontWeight: "bold"
  },

main: {
  flex: 1,
  padding: "40px",
  minWidth: "0"
},

  header: {
    marginBottom: "40px"
  },

  title: {
    fontSize: "38px",
    fontWeight: "bold"
  },

  subtitle: {
    opacity: 0.7
  },

  notification: {
    position: "fixed",
    top: "20px",
    right: "20px",
    background:
      "linear-gradient(135deg,#2563eb,#1d4ed8)",
    padding: "15px 25px",
    borderRadius: "12px",
    zIndex: 9999,
    fontWeight: "bold"
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "20px",
    marginBottom: "30px"
  },

  cardBlue: {
    background:
      "linear-gradient(135deg,#2563eb,#1d4ed8)",
    padding: "25px",
    borderRadius: "20px"
  },

  cardDark: {
    background: "#1e293b",
    padding: "25px",
    borderRadius: "20px"
  },

  cardAlert: {
    background:
      "linear-gradient(135deg,#dc2626,#b91c1c)",
    padding: "25px",
    borderRadius: "20px"
  },

  chartSection: {
    marginBottom: "30px"
  },

  chartTitle: {
    marginBottom: "20px"
  },

  chartBox: {
    background: "#111827",
    padding: "25px",
    borderRadius: "20px"
  },

  formSection: {
    background: "#111827",
    padding: "25px",
    borderRadius: "20px",
    marginBottom: "30px"
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "15px"
  },

  input: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "white",
    padding: "14px",
    borderRadius: "10px",
    outline: "none"
  },

  createButton: {
    background:
      "linear-gradient(135deg,#16a34a,#15803d)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    padding: "14px",
    fontWeight: "bold"
  },

  cancelButton: {
    background: "#475569",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    padding: "14px",
    fontWeight: "bold"
  },

  editButton: {
    width: "100%",
    marginTop: "10px",
    background:
      "linear-gradient(135deg,#f59e0b,#d97706)",
    border: "none",
    color: "white",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  receiptButton: {
    width: "100%",
    marginTop: "10px",
    background:
      "linear-gradient(135deg,#06b6d4,#0891b2)",
    border: "none",
    color: "white",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  searchSection: {
    marginBottom: "30px"
  },

  searchInput: {
    width: "100%",
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "white"
  },

  section: {
    background: "#111827",
    padding: "25px",
    borderRadius: "20px",
    marginBottom: "30px"
  },

  sectionTitle: {
    marginBottom: "25px"
  },

productsGrid: {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(260px,1fr))",
  gap: "25px",
  width: "100%"
},

  productCard: {
    background:
      "linear-gradient(180deg,#1e293b,#172033)",
    padding: "20px",
    borderRadius: "20px",
    boxShadow:
      "0 0 15px rgba(0,0,0,0.3)"
  },

  productPlaceholder: {
    height: "180px",
    background: "#0f172a",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "50px",
    marginBottom: "15px"
  },

  productImage: {
    width: "100%",
    maxWidth: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "14px",
    marginBottom: "15px"
  },

  stock: {
    marginTop: "10px"
  },

  alertBadge: {
    marginTop: "15px",
    background:
      "linear-gradient(135deg,#ef4444,#dc2626)",
    padding: "12px",
    borderRadius: "12px",
    textAlign: "center",
    fontWeight: "bold"
  },

  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px"
  },

  actionBlue: {
    flex: 1,
    background:
      "linear-gradient(135deg,#2563eb,#3b82f6)",
    border: "none",
    color: "white",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "bold"
  },

  actionDark: {
    flex: 1,
    background: "#334155",
    border: "none",
    color: "white",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "bold"
  },

  deleteButton: {
    width: "100%",
    marginTop: "10px",
    background:
      "linear-gradient(135deg,#ef4444,#dc2626)",
    border: "none",
    color: "white",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  historySection: {
    background: "#111827",
    padding: "25px",
    borderRadius: "20px",
    marginBottom: "40px"
  },

  historyTable: {
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },

  historyRow: {
    background: "#1e293b",
    padding: "15px",
    borderRadius: "12px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center"
  }
};