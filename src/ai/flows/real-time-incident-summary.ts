'use server';
/**
 * @fileOverview An AI agent for generating real-time incident summaries from camera streams.
 *
 * - generateIncidentSummary - A function that generates a summary of an incident.
 * - GenerateIncidentSummaryInput - The input type for the generateIncidentSummary function.
 * - GenerateIncidentSummaryOutput - The return type for the generateIncidentSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateIncidentSummaryInputSchema = z.object({
  cameraStream: z
    .string()
    .describe(
      "A real-time camera stream or video file represented as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  incidentType: z.string().describe('The type of incident being reported.'),
  location: z.string().describe('The location of the incident.'),
});
export type GenerateIncidentSummaryInput = z.infer<typeof GenerateIncidentSummaryInputSchema>;

const GenerateIncidentSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the incident.'),
});
export type GenerateIncidentSummaryOutput = z.infer<typeof GenerateIncidentSummaryOutputSchema>;

export async function generateIncidentSummary(input: GenerateIncidentSummaryInput): Promise<GenerateIncidentSummaryOutput> {
  return generateIncidentSummaryFlow(input);
}

const generateIncidentSummaryPrompt = ai.definePrompt({
  name: 'generateIncidentSummaryPrompt',
  input: {schema: GenerateIncidentSummaryInputSchema},
  output: {schema: GenerateIncidentSummaryOutputSchema},
  prompt: `You are a security expert summarizing real-time incidents from camera streams.

  Given the following camera stream, incident type, and location, generate a concise summary of the incident.

  Incident Type: {{{incidentType}}}
  Location: {{{location}}}
  Camera Stream: {{media url=cameraStream}}

  Summary:`
});

const generateIncidentSummaryFlow = ai.defineFlow(
  {
    name: 'generateIncidentSummaryFlow',
    inputSchema: GenerateIncidentSummaryInputSchema,
    outputSchema: GenerateIncidentSummaryOutputSchema,
  },
  async input => {
    const {output} = await generateIncidentSummaryPrompt(input);
    return output!;
  }
);
