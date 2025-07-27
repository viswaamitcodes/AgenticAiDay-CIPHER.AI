
'use server';
/**
 * @fileOverview An AI agent that can answer questions about the Drishti system.
 *
 * - drishtiCommandCenter - A function that handles user queries.
 * - getSystemStatus - A tool that the AI can use to get system status.
 * - DrishtiCommandCenterInput - The input type for the function.
 * - DrishtiCommandCenterOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Camera, Incident, Commander, IncidentStatus, CrowdAnalyticsDataPoint } from '@/lib/types';
import { format } from 'date-fns';

const CAMERAS_COLLECTION = 'cameras';
const INCIDENTS_COLLECTION = 'incidents';
const COMMANDERS_COLLECTION = 'commanders';
const CROWD_ANALYTICS_HISTORY_COLLECTION = 'crowd_analytics_history';
const ANALYSIS_RESULTS_COLLECTION = 'analysis_results';


// Tool to get system status
const getSystemStatus = ai.defineTool(
  {
    name: 'getSystemStatus',
    description: 'Returns the current status of the Drishti security system, including camera counts and active incidents for a given event. Call this tool whenever the user asks for a general overview or summary of the system.',
    inputSchema: z.object({
        eventId: z.string().describe('The ID of the event to get the status for.'),
    }),
    outputSchema: z.object({
        onlineCameras: z.number(),
        totalCameras: z.number(),
        activeIncidents: z.number(),
        totalIncidents: z.number(),
    }),
  },
  async ({ eventId }) => {
    const camerasSnapshot = await getDocs(query(collection(db, CAMERAS_COLLECTION), where('eventId', '==', eventId)));
    const incidentsSnapshot = await getDocs(query(collection(db, INCIDENTS_COLLECTION), where('eventId', '==', eventId)));

    const cameras = camerasSnapshot.docs.map(doc => doc.data() as Camera);
    const incidents = incidentsSnapshot.docs.map(doc => doc.data() as Incident);
    
    const onlineCameras = cameras.filter(c => c.status === 'Online').length + 1; // +1 for webcam
    const totalCameras = cameras.length + 1;
    const activeIncidents = incidents.filter(i => i.status === 'Active').length;

    return {
        onlineCameras,
        totalCameras,
        activeIncidents,
        totalIncidents: incidents.length,
    };
  }
);

// Tool to get commander roster
const getCommanderRoster = ai.defineTool(
    {
        name: 'getCommanderRoster',
        description: 'Returns the list of all configured response commanders for a given event. Call this when the user asks about commanders, who is on duty, or for a roster.',
        inputSchema: z.object({
            eventId: z.string().describe('The ID of the event to get the roster for.'),
        }),
        outputSchema: z.object({
            commanders: z.array(z.object({
                name: z.string(),
                contactNumber: z.string(),
                assignedCameraId: z.string(),
            }))
        }),
    },
    async ({ eventId }) => {
        const commandersSnapshot = await getDocs(query(collection(db, COMMANDERS_COLLECTION), where('eventId', '==', eventId)));
        const commanders = commandersSnapshot.docs.map(doc => doc.data() as Omit<Commander, 'id' | 'eventId'>);
        return { commanders };
    }
);

// Tool to get incidents
const getIncidents = ai.defineTool(
    {
        name: 'getIncidents',
        description: 'Returns a list of security incidents for a given event, optionally filtered by status.',
        inputSchema: z.object({
            eventId: z.string().describe('The ID of the event to get incidents for.'),
            status: z.custom<IncidentStatus>().optional().describe("The status to filter incidents by (e.g., Active, Resolved)."),
        }),
        outputSchema: z.object({
            incidents: z.array(z.object({
                type: z.string(),
                severity: z.string(),
                status: z.string(),
                description: z.string(),
                cameraName: z.string(),
            })),
        }),
    },
    async ({ eventId, status }) => {
        let incidentsQuery = query(collection(db, INCIDENTS_COLLECTION), where('eventId', '==', eventId));
        if (status) {
            incidentsQuery = query(incidentsQuery, where('status', '==', status));
        }
        const incidentsSnapshot = await getDocs(incidentsQuery);
        const incidents = incidentsSnapshot.docs.map(doc => {
            const incident = doc.data() as Incident;
            return {
                type: incident.type,
                severity: incident.severity,
                status: incident.status,
                description: incident.description,
                cameraName: incident.camera.name,
            };
        });
        return { incidents };
    }
);

// Tool to get camera details
const getCameras = ai.defineTool(
    {
        name: 'getCameras',
        description: 'Returns a list of all cameras in the system for a given event with their details.',
        inputSchema: z.object({
            eventId: z.string().describe('The ID of the event to get cameras for.'),
        }),
        outputSchema: z.object({
            cameras: z.array(z.object({
                name: z.string(),
                location: z.string(),
                status: z.string(),
            }))
        }),
    },
    async ({ eventId }) => {
        const camerasSnapshot = await getDocs(query(collection(db, CAMERAS_COLLECTION), where('eventId', '==', eventId)));
        const cameras = camerasSnapshot.docs.map(doc => {
            const cam = doc.data() as Camera;
            return { name: cam.name, location: cam.location, status: cam.status };
        });
        // Add the local webcam manually
        cameras.push({ name: 'Your Webcam', location: 'Local Feed', status: 'Online' });
        return { cameras };
    }
);

// Tool to predict bottlenecks
const predictSystemBottlenecks = ai.defineTool(
    {
        name: 'predictSystemBottlenecks',
        description: 'Analyzes historical and real-time data for an event to predict future system bottlenecks or determine if the current situation is a bottleneck. Use when asked for predictions, forecasts, potential future problems, or to analyze the current state.',
        inputSchema: z.object({
            eventId: z.string().describe('The ID of the event to analyze.'),
            timeframeMinutes: z.number().optional().describe("The timeframe in minutes to predict bottlenecks for. If not provided, a general, non-time-specific prediction will be made."),
        }),
        outputSchema: z.object({
            prediction: z.string(),
        }),
    },
    async ({ eventId, timeframeMinutes }) => {
        // Fetch historical incidents
        const incidentsSnapshot = await getDocs(query(collection(db, INCIDENTS_COLLECTION), where('eventId', '==', eventId)));
        const incidents = incidentsSnapshot.docs.map(doc => {
            const data = doc.data() as Incident;
            return { type: data.type, location: data.camera.location, severity: data.severity, time: data.timestamp };
        }).slice(0, 50);

        // Fetch recent crowd analytics history
        const crowdHistorySnapshot = await getDocs(query(collection(db, CROWD_ANALYTICS_HISTORY_COLLECTION), where('eventId', '==', eventId)));
        const crowdHistory = crowdHistorySnapshot.docs.map(doc => {
             const data = doc.data() as CrowdAnalyticsDataPoint;
             return { count: data.count, time: format(data.timestamp.toDate(), 'yyyy-MM-dd HH:mm') };
        }).slice(0, 100);

        // Fetch current, real-time data
        const currentStatus = await getSystemStatus({ eventId });
        const analysisSnapshot = await getDocs(query(collection(db, ANALYSIS_RESULTS_COLLECTION), where('eventId', '==', eventId)));
        const currentCrowdCount = analysisSnapshot.docs.reduce((sum, doc) => sum + (doc.data()?.crowdCount || 0), 0);
        
        const realTimeData = {
            activeIncidents: currentStatus.activeIncidents,
            currentCrowdCount
        };

        // Construct the prompt for the AI
        let prompt = `As a senior security analyst, review the following data to generate a security prediction for event ${eventId}.

**Real-time Data:**
- Active Incidents: ${realTimeData.activeIncidents}
- Current Live Crowd Count: ${realTimeData.currentCrowdCount}

**Historical Data:**
- Recent Incidents: ${JSON.stringify(incidents, null, 2)}
- Recent Crowd Data: ${JSON.stringify(crowdHistory, null, 2)}
`;

        if (timeframeMinutes) {
            prompt += `\nBased on all this data, provide a concise prediction about potential security bottlenecks specifically within the **next ${timeframeMinutes} minutes**.`;
        } else {
             prompt += `\nBased on all this data, first, state whether the **current situation** constitutes a security bottleneck. Second, provide a concise, general prediction about potential future security bottlenecks. Focus on identifying patterns in time, location, or incident type.`;
        }

        // Generate prediction based on the comprehensive data
        const { output } = await ai.generate({
            model: 'googleai/gemini-1.5-pro-latest',
            prompt: prompt,
        });
        
        return { prediction: output?.text || 'No specific bottlenecks could be predicted at this time.' };
    }
);


const DrishtiCommandCenterInputSchema = z.object({
  query: z.string().describe("The user's query about the Drishti system."),
  eventId: z.string().describe("The ID of the current event context."),
});
export type DrishtiCommandCenterInput = z.infer<typeof DrishtiCommandCenterInputSchema>;

const DrishtiCommandCenterOutputSchema = z.object({
  answer: z.string().describe("The AI's answer to the user's query."),
});
export type DrishtiCommandCenterOutput = z.infer<typeof DrishtiCommandCenterOutputSchema>;


const drishtiCommandCenterFlow = ai.defineFlow(
  {
    name: 'drishtiCommandCenterFlow',
    inputSchema: DrishtiCommandCenterInputSchema,
    outputSchema: DrishtiCommandCenterOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        system: `You are the voice assistant for the Drishti AI Security Platform. 
Your name is Drishti. Be concise, professional, and helpful.
You have access to a suite of tools to provide real-time information about the security system for a specific event.
You MUST use these tools to answer any user question about the system.
You MUST pass the eventId: "${input.eventId}" to every tool call.
- Use 'getSystemStatus' for general overview questions.
- Use 'getIncidents' for questions about specific incidents or lists of incidents.
- Use 'getCameras' for questions about specific cameras or lists of cameras.
- Use 'getCommanderRoster' for questions about personnel.
- Use 'predictSystemBottlenecks' for questions about future predictions, forecasts, potential problems, or analyzing the current situation.
After using a tool, you MUST formulate a final, user-facing answer based on the tool's output.
Your final output must ALWAYS be a JSON object that satisfies the specified schema. Do not output plain text.
If you don't know the answer or a tool fails, provide a helpful message stating what you can do, within the required JSON structure.`,
        prompt: input.query,
        tools: [getSystemStatus, getCommanderRoster, getIncidents, getCameras, predictSystemBottlenecks],
        output: { schema: DrishtiCommandCenterOutputSchema }
    });
    
    if (!output) {
      return { answer: "I'm sorry, I was unable to process that request. Please try again." };
    }
    return output;
  }
);

export async function drishtiCommandCenter(input: DrishtiCommandCenterInput): Promise<DrishtiCommandCenterOutput> {
  return await drishtiCommandCenterFlow(input);
}
