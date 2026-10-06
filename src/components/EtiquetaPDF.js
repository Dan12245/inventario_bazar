import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 20,
    flexDirection: 'column',
  },
  section: {
    margin: 10,
    padding: 10,
    border: '1px solid #ccc',
  },
  titulo: {
    fontSize: 24,
    marginBottom: 10,
    color: '#2563eb', // Azul
  },
  texto: {
    fontSize: 14,
    marginBottom: 5,
  }
});

export default function EtiquetaPDF({ apartado }) {
  return (
    <Document>
      <Page size="A6" style={styles.page}> {/* A6 es tamaño etiqueta/ticket grande */}
        <View style={styles.section}>
          <Text style={styles.titulo}>Ticket de Apartado</Text>
          <Text style={styles.texto}>ID: {apartado.id}</Text>
          <Text style={styles.texto}>Cliente: {apartado.cliente}</Text>
          <Text style={styles.texto}>Producto: {apartado.producto}</Text>
        </View>
      </Page>
    </Document>
  );
}