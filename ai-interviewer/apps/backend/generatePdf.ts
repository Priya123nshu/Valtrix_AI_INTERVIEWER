import fs from "fs";
import path from "path";

/**
 * Pure TypeScript PDF Generator for Architecture Documentation
 * Produces clean, standards-compliant PDF-1.4 with multi-page support,
 * custom styling, code blocks, tables, and clickable web links.
 */

interface LinkAnnotation {
  rect: [number, number, number, number];
  url: string;
}

class PDFPage {
  width = 595.28;
  height = 841.89;
  stream: string[] = [];
  links: LinkAnnotation[] = [];
  pageNumber: number;

  constructor(pageNumber: number) {
    this.pageNumber = pageNumber;
  }

  addOp(op: string) {
    this.stream.push(op);
  }

  addRect(x: number, y: number, w: number, h: number, fillColor?: [number, number, number], strokeColor?: [number, number, number]) {
    this.addOp("q");
    if (fillColor) {
      this.addOp(`${fillColor[0].toFixed(3)} ${fillColor[1].toFixed(3)} ${fillColor[2].toFixed(3)} rg`);
    }
    if (strokeColor) {
      this.addOp(`${strokeColor[0].toFixed(3)} ${strokeColor[1].toFixed(3)} ${strokeColor[2].toFixed(3)} RG 1 w`);
    }
    this.addOp(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (fillColor && strokeColor) {
      this.addOp("B");
    } else if (fillColor) {
      this.addOp("f");
    } else if (strokeColor) {
      this.addOp("S");
    }
    this.addOp("Q");
  }

  addText(text: string, x: number, y: number, font: string, size: number, color: [number, number, number] = [0.1, 0.1, 0.1]) {
    const cleanText = text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[\u2192]/g, "->")
      .replace(/[\u2022]/g, "*")
      .replace(/[^\x20-\x7E]/g, " ");

    const escaped = cleanText.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    this.addOp("BT");
    this.addOp(`/${font} ${size} Tf`);
    this.addOp(`${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} rg`);
    this.addOp(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    this.addOp(`(${escaped}) Tj`);
    this.addOp("ET");
  }

  addLink(text: string, x: number, y: number, url: string, font: string, size: number, color: [number, number, number] = [0.12, 0.45, 0.9]) {
    this.addText(text, x, y, font, size, color);
    const textWidth = text.length * size * 0.52;
    this.links.push({
      rect: [x, y - 2, x + textWidth, y + size + 2],
      url,
    });
  }
}

export class ArchitecturePDFBuilder {
  pages: PDFPage[] = [];
  currentPage: PDFPage;
  cursorY: number = 780;
  marginLeft: number = 54;
  marginRight: number = 54;
  pageWidth: number = 595.28;
  pageHeight: number = 841.89;

  constructor() {
    this.currentPage = new PDFPage(1);
    this.pages.push(this.currentPage);
    this.drawPageHeaderFooter(this.currentPage);
  }

  newPage() {
    const nextNum = this.pages.length + 1;
    this.currentPage = new PDFPage(nextNum);
    this.pages.push(this.currentPage);
    this.cursorY = 760;
    this.drawPageHeaderFooter(this.currentPage);
  }

  checkSpace(neededHeight: number) {
    if (this.cursorY - neededHeight < 65) {
      this.newPage();
    }
  }

  drawPageHeaderFooter(page: PDFPage) {
    // Header top bar
    page.addRect(0, this.pageHeight - 26, this.pageWidth, 26, [0.08, 0.1, 0.18]);
    page.addText("AI Interviewer Platform: WebRTC & Realtime Speech Architecture Guide", 54, this.pageHeight - 17, "F2", 8.5, [0.9, 0.92, 0.98]);

    // Footer bottom bar
    page.addRect(0, 0, this.pageWidth, 30, [0.96, 0.97, 0.98], [0.88, 0.9, 0.93]);
    page.addText("Complete Technical Architecture & Implementation Blueprint", 54, 11, "F1", 7.8, [0.45, 0.5, 0.55]);
    page.addText(`Page ${page.pageNumber}`, this.pageWidth - 85, 11, "F2", 8, [0.35, 0.4, 0.45]);
  }

  addTitle(title: string, subtitle: string) {
    this.checkSpace(115);
    // Gradient-like banner card
    this.currentPage.addRect(54, this.cursorY - 95, 487.28, 95, [0.06, 0.09, 0.17]);
    // Accent line
    this.currentPage.addRect(54, this.cursorY - 95, 487.28, 4, [0.55, 0.35, 0.95]);

    this.currentPage.addText(title, 72, this.cursorY - 34, "F2", 16, [1, 1, 1]);
    this.currentPage.addText(subtitle, 72, this.cursorY - 56, "F1", 9.5, [0.8, 0.85, 0.95]);
    this.currentPage.addText("OpenAI Realtime API (gpt-realtime), Whisper STT, WebRTC SDP Handshake & gpt-4.1 Evaluation", 72, this.cursorY - 76, "F2", 8, [0.55, 0.85, 0.75]);

    this.cursorY -= 115;
  }

  addHeading1(text: string) {
    this.checkSpace(46);
    this.cursorY -= 14;
    // Section pill badge
    this.currentPage.addRect(54, this.cursorY - 4, 487.28, 23, [0.94, 0.96, 1.0], [0.8, 0.85, 0.95]);
    this.currentPage.addText(text, 62, this.cursorY + 3, "F2", 11.5, [0.12, 0.2, 0.45]);
    this.cursorY -= 22;
  }

  addHeading2(text: string) {
    this.checkSpace(32);
    this.cursorY -= 10;
    this.currentPage.addText(text, 54, this.cursorY, "F2", 10, [0.15, 0.18, 0.25]);
    this.currentPage.addRect(54, this.cursorY - 3, 240, 1, [0.75, 0.8, 0.9]);
    this.cursorY -= 14;
  }

  addParagraph(text: string, fontSize = 8.8, color: [number, number, number] = [0.2, 0.22, 0.28]) {
    const maxWidth = 487.28;
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.48));
    const words = text.split(" ");
    let line = "";

    for (const word of words) {
      if ((line + word).length > charsPerLine) {
        this.checkSpace(fontSize + 5);
        this.currentPage.addText(line.trim(), 54, this.cursorY, "F1", fontSize, color);
        this.cursorY -= fontSize + 4;
        line = word + " ";
      } else {
        line += word + " ";
      }
    }

    if (line.trim().length > 0) {
      this.checkSpace(fontSize + 5);
      this.currentPage.addText(line.trim(), 54, this.cursorY, "F1", fontSize, color);
      this.cursorY -= fontSize + 6;
    }
  }

  addBullet(title: string, description: string) {
    this.checkSpace(36);
    this.currentPage.addRect(56, this.cursorY + 2, 4, 4, [0.45, 0.35, 0.9]);
    this.currentPage.addText(title, 66, this.cursorY, "F2", 9, [0.15, 0.18, 0.25]);
    this.cursorY -= 13;

    const maxWidth = 475;
    const charsPerLine = Math.floor(maxWidth / (8.5 * 0.48));
    const words = description.split(" ");
    let line = "";

    for (const word of words) {
      if ((line + word).length > charsPerLine) {
        this.checkSpace(12);
        this.currentPage.addText(line.trim(), 66, this.cursorY, "F1", 8.3, [0.3, 0.32, 0.38]);
        this.cursorY -= 12;
        line = word + " ";
      } else {
        line += word + " ";
      }
    }
    if (line.trim().length > 0) {
      this.checkSpace(12);
      this.currentPage.addText(line.trim(), 66, this.cursorY, "F1", 8.3, [0.3, 0.32, 0.38]);
      this.cursorY -= 15;
    }
  }

  addCodeBlock(title: string, lines: string[]) {
    const blockHeight = lines.length * 11 + 24;
    this.checkSpace(blockHeight + 10);

    // Code container
    this.currentPage.addRect(54, this.cursorY - blockHeight, 487.28, blockHeight, [0.08, 0.1, 0.13], [0.2, 0.25, 0.32]);
    // Title bar
    this.currentPage.addRect(54, this.cursorY - 18, 487.28, 18, [0.13, 0.16, 0.2]);
    this.currentPage.addText(title, 64, this.cursorY - 13, "F2", 7.8, [0.75, 0.85, 0.95]);

    let y = this.cursorY - 30;
    for (const line of lines) {
      this.currentPage.addText(line, 64, y, "F3", 7.5, [0.88, 0.92, 0.96]);
      y -= 11;
    }

    this.cursorY -= blockHeight + 12;
  }

  addCallout(title: string, content: string, type: "tip" | "info" = "info") {
    this.checkSpace(46);
    const bg: [number, number, number] = type === "tip" ? [0.94, 0.99, 0.96] : [0.95, 0.96, 1.0];
    const border: [number, number, number] = type === "tip" ? [0.3, 0.75, 0.45] : [0.35, 0.5, 0.9];
    const textColor: [number, number, number] = type === "tip" ? [0.1, 0.4, 0.2] : [0.15, 0.25, 0.55];

    this.currentPage.addRect(54, this.cursorY - 36, 487.28, 36, bg, border);
    this.currentPage.addText(title, 66, this.cursorY - 14, "F2", 8.8, textColor);
    this.currentPage.addText(content, 66, this.cursorY - 27, "F1", 8.1, [0.25, 0.28, 0.32]);
    this.cursorY -= 46;
  }

  addDocLink(title: string, url: string, description: string) {
    this.checkSpace(48);
    this.currentPage.addRect(54, this.cursorY - 42, 487.28, 42, [0.98, 0.98, 1.0], [0.88, 0.9, 0.95]);
    this.currentPage.addText(title, 66, this.cursorY - 13, "F2", 9, [0.12, 0.18, 0.3]);
    this.currentPage.addLink(url, 66, this.cursorY - 25, url, "F1", 7.8, [0.15, 0.45, 0.9]);
    this.currentPage.addText(description, 66, this.cursorY - 36, "F1", 7.6, [0.45, 0.48, 0.52]);
    this.cursorY -= 48;
  }

  build(): Buffer {
    const objOffsets: number[] = [];
    const streamParts: string[] = [];
    let currentPos = 0;

    function addChunk(str: string) {
      streamParts.push(str);
      currentPos += Buffer.byteLength(str, "latin1");
    }

    addChunk("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    const totalPages = this.pages.length;
    const FONT_F1_OBJ = 3;
    const FONT_F2_OBJ = 4;
    const FONT_F3_OBJ = 5;
    const FIRST_PAGE_OBJ = 6;
    const FIRST_CONTENT_OBJ = FIRST_PAGE_OBJ + totalPages;
    let nextObjNum = FIRST_CONTENT_OBJ + totalPages;

    const pageLinkObjMap: Map<number, number[]> = new Map();
    const linkObjects: { objNum: number; link: LinkAnnotation }[] = [];

    for (let i = 0; i < totalPages; i++) {
      const p = this.pages[i];
      const linkIds: number[] = [];
      for (const link of p.links) {
        const id = nextObjNum++;
        linkIds.push(id);
        linkObjects.push({ objNum: id, link });
      }
      pageLinkObjMap.set(i, linkIds);
    }

    function recordObj(num: number) {
      objOffsets[num] = currentPos;
      addChunk(`${num} 0 obj\n`);
    }

    // 1: Catalog
    recordObj(1);
    addChunk("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    // 2: Pages tree
    recordObj(2);
    const pageKids = this.pages.map((_, i) => `${FIRST_PAGE_OBJ + i} 0 R`).join(" ");
    addChunk(`<< /Type /Pages /Kids [ ${pageKids} ] /Count ${totalPages} >>\nendobj\n`);

    // 3, 4, 5: Fonts
    recordObj(FONT_F1_OBJ);
    addChunk("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

    recordObj(FONT_F2_OBJ);
    addChunk("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n");

    recordObj(FONT_F3_OBJ);
    addChunk("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n");

    // Page objects
    for (let i = 0; i < totalPages; i++) {
      const pageObjNum = FIRST_PAGE_OBJ + i;
      const contentObjNum = FIRST_CONTENT_OBJ + i;
      const annots = pageLinkObjMap.get(i) || [];
      const annotStr = annots.length > 0 ? ` /Annots [ ${annots.map((a) => `${a} 0 R`).join(" ")} ]` : "";

      recordObj(pageObjNum);
      addChunk(
        `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595.28 841.89 ] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${FONT_F1_OBJ} 0 R /F2 ${FONT_F2_OBJ} 0 R /F3 ${FONT_F3_OBJ} 0 R >> >>${annotStr} >>\nendobj\n`
      );
    }

    // Page Content Streams
    for (let i = 0; i < totalPages; i++) {
      const contentObjNum = FIRST_CONTENT_OBJ + i;
      const streamContent = this.pages[i].stream.join("\n");
      const streamLen = Buffer.byteLength(streamContent, "latin1");

      recordObj(contentObjNum);
      addChunk(`<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj\n`);
    }

    // Link Annotation Objects
    for (const item of linkObjects) {
      recordObj(item.objNum);
      const [x1, y1, x2, y2] = item.link.rect;
      const urlEscaped = item.link.url.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      addChunk(
        `<< /Type /Annot /Subtype /Link /Rect [ ${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)} ] /Border [ 0 0 0 ] /A << /S /URI /URI (${urlEscaped}) >> >>\nendobj\n`
      );
    }

    // Cross-reference table
    const startXref = currentPos;
    addChunk(`xref\n0 ${nextObjNum}\n`);
    addChunk("0000000000 65535 f \n");
    for (let i = 1; i < nextObjNum; i++) {
      const offset = objOffsets[i] || 0;
      const offsetStr = offset.toString().padStart(10, "0");
      addChunk(`${offsetStr} 00000 n \n`);
    }

    addChunk(`trailer\n<< /Size ${nextObjNum} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

    return Buffer.from(streamParts.join(""), "latin1");
  }
}

export function generateArchitectureGuide(): Buffer {
  const pdf = new ArchitecturePDFBuilder();

  // COVER & TITLE BANNER
  pdf.addTitle(
    "AI INTERVIEWER ARCHITECTURE GUIDE",
    "Complete Technical Blueprint: WebRTC, Realtime Speech-to-Speech & Evaluation"
  );

  // SECTION 1: HOW TO RUN
  pdf.addHeading1("1. Quick Start: How to Run the Platform");
  pdf.addParagraph(
    "The platform consists of a Bun-powered React frontend and Express backend. Both run locally with high-performance hot-reloading."
  );
  pdf.addCodeBlock("Terminal Commands to Start the Servers", [
    "# Terminal 1: Start Backend (Port 3001)",
    "cd e:\\complete_interview\\ai-interviewer\\apps\\backend",
    "bun run dev",
    "",
    "# Terminal 2: Start Frontend (Port 3000)",
    "cd e:\\complete_interview\\ai-interviewer\\apps\\frontend",
    "bun run dev",
    "",
    "# Open in Browser: http://localhost:3000",
  ]);

  pdf.addCallout(
    "Environment Configuration (.env in apps/backend/.env)",
    "OPENAI_API_KEY is configured. Optional GITHUB_TOKEN increases GitHub repo rate limit from 60 to 5,000 req/hr. Fallback storage is built-in.",
    "tip"
  );

  // SECTION 2: THE LATENCY BREAKTHROUGH
  pdf.addHeading1("2. The Latency Breakthrough: Traditional Voice vs. Native WebRTC");
  pdf.addParagraph(
    "The core reason this conversation feels so natural and instantaneous is the transition from disconnected multi-step HTTP cascades to unified WebRTC speech-to-speech processing."
  );

  pdf.addBullet(
    "Traditional Pipeline (2,500ms - 4,500ms Latency)",
    "Audio recording -> Full WAV/MP3 upload -> Speech-to-Text API -> Text prompt to LLM -> LLM text generation -> Text-to-Speech API -> Audio stream download. Creates robotic, disjointed pauses."
  );
  pdf.addBullet(
    "Native OpenAI Realtime WebRTC (<320ms Latency)",
    "Continuous bidirectional audio stream over UDP using Opus codec. Tokens and audio frames are generated synchronously inside the neural model without intermediate transcoding."
  );
  pdf.addBullet(
    "Barge-In Interruption (Server VAD)",
    "OpenAI Voice Activity Detection automatically truncates AI audio generation the millisecond you speak, creating true human conversation parity."
  );

  // SECTION 3: WEBRTC HANDSHAKE
  pdf.addHeading1("3. The WebRTC SDP Handshake Pipeline");
  pdf.addParagraph(
    "WebRTC requires an exchange of Session Description Protocol (SDP) manifests to negotiate IP addresses, audio codecs (Opus, 48kHz), and RTP media pipelines between the browser and OpenAI."
  );

  pdf.addCodeBlock("Step-by-Step WebRTC Connection (Interview.tsx & index.ts)", [
    "// 1. Browser captures local microphone",
    "const ms = await navigator.mediaDevices.getUserMedia({ audio: true });",
    "pc.addTrack(ms.getTracks()[0]);",
    "",
    "// 2. Browser generates WebRTC SDP Offer",
    "const offer = await pc.createOffer();",
    "await pc.setLocalDescription(offer);",
    "",
    "// 3. Backend acts as secure proxy (protects OPENAI_API_KEY)",
    "POST /api/v1/session/:id -> POST https://api.openai.com/v1/realtime/calls",
    "FormData: { sdp: offer.sdp, session: JSON.stringify({ model: 'gpt-realtime', voice: 'alloy' }) }",
    "",
    "// 4. OpenAI returns SDP Answer + unique Location (Call ID)",
    "await pc.setRemoteDescription({ type: 'answer', sdp: openAiAnswerSdp });",
    "// Direct P2P-style media connection is established!",
  ]);

  // SECTION 4: WEBSOCKET SIDEBAND
  pdf.addHeading1("4. WebSocket Sideband & Dynamic Repository Injection");
  pdf.addParagraph(
    "While WebRTC handles raw audio, OpenAI provides a parallel WebSocket connection (the Sideband) at wss://api.openai.com/v1/realtime?call_id={id}. This connection controls conversation intelligence."
  );

  pdf.addBullet(
    "Context Injection (session.update)",
    "When the call opens, backend sends candidate GitHub projects, top languages, and star counts directly into the model's system instructions."
  );
  pdf.addBullet(
    "Autonomous Greeting (response.create)",
    "Backend commands the AI to greet the candidate by name first and formulate an opening technical question based on their GitHub repositories."
  );
  pdf.addBullet(
    "Native Whisper STT Transcription",
    "input_audio_transcription: { model: 'whisper-1' } transcribes candidate voice in real-time. No external services (like Deepgram) are needed."
  );
  pdf.addBullet(
    "Dialogue Logging",
    "Listens to conversation.item.input_audio_transcription.completed and response.done to persist every turn to storage for final scoring."
  );

  // SECTION 5: MODEL SELECTION & SCORING
  pdf.addHeading1("5. Model Selection & Candidate Evaluation");
  pdf.addParagraph(
    "Per your architectural requirement, lightweight mini models (like 4o-mini) were eliminated in favor of OpenAI's flagship models."
  );

  pdf.addBullet(
    "Realtime Voice Model",
    "gpt-realtime-2 / gpt-realtime: OpenAI's highest-tier multimodal audio generation model with low token latency and natural cadence."
  );
  pdf.addBullet(
    "Evaluation & Scoring Model",
    "gpt-4.1 / gpt-4o: Evaluates full conversation transcripts against candidate experience, producing an objective score (1-10) and structured feedback."
  );
  pdf.addBullet(
    "Hot-Reload Resilience",
    "Interview sessions and transcripts are backed up to .local_storage.json, ensuring live sessions survive development server hot-reloads without 411 errors."
  );

  // SECTION 6: CURATED DOCUMENTATION
  pdf.addHeading1("6. Official OpenAI Documentation & Reference Guides");
  pdf.addParagraph(
    "The following official guides and documentation pages are essential reading for mastering OpenAI Realtime WebRTC applications:"
  );

  pdf.addDocLink(
    "1. Realtime API with WebRTC Guide",
    "https://platform.openai.com/docs/guides/realtime-webrtc",
    "Official guide on WebRTC architecture, SDP exchange, client-side media streams, and ephemeral tokens."
  );

  pdf.addDocLink(
    "2. Realtime API Official Announcement",
    "https://openai.com/index/introducing-the-realtime-api",
    "Deep dive on speech-to-speech neural modeling, latency benchmarks, and voice capabilities."
  );

  pdf.addDocLink(
    "3. Realtime Client & Server Events Specification",
    "https://platform.openai.com/docs/api-reference/realtime-client-events",
    "Reference for session.update, conversation items, server_vad parameters, and Whisper STT hooks."
  );

  pdf.addDocLink(
    "4. Official OpenAI WebRTC Reference Console",
    "https://github.com/openai/openai-realtime-console",
    "Complete React and Node.js open-source console with audio visualizers and function calling."
  );

  pdf.addDocLink(
    "5. OpenAI API Pricing & Model Specs",
    "https://openai.com/api/pricing",
    "Current token and audio minute pricing for gpt-realtime-2, gpt-4.1, and Whisper."
  );

  pdf.addDocLink(
    "6. OpenAI Speech-to-Text (Whisper) Guide",
    "https://platform.openai.com/docs/guides/speech-to-text",
    "Technical documentation for Whisper model acoustics, temperature tuning, and multilingual transcription."
  );

  return pdf.build();
}

// Export and self-generate helper
export function saveArchitecturePdfToFile(targetPath?: string): string {
  const outputPath = targetPath || path.resolve("e:/complete_interview/AI_Interviewer_Architecture_Guide.pdf");
  const buffer = generateArchitectureGuide();
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}
