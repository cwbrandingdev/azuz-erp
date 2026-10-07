import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const META_TOKEN = process.env.META_ACCESS_TOKEN;

const server = new Server(
  { name: "whatsapp-business", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "whatsapp_biz_send_message",
        description:
          "Envia uma mensagem de texto via WhatsApp Business Graph API",
        inputSchema: {
          type: "object",
          properties: {
            to: {
              type: "string",
              description:
                "Número de telefone do destinatário com DDD (ex: 5541999999999)",
            },
            text: { type: "string", description: "Conteúdo da mensagem" },
          },
          required: ["to", "text"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "whatsapp_biz_send_message") {
    const { to, text } = request.params.arguments;

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      },
    );

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }

  throw new Error(`Tool ${request.params.name} não encontrada`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
