# Drishti AI Security Platform

Drishti is a comprehensive, AI-powered security monitoring platform built by **cipher.ai**. It leverages real-time video analysis, intelligent alerts, and an interactive command center to provide unparalleled insight and control over security operations for specific events.

## The Problem We Solve

Managing security for large-scale events like concerts, festivals, or public gatherings presents significant challenges. Traditional security systems rely heavily on manual human oversight, which is often inefficient and prone to error.

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; text-align: center;">
  <div>
    <p style="padding-top: 8px; font-weight: 500;">Cognitive Overload</p>
    <p style="font-size: 0.9rem; color: #5F6368;">Human operators cannot effectively monitor dozens of live feeds simultaneously, leading to missed incidents.</p>
  </div>
  <div>
    <p style="padding-top: 8px; font-weight: 500;">Reactive vs. Proactive</p>
    <p style="font-size: 0.9rem; color: #5F6368;">Most systems only provide evidence after an event has occurred, rather than preventing it.</p>
  </div>
  <div>
    <p style="padding-top: 8px; font-weight: 500;">Siloed Information</p>
    <p style="font-size: 0.9rem; color: #5F6368;">Camera feeds, incident logs, and personnel communication are often disconnected, creating confusion.</p>
  </div>
</div>

### Our Solution: AI-Powered, Unified Command

Drishti addresses these challenges by integrating cutting-edge AI directly into the security workflow. It acts as a force multiplier for security teams, providing proactive insights and a unified platform for command and control. By analyzing feeds automatically, generating instant alerts, and offering a natural language interface to the entire system, Drishti transforms security from a reactive chore into a proactive, intelligent operation.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **AI/Generative**: [Google's Genkit](https://firebase.google.com/docs/genkit)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Firestore](https://firebase.google.com/docs/firestore), [Firebase Realtime Database](https://firebase.google.com/docs/database)
- **Authentication**: [Firebase Authentication](https://firebase.google.com/docs/auth)
- **File Storage**: [Firebase Storage](https://firebase.google.com/docs/storage)
- **Deployment**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## Google Technologies Used

| Technology | Use Case |
| :--- | :--- |
| **Genkit** | The core AI framework used to create, manage, and deploy all generative AI flows. It orchestrates calls to Gemini models and integrates AI tools with the application logic. |
| **Google AI (Gemini Models)** | Powers all intelligent features: `Gemini 1.5 Pro` analyzes video frames for threats, `Gemini Flash` handles the "Talk with Drishti" conversational AI, and the `TTS model` provides voice responses. |
| **Firebase App Hosting** | Provides fully-managed, secure hosting for the Next.js web application, enabling server-side rendering, automatic SSL, and integration with other Firebase services. |
| **Firebase Authentication** | Manages the entire user login and sign-up process, including email/password and federated sign-in with Google, ensuring secure access control. |
| **Firestore** | The primary NoSQL database for storing structured data such as incidents, user profiles, camera configurations, and event details. Its real-time capabilities are used to instantly update the UI. |
| **Firebase Realtime Database** | Used for high-frequency, low-latency state synchronization needed for the Emergency Response system, allowing instant communication with connected IoT hardware. |
| **Firebase Storage** | Stores all large binary files, specifically the user-uploaded videos that serve as camera feeds for analysis. |
| **Google Maps Platform** | Powers the interactive map in the camera management view, allowing users to geolocate cameras and visualize their positions. |

## Project Structure

The project is organized to separate concerns, making it easier to navigate and maintain.

```
.
├── src
│   ├── ai                  # Genkit AI flows and configuration
│   │   ├── flows/
│   │   └── genkit.ts
│   ├── app                 # Next.js App Router: pages and layouts
│   │   ├── (main)/
│   │   │   ├── event/[eventId]/ # Event-specific pages
│   │   │   └── page.tsx      # Event selection/creation page
│   │   ├── login/
│   │   └── signup/
│   ├── components          # Reusable React components
│   │   ├── drishti/        # Application-specific components
│   │   └── ui/             # ShadCN UI components
│   ├── lib                 # Core logic, context, and services
│   │   ├── auth-context.tsx
│   │   ├── drishti-context.tsx
│   │   ├── firebase-service.ts
│   │   ├── firebase.ts
│   │   └── types.ts
│   └── ...
├── public/                 # Static assets (images, sounds)
├── .env                    # Environment variables (needs to be created)
└── next.config.ts          # Next.js configuration
```

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- A [Firebase Project](https://console.firebase.google.com/) with the following services enabled:
  - **Authentication** (with Email/Password and Google providers)
  - **Firestore**
  - **Realtime Database**
  - **Storage**
- A **Google AI Gemini API Key**. You can get one from [Google AI Studio](https://ai.google.dev/).
- A **Google Maps API Key** with the Geocoding API enabled.

### 1. Installation

Clone the repository and install the necessary dependencies.

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root of the project and add your Firebase project configuration and Gemini API key.

```plaintext
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/

# Google AI (Genkit)
GEMINI_API_KEY=your-gemini-api-key

# Google Maps (for Location Picker)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 3. Running the Development Servers

The application requires two separate development servers to run concurrently: one for the Next.js frontend and one for the Genkit AI flows.

**Terminal 1: Run the Next.js App**
```bash
npm run dev
```
This will start the main application, typically on `http://localhost:9002`.

**Terminal 2: Run the Genkit AI Server**
```bash
npm run genkit:dev
```
This starts the Genkit server, which the Next.js app will call for AI-related tasks.

Once both servers are running, you can access the application in your browser.

## Key Features

- **Event-Driven Architecture**: All data, from cameras to incidents, is organized under specific events. Users first create or select an event to work within.
- **AI-Powered Analysis**: The `analyze-camera-frame` flow in `src/ai` uses Gemini to analyze video frames for crowd counting, person detection, and automatic alert generation based on predefined behavioral triggers.
- **Interactive Command Center**: Users can "Talk with Drishti," an AI assistant that uses Genkit tools to answer questions about system status, incidents, and personnel by querying the live database.
- **Real-time Dashboards**: The dashboard provides at-a-glance statistics, live camera feeds, a crowd density heatmap, and a timeline of recent incidents.
- **User and Role Management**: An admin-only section to manage users and their roles (Admin, Security Officer, Operator).
- **Emergency Response System**: Allows authorized users to trigger hardware-based alerts (e.g., sirens, drones) for specific locations or globally via the Firebase Realtime Database.
