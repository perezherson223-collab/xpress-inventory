import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export default function Home() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [notification, setNotification] =
    useState("");

  const [editingId, setEditingId] =
    useState(null);

  const [imageFile, setImageFile] =
    useState(null);

  const [newProduct, setNewProduct] =
    useState({
      name: "",
      sku: "",
      category: "",
      color: "",
      stock: 0
    });

  useEffect(() => {
    checkUser();

    const productsChannel = supabase
      .channel("products-live")
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

    return () => {
      supabase.removeChannel(
        productsChannel
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

  function notify(message) {
    setNotification(message);

    setTimeout(() => {
      setNotification("");
    }, 2500);
  }

  async function getProducts() {
    setLoading(true);

    const { data, error } =
      await supabase
        .from("products")
        .select("*")
        .order("id", {
          ascending: false
        });

    if (error) {
      console.log(error);
      notify(
        "❌ Error cargando productos"
      );
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }

  async function getMovements() {
    const { data } = await supabase
      .from("movements")
      .select("*")
      .order("id", {
        ascending: false
      });

    setMovements(data || []);
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
      notify(
        "❌ Error subiendo imagen"
      );
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
      notify("⚠️ Escribe un nombre");
      return;
    }

    let imageUrl = null;

    if (imageFile) {
      imageUrl =
        await uploadImage(imageFile);
    }

    const { error } =
      await supabase
        .from("products")
        .insert([
          {
            ...newProduct,
            image: imageUrl,
            created_at: new Date()
          }
        ]);

    if (error) {
      console.log(error);
      notify(
        "❌ Error agregando producto"
      );
      return;
    }

    notify("✅ Producto agregado");

    resetForm();

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
      category:
        newProduct.category,
      color: newProduct.color,
      stock:
        Number(newProduct.stock)
    };

    if (imageUrl) {
      updateData.image = imageUrl;
    }

    const { error } =
      await supabase
        .from("products")
        .update(updateData)
        .eq("id", editingId);

    if (error) {
      notify(
        "❌ Error actualizando"
      );
      return;
    }

    notify("✏️ Producto actualizado");

    resetForm();

    getProducts();
  }

  async function deleteProduct(id) {
    const ok = confirm(
      "¿Eliminar producto?"
    );

    if (!ok) return;

    await supabase
      .from("products")
      .delete()
      .eq("id", id);

    notify("🗑️ Producto eliminado");

    getProducts();
  }

  async function addStock(product) {
    const newStock =
      Number(product.stock) + 1;

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

    getProducts();
  }

  async function removeStock(product) {
    if (product.stock <= 0) {
      notify("⚠️ No hay stock");
      return;
    }

    const newStock =
      Number(product.stock) - 1;

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

    getProducts();
  }

  async function saveMovement(
    product,
    type,
    quantity
  ) {
    await supabase
      .from("movements")
      .insert([
        {
          product_id: product.id,
          product_name:
            product.name,
          type,
          quantity,
          created_at: new Date()
        }
      ]);

    getMovements();
  }

  function editProduct(product) {
    setEditingId(product.id);

    setNewProduct({
      name: product.name || "",
      sku: product.sku || "",
      category:
        product.category || "",
      color:
        product.color || "",
      stock: product.stock || 0
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function resetForm() {
    setEditingId(null);

    setImageFile(null);

    setNewProduct({
      name: "",
      sku: "",
      category: "",
      color: "",
      stock: 0
    });
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

    const excelBuffer = XLSX.write(
      workbook,
      {
        bookType: "xlsx",
        type: "array"
      }
    );

    const fileData = new Blob(
      [excelBuffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    );

    saveAs(
      fileData,
      "inventario.xlsx"
    );
  }
  function exportMovementsExcel() {
  const data = movements.map((m) => ({
    Producto: m.product_name,
    Tipo: m.type,
    Cantidad: m.quantity,
    Fecha: new Date(
      m.created_at
    ).toLocaleString()
  }));

  const worksheet =
    XLSX.utils.json_to_sheet(data);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Movimientos"
  );

  const excelBuffer =
    XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

  const fileData = new Blob(
    [excelBuffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  );

  saveAs(
    fileData,
    "movimientos-xpress.xlsx"
  );

  notify(
    "📊 Movimientos exportados"
  );
}

function exportMovementsExcel() {
  const data = movements.map((m) => ({
    Producto: m.product_name,
    Tipo: m.type,
    Cantidad: m.quantity,
    Fecha: new Date(
      m.created_at
    ).toLocaleString()
  }));

  const worksheet =
    XLSX.utils.json_to_sheet(data);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Movimientos"
  );

  const excelBuffer =
    XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

  const fileData = new Blob(
    [excelBuffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  );

  saveAs(
    fileData,
    "movimientos.xlsx"
  );

  notify(
    "📊 Movimientos exportados"
  );
}
  function downloadPDF() {
    const doc = new jsPDF();

    doc.text(
      "INVENTARIO XPRESS",
      20,
      20
    );

    let y = 40;

    products.forEach((p) => {
      doc.text(
        `${p.name} | Stock: ${p.stock}`,
        20,
        y
      );

      y += 10;
    });

    doc.save("inventario.pdf");
  }

  const filteredProducts =
    products.filter((product) => {
      return (
        product.name
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        product.sku
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        product.category
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )
      );
    });

  const lowStockProducts =
    products.filter(
      (p) => Number(p.stock) <= 5
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

        <button
          style={styles.logout}
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
        >
          Cerrar Sesión
        </button>
      </aside>

      <main style={styles.main}>
        <h1 style={styles.title}>
          Dashboard Inventario
        </h1>

        <div style={styles.topButtons}>
          <button
            style={styles.green}
            onClick={downloadPDF}
          >
            PDF
          </button>

          <button
            style={styles.blue}
            onClick={exportExcel}
          >
            Excel
          
          </button>
          <button
  style={styles.orange}
  onClick={exportMovementsExcel}
>
  Movimientos Excel
</button>
        </div>

        <div style={styles.stats}>
          <div style={styles.card}>
            <h3>Total Productos</h3>
            <h1>{products.length}</h1>
          </div>

          <div style={styles.card}>
            <h3>Movimientos</h3>
            <h1>{movements.length}</h1>
          </div>

          <div style={styles.cardRed}>
            <h3>Stock Bajo</h3>
            <h1>
              {lowStockProducts.length}
            </h1>
          </div>
        </div>

        <div style={styles.form}>
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
                category:
                  e.target.value
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
                color:
                  e.target.value
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
                stock:
                  e.target.value
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
            style={styles.green}
            onClick={
              editingId
                ? updateProduct
                : createProduct
            }
          >
            {editingId
              ? "Actualizar"
              : "Guardar"}
          </button>
        </div>

        <input
          style={styles.search}
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />
{lowStockProducts.length > 0 && (
  <div
    style={{
      background: "#7f1d1d",
      padding: "20px",
      borderRadius: "20px",
      marginBottom: "20px"
    }}
  >
    <h2>
      ⚠️ Productos por agotarse
    </h2>

    {lowStockProducts.map((p) => (
      <div
        key={p.id}
        style={{
          marginTop: "10px"
        }}
      >
        {p.name} - Stock: {p.stock}
      </div>
    ))}
  </div>
)}
        <div style={styles.chart}>
          <ResponsiveContainer
            width="100%"
            height={300}
          >
            <BarChart data={products}>
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="stock"
                fill="#3b82f6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : (
          <div style={styles.grid}>
            {filteredProducts.map(
              (product) => (
                <div
                  key={product.id}
                  style={styles.product}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      style={
                        styles.image
                      }
                    />
                  ) : (
                    <div
                      style={
                        styles.placeholder
                      }
                    >
                      📦
                    </div>
                  )}

                  <h3>
                    {product.name}
                  </h3>

                  <p>
                    SKU:{" "}
                    {product.sku}
                  </p>

                  <p>
                    Categoría:{" "}
                    {
                      product.category
                    }
                  </p>

                  <p>
                    Color:{" "}
                    {product.color}
                  </p>

                  <p>
                    Stock:{" "}
                    {product.stock}
                  </p>

                  <div
                    style={
                      styles.actions
                    }
                  >
                    <button
                      style={
                        styles.blue
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
                        styles.red
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
                      styles.orange
                    }
                    onClick={() =>
                      editProduct(
                        product
                      )
                    }
                  >
                    Editar
                  </button>

                  <button
                    style={styles.red}
                    onClick={() =>
                      deleteProduct(
                        product.id
                      )
                    }
                  >
                    Eliminar
                  </button>
                </div>
              )
            )}
          </div>
        )}
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
    width: "220px",
    background: "#111827",
    padding: "20px"
  },

  logo: {
    color: "#3b82f6",
    fontSize: "32px"
  },

  logout: {
    marginTop: "30px",
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    background: "#ef4444",
    color: "white",
    cursor: "pointer"
  },

  main: {
    flex: 1,
    padding: "30px"
  },

  title: {
    marginBottom: "20px"
  },

  topButtons: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px"
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "20px",
    marginBottom: "30px"
  },

  card: {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "20px"
  },

  cardRed: {
    background: "#7f1d1d",
    padding: "20px",
    borderRadius: "20px"
  },

  form: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "15px",
    marginBottom: "30px"
  },

  input: {
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "white"
  },

  search: {
    width: "100%",
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "white",
    marginBottom: "30px"
  },

  chart: {
    background: "#111827",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "30px"
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "20px"
  },

  product: {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "20px"
  },

  image: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "15px",
    marginBottom: "15px"
  },

  placeholder: {
    height: "180px",
    background: "#0f172a",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "50px",
    marginBottom: "15px"
  },

  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "15px"
  },

  green: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer"
  },

  blue: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer"
  },

  red: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    width: "100%",
    marginTop: "10px"
  },

  orange: {
    background: "#f59e0b",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    width: "100%",
    marginTop: "10px"
  },

  notification: {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: "#2563eb",
    padding: "15px 25px",
    borderRadius: "12px",
    zIndex: 9999
  }
};