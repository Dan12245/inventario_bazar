
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    fontFamily: "Helvetica",
    color: "#171C27"
  },

  encabezado: {
    alignItems: "center",
    marginBottom: 12
  },

  nombreBazar: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 6
  },

  subtitulo: {
    fontSize: 8,
    color: "#555555"
  },

  linea: {
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    marginBottom: 10
  },

  folio: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },

  folioTexto: {
    fontSize: 9,
    color: "#6B7280"
  },

  folioNumero: {
    fontSize: 12,
    fontWeight: "bold"
  },

  campo: {
    marginBottom: 11
  },

  etiqueta: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 4
  },

  valor: {
    fontSize: 11,
    fontWeight: "bold"
  },

  precio: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#171C27"
  },

  pie: {
    marginTop: 12,
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center"
  }
});

const formatoPrecio = (precio) => {
  if (precio == null) return "Sin precio";

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(precio));
};

export default function EtiquetaPDF({ producto }) {
  return (
    <Document>
      <Page size="A6" style={styles.page} wrap={false}>

        {/* Encabezado */}
        <View style={styles.encabezado}>
          <Text style={styles.nombreBazar}>
            BAZAR
          </Text>

          <Text style={styles.subtitulo}>
            ETIQUETA DE PRODUCTO
          </Text>
        </View>

        <View style={styles.linea} />

        {/* Folio */}
        <View style={styles.folio}>
          <Text style={styles.folioTexto}>
            ID del producto
          </Text>

          <Text style={styles.folioNumero}>
            #{String(producto.id).padStart(6, "0")}
          </Text>
        </View>

        {/* Información */}
        <View style={styles.campo}>
          <Text style={styles.etiqueta}>
            PRODUCTO
          </Text>

          <Text style={styles.valor}>
            {producto.nombre || "No especificado"}
          </Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.etiqueta}>
            DESCRIPCIÓN
          </Text>

          <Text style={styles.valor}>
            {producto.descripcion || "Sin descripción"}
          </Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.etiqueta}>
            CANTIDAD DISPONIBLE
          </Text>

          <Text style={styles.valor}>
            {String(producto.cantidad ?? 0)}
          </Text>
        </View>

        <View style={styles.linea} />

        {/* Precio */}
        <View style={styles.campo}>
          <Text style={styles.etiqueta}>
            PRECIO UNITARIO
          </Text>

          <Text style={styles.precio}>
            {formatoPrecio(producto.precio)}
          </Text>
        </View>

        <Text style={styles.pie}>
          Generado por Bazar Admin
        </Text>

      </Page>
    </Document>
  );
}
