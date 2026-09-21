# Model & SDK Guidelines

- **AI SDK**: The application strictly uses the modern `@google/genai` SDK, not the legacy `@google/generative-ai` SDK.
- **Model Versions**: Use `gemini-3-flash-preview` (or the latest verified 3.x/1.5 version compatible with the new SDK) for AI calls to ensure maximum stability and prevent 404/v1beta routing errors. Do not revert to older models or legacy SDK initialization methods (`new GoogleGenerativeAI`).
- **Initialization**: Always initialize using `new GoogleGenAI({ apiKey })` instead of the legacy structure.
- **Methodology**: Use `ai.models.generateContentStream` with the complete `config` object (including `tools`, `systemInstruction`, `safetySettings`) placed exclusively within the `config` block.
