
import { createHmac, randomUUID } from "node:crypto";

const appSecret = process.env.WHATSAPP_APP_SECRET;

if (!appSecret) {
  throw new Error("Falta WHATSAPP_APP_SECRET");
}

const mensajeId = `wamid.prueba.${randomUUID()}`;

const evento = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            messages: [
              {
                id: mensajeId,
                from: "521234567890",
                type: "text",
                text: {
                  body: "hola"
                }
              }
            ]
          }
        }
      ]
    }
  ]
};

// La firma se calcula sobre el cuerpo exacto
const cuerpo = JSON.stringify(evento);

const firma =
  "sha256=" +
  createHmac("sha256", appSecret)
    .update(cuerpo)
    .digest("hex");

async function enviarPrueba(numeroDeIntento) {
  const respuesta = await fetch(
    "http://localhost:3000/api/whatsapp/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": firma
      },
      body: cuerpo
    }
  );

  console.log(
    `Intento ${numeroDeIntento}:`,
    respuesta.status,
    await respuesta.text()
  );
}

console.log("ID del mensaje:", mensajeId);

// Primera entrega del mensaje
await enviarPrueba(1);

// Segunda entrega: exactamente el mismo mensaje
await enviarPrueba(2);
