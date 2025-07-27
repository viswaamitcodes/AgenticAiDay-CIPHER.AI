'use server';
/**
 * @fileOverview An AI agent for analyzing single frames from a camera feed.
 *
 * - analyzeCameraFrame - A function that analyzes a frame for security events.
 * - AnalyzeCameraFrameInput - The input type for the function.
 * - AnalyzeCameraFrameOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { IncidentSeverity, IncidentType } from '@/lib/types';


const AnalyzeCameraFrameInputSchema = z.object({
  frameDataUri: z
    .string()
    .describe(
      "A single frame from a video camera, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type AnalyzeCameraFrameInput = z.infer<typeof AnalyzeCameraFrameInputSchema>;

const AlertSchema = z.object({
    type: z.custom<IncidentType>().describe("The type of incident detected."),
    description: z.string().describe("A concise description of the new alert."),
    severity: z.custom<IncidentSeverity>().describe("The severity of the alert (Low, Medium, High, or Critical).")
});

const PersonPositionSchema = z.object({
    x: z.number().describe("The x-coordinate of the person's position (0-1)."),
    y: z.number().describe("The y-coordinate of the person's position (0-1)."),
});

const AnalyzeCameraFrameOutputSchema = z.object({
  crowdCount: z.number().describe('An estimated count of the number of people in the frame.'),
  peoplePositions: z.array(PersonPositionSchema).describe('An array of the normalized (x, y) coordinates for each person detected in the frame.'),
  newAlerts: z.array(AlertSchema).describe("A list of any new security alerts detected in the frame. If no new issues are found, return an empty array."),
});
export type AnalyzeCameraFrameOutput = z.infer<typeof AnalyzeCameraFrameOutputSchema>;


export async function analyzeCameraFrame(input: AnalyzeCameraFrameInput): Promise<AnalyzeCameraFrameOutput> {
  return analyzeCameraFrameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCameraFramePrompt',
  input: { schema: AnalyzeCameraFrameInputSchema },
  output: { schema: AnalyzeCameraFrameOutputSchema },
  model: 'googleai/gemini-1.5-pro-latest',
  prompt: `You are an AI security expert analyzing a live camera feed for the Drishti AI Security Platform.
    Your task is to analyze the provided image frame and return a structured report with high accuracy.

    **Analysis Steps:**

    1.  **Count the People**: Accurately estimate the number of individuals visible in the frame. Set this as 'crowdCount'.
    2.  **Identify People's Positions**: For each person identified, estimate their position. Return this as an array of 'peoplePositions', with 'x' and 'y' coordinates normalized between 0 and 1 (top-left is 0,0; bottom-right is 1,1).
    3.  **Identify Incidents & Generate Alerts**: Carefully check for any of the incidents listed below. If an incident is detected, create a new alert object for it. If nothing is wrong, return an empty 'newAlerts' array.

    **Behavioral Triggers for Alerts:**

    -   **Suspicious Behavior (Severity: Low to Medium)**:
        -   A person loitering in a sensitive area for an extended period.
        -   A person intentionally obscuring their face from the camera's view (e.g., with clothing, a hat, or by turning away).
        -   A person abandoning a package or bag.
    -   **Crowd Surge (Severity: High)**:
        -   A sudden, rapid increase in crowd density in a confined area, indicating potential panic or uncontrolled movement.
    -   **Unauthorized Access (Severity: Medium)**:
        -   A person attempting to enter or entering a restricted zone without authorization.
    -   **Theft (Severity: High)**:
        -   Observing an individual taking an item without payment or from another person.
    -   **Emergency (Severity: Critical)**:
        -   Detection of fire, smoke, medical emergencies (e.g., a person collapsing), or visible physical altercations.

    Analyze the following frame and provide your report:
    {{media url=frameDataUri}}`,
});

const analyzeCameraFrameFlow = ai.defineFlow(
  {
    name: 'analyzeCameraFrameFlow',
    inputSchema: AnalyzeCameraFrameInputSchema,
    outputSchema: AnalyzeCameraFrameOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        return {
            crowdCount: 0,
            peoplePositions: [],
            newAlerts: [],
        };
    }
    return output;
  }
);
