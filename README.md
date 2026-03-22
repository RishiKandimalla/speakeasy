⏺ Speakeasy

  Speakeasy is a mobile app for improving your public speaking. Record or upload a video of yourself
  speaking, and the app runs it through an AI pipeline that analyzes your delivery — filler words, pacing,
   grammar, tone, vocabulary — and returns structured coaching feedback with per-sentence tips.

  What it does

  1. Record or upload a video of yourself speaking
  2. AI pipeline transcribes the audio, analyzes speech metrics, and scores your delivery
  3. Results screen shows a breakdown: filler word rate, WPM, grammar score, tone/confidence, vocabulary
  richness, and per-sentence coaching tips
  4. Metrics dashboard tracks your scores over time
  5. Social feed lets you publish results and see other users' posts

  AI pipeline

  ┌──────────────────┬────────────────────────┬──────────────────────────────────────────────────────┐
  │       Step       │        Provider        │                     What it does                     │
  ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────┤
  │ Transcription    │ AssemblyAI             │ Word-level speech-to-text                            │
  │                  │ (universal-2)          │                                                      │
  ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────┤
  │ Filler detection │ Gemini 2.5 Flash       │ Identifies filler words in context                   │
  ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────┤
  │ Grammar analysis │ Gemini 2.5 Flash       │ Flags grammatical errors, scores 0–100               │
  ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────┤
  │ Coaching         │ Gemini 2.5 Flash       │ Summary, strengths, improvements, tips, per-sentence │
  │ feedback         │                        │  notes                                               │
  ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────┤
  │ Tone / emotion   │ Hume AI (Speech        │ Maps confidence and energy scores onto sentences     │
  │                  │ Prosody)               │                                                      │
  └──────────────────┴────────────────────────┴──────────────────────────────────────────────────────┘

  Structure

  speakeasy/
  ├── backend/               # Python FastAPI backend
  │   └── app/
  │       ├── api/           # REST endpoints (uploads, jobs, posts, profiles, clips, notifications,
  stats)
  │       ├── services/      # Business logic (analysis, feedback, tone, captions, jobs, posts)
  │       ├── workers/       # Background job processor (transcription → analysis → feedback → captions)
  │       ├── db/            # Supabase client and queries
  │       ├── models/        # Pydantic request/response models
  │       └── auth/          # JWT / Supabase auth
  └── frontend/              # React Native / Expo mobile app
      └── src/
          ├── screens/       # UI screens (record, upload, analysis results, feed, metrics, profile, …)
          ├── components/    # Reusable components (ScoreBadge, StatCard, VideoPreview, …)
          ├── context/       # Auth context
          ├── lib/           # Supabase client, notifications, clip cache
          └── navigation/    # Stack + tab navigator types

  Tech stack

  - Frontend: React Native, Expo SDK 54, TypeScript, Supabase Auth
  - Backend: FastAPI (Python), Supabase (Postgres + Storage)
  - AI: AssemblyAI, Google Gemini 2.5 Flash, Hume AI
