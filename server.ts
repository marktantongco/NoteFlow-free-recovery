import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/insights", async (req, res) => {
    try {
      const { entries, logs, habitLogs, habits, analysisType } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Analyze the following substance use recovery data for a user.
Analysis Focus: ${analysisType || 'General Overview'}

Data Context:
- Entries: Daily journal logs including mood (1-10), craving intensity (1-10), triggers, coping strategies, and notes.
- Logs: Substance use records including substance type, quantity, location, social context, and emotional state before/during/after.
- Habits: User-defined habits and their completion logs.

Dataset:
Entries: ${JSON.stringify(entries?.slice(-20) || [], null, 2)}
Logs: ${JSON.stringify(logs?.slice(-20) || [], null, 2)}
Habits: ${JSON.stringify(habits || [], null, 2)}
Habit Logs: ${JSON.stringify(habitLogs?.slice(-30) || [], null, 2)}

Task:
Provide a sophisticated, empathetic, and actionable analysis.
1. Identify specific triggers based on location, time, and social context.
2. Correlate mood fluctuations with substance use or craving spikes.
3. Evaluate the effectiveness of recorded coping strategies.
4. Analyze habit formation patterns and consistency.
5. Suggest personalized recovery actions and habit improvements.

Output JSON Structure:
{
  "insights": ["Insight 1", "Insight 2", "Insight 3"],
  "habitInsights": ["Habit Insight 1", "Habit Insight 2"],
  "patterns": [
    {"label": "High Risk Time", "value": "Evenings"},
    {"label": "Top Trigger", "value": "Stress"}
  ],
  "riskLevel": 1-10,
  "recommendations": ["Action 1", "Action 2"]
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (text) {
        res.json(JSON.parse(text));
      } else {
        res.status(500).json({ error: "Failed to generate insights" });
      }
    } catch (error) {
      console.error("AI Insight Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/journal-starters", async (req, res) => {
    try {
      const { mood, moodLabel, cravingLevel, recentHabits } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `You are a compassionate recovery coach helping a user write a journal entry.
Current State:
- Mood: ${mood}/10 (${moodLabel || 'Not specified'})
- Craving Level: ${cravingLevel}/10
- Recent Habits Context: ${JSON.stringify(recentHabits || [])}

Task:
Generate 3 distinct, empathetic, and thought-provoking starter sentences or themes for their journal entry today. 
The starters should be tailored to their current mood and craving level, encouraging reflection and positive coping.

Output JSON Structure:
{
  "starters": ["Starter 1...", "Starter 2...", "Starter 3..."]
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (text) {
        res.json(JSON.parse(text));
      } else {
        res.status(500).json({ error: "Failed to generate starters" });
      }
    } catch (error) {
      console.error("AI Starter Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Server for Buddy Chat
  const wss = new WebSocketServer({ server });

  const rooms = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws) => {
    let currentRoom: string | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'join') {
          const { roomId } = data;
          if (currentRoom) {
            rooms.get(currentRoom)?.delete(ws);
          }
          currentRoom = roomId;
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          rooms.get(roomId)?.add(ws);
          
          // Notify others in room
          rooms.get(roomId)?.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'system',
                content: 'A buddy has joined the chat.'
              }));
            }
          });
        } else if (data.type === 'signal') {
          // Relay signaling data (for key exchange) to others in the room
          if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom)?.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'signal',
                  data: data.data,
                  senderId: data.senderId
                }));
              }
            });
          }
        } else if (data.type === 'message') {
          if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom)?.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'message',
                  content: data.content, // Encrypted content
                  senderId: data.senderId,
                  timestamp: new Date().toISOString()
                }));
              }
            });
          }
        }
      } catch (e) {
        console.error('WebSocket error:', e);
      }
    });

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        rooms.get(currentRoom)?.delete(ws);
        if (rooms.get(currentRoom)?.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    });
  });
}

startServer();
