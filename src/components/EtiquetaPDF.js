
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
    marginBottom: 18
  },

  nombreBazar: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8
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
    marginBottom: 18
  },

  folioTexto: {
    fontSize: 10,
    color: "#6B7280"
  },

  folioNumero: {
    fontSize: 13,
    fontWeight: "bold"
  },

  campo: {
    marginBottom: 16
  },

  etiqueta: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 5
  },

  valor: {
    fontSize: 12,
    color: "#171C27",
    fontWeight: "bold"
  },

  aviso: {
    backgroundColor: "#F5F3FF",
    padding: 12,
    borderRadius: 6,
    marginTop: 12
  },

  avisoTitulo: {
    fontSize: 10,
    color: "#6D28D9",
    textAlign: "center",
    marginBottom: 5
  },

  avisoTexto: {
    fontSize: 9,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 1.5
  },

  pie: {
    marginTop: 18,
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center"
  }
});

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
            COMPROBANTE DE producto
          </Text>
        </View>

        <View style={styles.linea} />

        {/* Folio */}
        <View style={styles.folio}>
          <Text style={styles.folioTexto}>
            Folio de producto
          </Text>

          <Text style={styles.folioNumero}>
            #{String(producto.id).padStart(6, "0")}
          </Text>
        </View>

        {/* Información */}
        <View style={styles.campo}>
          <Text style={styles.etiqueta}>CLIENTE</Text>
          <Text style={styles.valor}>
            {producto.cliente || "No especificado"}
          </Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.etiqueta}>PRODUCTO</Text>
          <Text style={styles.valor}>
            {producto.producto || "No especificado"}
          </Text>
        </View>

        {/* Aviso */}
        <View style={styles.aviso}>
          <Text style={styles.avisoTitulo}>
            Comprobante de registro
          </Text>

          <Text style={styles.avisoTexto}>
            Conserve este documento como referencia
            de su producto.
          </Text>
        </View>

        {/* Pie */}
        <Text style={styles.pie}>
          Generado por Bazar Admin
        </Text>

      </Page>
    </Document>
  );
}
