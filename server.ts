import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import {
  FunctionDeclaration,
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Type,
} from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. Google Search Grounding Endpoint (gemini-3.8-flash with googleSearch tool)
  app.post('/api/ai/search-print-guide', async (req, res) => {
    try {
      const { query, sheetContext } = req.body as {
        query?: string;
        sheetContext?: string;
      };
      if (!query || !query.trim()) {
        res.status(400).json({ error: 'Please enter a print or paper question.' });
        return;
      }

      const ai = getGenAIClient();
      const prompt = `You are a Master Fine-Art Print Lab Technician for PrintGrid Studio v2.0.
Current Sheet Context: ${sheetContext || '12x18 inch Portrait @ 300 DPI'}.
User Question: ${query}

Provide concise, accurate, practical print production advice (exact paper weights in GSM, ICC profile tips, framing dimensions, or lab standards). Keep it structured in 2-3 short paragraphs or bullet points.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = chunks
        .map((c: any) => c.web)
        .filter((w: any) => w && w.uri)
        .map((w: any) => ({
          uri: w.uri as string,
          title: (w.title as string) || w.uri,
        }));

      res.json({
        text: response.text ?? 'No response generated.',
        sources,
      });
    } catch (err: any) {
      console.error('Search grounding error:', err);
      res.status(500).json({
        error:
          err?.message ||
          'Failed to query Google Search Grounding with gemini-3.8-flash.',
      });
    }
  });

  // 2. Text-to-Speech Endpoint using gemini-3.8-flash-tts
  app.post('/api/ai/tts', async (req, res) => {
    try {
      const { text, voiceMode } = req.body as {
        text?: string;
        voiceMode?: 'single' | 'dual';
      };

      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }

      const ai = getGenAIClient();

      if (voiceMode === 'dual') {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Alex: PrintGrid Studio pre-flight check! <breath> ${text}`,
                  speechMetadata: {
                    speaker: 'Alex',
                    style: 'Warm, articulate studio print director',
                  },
                },
                {
                  text: `Sam: |yeah| Dimensions and 300 DPI margins are locked and ready for the lab.`,
                  speechMetadata: {
                    speaker: 'Sam',
                    style: 'Crisp, reassuring master technician',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: 'Alex',
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Puck' },
                    },
                  },
                  {
                    speaker: 'Sam',
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                  },
                ],
              },
            },
          },
        });

        const base64Audio =
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          res.status(500).json({ error: 'No audio returned from gemini-3.8-flash-tts.' });
          return;
        }
        res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
        return;
      }

      // Single speaker Voice Design using gemini-3.8-flash-tts
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
                speechMetadata: {
                  style: 'Calm, confident fine-art photography lab specialist',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(500).json({ error: 'No audio returned from gemini-3.8-flash-tts.' });
        return;
      }

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err: any) {
      console.error('TTS error:', err);
      res.status(500).json({
        error:
          err?.message || 'Failed to synthesize speech via gemini-3.8-flash-tts.',
      });
    }
  });

  // 3. WebSocket Server for Real-Time Voice Conversations using gemini-3.8-live
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', `http://${request.headers.host}`)
      .pathname;
    if (pathname === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  const updatePrintSheetTool: FunctionDeclaration = {
    name: 'configurePrintSheet',
    description:
      'Updates the live PrintGrid Studio sheet settings such as paper size, orientation, outer margin, photo gap, or crop marks.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        paperSize: {
          type: Type.STRING,
          description: 'Paper size ID: "12x18", "13x19", "a4", or "a3"',
        },
        orientation: {
          type: Type.STRING,
          description: '"portrait" or "landscape"',
        },
        outerMarginIn: {
          type: Type.NUMBER,
          description: 'Outer safe margin in inches between 0.0 and 1.0',
        },
        gutterIn: {
          type: Type.NUMBER,
          description: 'Photo gap/gutter in inches between 0.0 and 0.6',
        },
        cropMarks: {
          type: Type.BOOLEAN,
          description: 'Enable or disable scissor cut / crop marks',
        },
      },
    },
  };

  wss.on('connection', async (clientWs: WebSocket) => {
    let sessionPromise: Promise<any> | null = null;
    try {
      const ai = getGenAIClient();
      sessionPromise = ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [updatePrintSheetTool] }],
          systemInstruction:
            'You are the Live Voice Assistant built into PrintGrid Studio v2.0. Help the user arrange their multi-size photo collage, choose between 12x18, 13x19, A4, and A3 paper at 300 DPI, adjust margins/crop marks, and call configurePrintSheet whenever they ask to change paper settings.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  inputTranscript: content.inputTranscription.text,
                })
              );
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  outputTranscript: content.outputTranscription.text,
                })
              );
            }

            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }

            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }

            for (const call of message.toolCall?.functionCalls ?? []) {
              if (call.name === 'configurePrintSheet') {
                clientWs.send(
                  JSON.stringify({
                    toolCommand: call.args,
                  })
                );
                sessionPromise?.then((s) => {
                  s.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: { result: 'Updated PrintGrid Studio sheet settings.' },
                      },
                    ],
                  });
                });
              }
            }
          },
          onerror: (err: any) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  error: err?.message || 'Live API session error.',
                })
              );
            }
          },
        },
      });

      const session = await sessionPromise;
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ ready: true }));
      }

      clientWs.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.audio && sessionPromise) {
            sessionPromise.then((s) => {
              s.sendRealtimeInput({
                audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
              });
            });
          } else if (msg.text && sessionPromise) {
            sessionPromise.then((s) => {
              s.sendRealtimeInput({
                text: msg.text,
              });
            });
          }
        } catch (e) {
          console.error('Error forwarding message to Live session:', e);
        }
      });

      clientWs.on('close', () => {
        session.close();
      });
    } catch (err: any) {
      console.error('Failed to connect to Gemini Live API:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            error:
              err?.message ||
              'Could not initialize gemini-3.8-live session. Check Settings > Secrets for GEMINI_API_KEY.',
          })
        );
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PrintGrid Studio v2.0 server listening on http://localhost:${PORT}`);
  });
}

startServer();
