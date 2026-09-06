const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.analyzeLabReport = async (imageBuffer, mimeType) => {
    try {
        // Use gemini-3-flash-preview for faster response or gemini-1.5-pro for higher reasoning
        // 'gemini-3-flash-preview' handles multimodal input well
        // Using Gemini 1.5 Flash for reliable summary
        console.log("Using Gemini 1.5 Flash for Report Summary");
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `You are a medical report interpretation assistant.
        
A patient has uploaded a medical report (lab report, imaging report, discharge summary, or doctor’s notes).
Your task is to summarize the report in simple, non-technical language that a non-medical patient can easily understand.

Instructions:
- Do NOT use medical jargon unless absolutely necessary. If used, explain it in plain words.
- Write in a calm, reassuring, and neutral tone.
- Do NOT make a diagnosis or suggest treatment beyond what is explicitly written in the report.
- Do NOT alarm the patient. Clearly state when values are mildly, moderately, or significantly outside the normal range.
- If something is unclear or missing in the report, clearly say so.

Please output the result as a VALID JSON OBJECT with three main keys: "summary_text", "structured_data", and "mentioned_medicines".

Part 1: "summary_text"
This should be a string containing your formatted summary. Follow this EXACT format inside the string:

1. Overall Summary
– 3–5 lines explaining what this report is about and the general findings.

2. Key Findings Explained Simply
– Bullet points
– Each point must explain what it means for the patient.

3. Normal vs Abnormal Results
– Clearly mention which values are normal
– Highlight abnormal values in simple terms (e.g., “slightly high”, “lower than normal”).

4. What This Means for You
– Practical explanation of how this may affect daily life or health.

5. When to Talk to Your Doctor
– List situations where medical follow-up is recommended.

6. Important Note
– “This summary is for understanding only and does not replace advice from your doctor.”

7. List of Medicines Found
– List the medicines found in the report here as well for easy reference.
– If none, say "No medicines explicitly mentioned."

Part 2: "structured_data"
This should be an object representing the raw data for graphing and history. It should roughly follow this structure:
{
  "test_date": "YYYY-MM-DD",
  "patient_name": "String",
  "tests": [
    {
      "name": "Test Name",
      "value": "Numeric Value (as string)",
      "unit": "Unit",
      "reference_range": "Range",
      "status": "Normal/Abnormal"
    }
  ]
}

Part 3: "mentioned_medicines"
– An array of strings listing any medicines prescribed or mentioned in the report.
– If none, return an empty array [].
– Example: ["Metformin", "Atorvastatin"]

Ensure the response is purely valid JSON. Do not wrap in markdown code blocks.`;

        // Convert buffer to base64 for Gemini
        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: mimeType
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();

        // Sanitize response in case it's wrapped in markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log("[SUCCESS] Gemini Analysis Complete");
        return JSON.parse(text); // Parse JSON before returning
    } catch (error) {
        console.error("[ERROR] AI Vision Error:", error.message);
        throw new Error("Failed to analyze report: " + error.message);
    }
};

exports.checkDrugInteractions = async (newMed, patientHistory) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `You are a medical AI checking drug safety.

PATIENT MEDICAL HISTORY:
${JSON.stringify(patientHistory, null, 2)}

NEW MEDICATION TO PRESCRIBE: ${newMed}

ANALYZE FOR:
1. Drug-Allergy Interactions
2. Drug-Disease Contraindications  
3. Drug-Drug Interactions with current medications

RESPONSE FORMAT:

If SAFE:
[SUCCESS] **SAFE TO PRESCRIBE**
No contraindications detected for ${newMed}.

If UNSAFE:
[WARNING] **RED ALERT - DO NOT PRESCRIBE**

**Interaction Type:** [Allergy/Disease/Drug-Drug]
**Risk Level:** [Mild/Moderate/Severe]
**Explanation:** [Clear medical explanation of the risk]
**Alternative:** [Suggest safer alternative if possible]

Be specific, cite the exact interaction, and be concise.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Safety Error:", error);
        throw new Error("Failed to check drug interactions: " + error.message);
    }
};

exports.scribeConsultation = async (audioTranscript) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `You are a medical scribe AI. Create a structured consultation note.

TRANSCRIPT:
"${audioTranscript}"

FORMAT YOUR NOTE AS:

👤 **CHIEF COMPLAINT**
[Patient's main concern in their words]

[DEBUG] **DIAGNOSIS**
[Preliminary or confirmed diagnosis]

[PRESCRIPTION] **PRESCRIPTION**
1. [Medicine Name] - [Dosage] - [Frequency] - [Duration]
   [Brief indication/purpose]
2. [Continue for all medications]

🧪 **TESTS ORDERED**
• [Test Name] - [Reason for ordering]
• [Continue for all tests]

📅 **FOLLOW-UP**
• [Next appointment date/timeline]
• [Any specific instructions or warnings]

Keep it professional, concise, and medically accurate.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Scribe Error:", error);
        throw new Error("Failed to transcribe consultation: " + error.message);
    }
};

exports.generateMedicalExplainer = async (medicineName, patientProfile, reportContext) => {
    try {
        // Using Gemini 1.5 Flash for Video Storyboard (Pro model caused 404)
        console.log("Using Gemini 1.5 Flash for Med Explainer");
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Determine profile specifics
        let audienceStyle = "general";
        const age = patientProfile?.age || 70; // Default to elderly
        if (age > 60) audienceStyle = "elderly";
        else if (age < 12) audienceStyle = "child";

        // Ensure reportContext is a string and not too long to avoid token limits
        const contextStr = typeof reportContext === 'string' ? reportContext : JSON.stringify(reportContext || {});
        const safeContext = contextStr.length > 5000 ? contextStr.substring(0, 5000) + "..." : contextStr;

        let prompt = `You are a medical animation generator.
        
        Context:
        Medicine: ${medicineName}
        Patient Age: ${age}
        Report Context: ${safeContext}

        Task: Generate a script and visual storyboard for a 2-3 minute explainer video.
        
        Audience Adaptation:
        ${audienceStyle === 'elderly' ? "- Use slower pacing, larger text, repetition." : ""}
        ${audienceStyle === 'child' ? "- Use friendly characters, playful visuals." : ""}
        - For Indian patients: Use culturally neutral visuals.

        You are a medical 3D animation generator. A patient has uploaded a medical report that mentions one or more medicines prescribed to them. Your task is to generate a calm, reassuring, and educational 2–3 minute fully 3D animated explainer video that clearly shows how the medicine mentioned in the report works inside the human body, assuming the viewer has no medical background. The animation must use realistic but simplified 3D human anatomy, with clearly labeled organs, smooth camera movements, soft lighting, and a friendly, non-alarming color palette (avoid harsh reds or blacks). The video should begin with a short introduction showing the medicine name and briefly explaining, in simple language, what condition it is commonly used for. Next, show how the medicine enters the body based on the report (tablet, injection, inhaler, etc.), followed by a 3D visualization of absorption into the bloodstream. Then, animate the medicine traveling through blood vessels in a cinematic 3D view and clearly highlight the target organ or system (such as the heart, lungs, brain, liver, or immune system). After that, demonstrate the medicine’s mechanism of action using clear 3D visual metaphors instead of chemical formulas, such as blocking harmful signals, reducing inflammation, killing bacteria, or helping an organ function more smoothly. Continue by showing expected benefits over time through visual improvements inside the body, such as smoother blood flow, relaxed airways, or reduced swelling. End the video with a mandatory safety disclaimer displayed clearly on screen: “This animation is for understanding only. Always take medicines exactly as prescribed by your doctor.” Use short, clear sentences, avoid medical jargon unless unavoidable, and visually explain any technical term if it appears. Do not claim cures, do not show emergency situations, and do not replace professional medical advice. Generate the animation strictly based on the medicine or medicines mentioned in the uploaded medical report. Optionally, adapt pacing and visuals for Indian audiences, elderly patients with slower motion and larger labels, or children with friendlier 3D elements.
        
        IMPORTANT RESPONSE FORMAT:
        You must return a VALID JSON ARRAY of scene objects. Do not wrap in markdown or code blocks.
        
        Structure for each scene object:
        {
          "scene_number": integer,
          "title": "String title of scene",
          "narration": "The exact voiceover text to be spoken",
          "visual_description": "Detailed description of the 3D animation for this scene",
          "animation_type": "One of: fade_in, slide_right, pulse, flow, zoom_in",
          "main_icon": "One of: tablet, injection, lungs, heart, brain, stomach, blood_vessel, liver, kidney, shield, check, warning",
          "duration_seconds": integer (approx 5-10 seconds per scene)
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // In JSON mode, we probably don't need to strip backticks, but good to be safe
        // In JSON mode, we probably don't need to strip backticks, but good to be safe
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log("AI Explainer JSON generated (First 100 chars):", cleanText.substring(0, 100));

        try {
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error for Explainer:", e);
            console.error("Raw Text:", text);
            throw new Error("AI generated invalid JSON. Please try again.");
        }

    } catch (error) {
        console.error("AI Explainer Error:", error);
        throw new Error("Failed to generate explainer: " + error.message);
    }
};
