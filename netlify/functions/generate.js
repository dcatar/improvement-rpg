// netlify/functions/generate.js
const fetch = require("node-fetch");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Set this in Netlify’s environment vars
const OPENAI_API_URL = "https://api.openai.com/v1";

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed; use POST." }),
    };
  }

  try {
    // Parse request data
    const body = JSON.parse(event.body);
    const requestType = body.requestType; // e.g. "intro", "quests", or "images"
    const userGoal = body.goal || "";
    const quests = body.quests || [];      // For image generation step
    let responseData = {};

    // Check if we have a valid requestType
    if (!requestType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing 'requestType' in body." }),
      };
    }

    // Call the appropriate helper
    if (requestType === "intro") {
      responseData = await generateIntro(userGoal);
    } else if (requestType === "quests") {
      responseData = await generateQuests(userGoal);
    } else if (requestType === "images") {
      // For images, we expect an array of quest titles
      responseData = await generateImages(quests);
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Unknown 'requestType'." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
    };
  } catch (err) {
    console.error("Error in Netlify function:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error." }),
    };
  }
};

/** 1) Generate a short dark fantasy introduction for the user’s goal */
async function generateIntro(goal) {
  const prompt = `
You are a narrator in a dark fantasy world. The user wants to achieve the goal: "${goal}".
Write a short, immersive introduction (max 100 words) describing how they begin this ominous quest.
Emphasize an eerie atmosphere, but keep it concise.
  `;
  try {
    const res = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      }),
    });
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content?.trim() || "" };
  } catch (error) {
    console.error("Error in generateIntro:", error);
    return { text: "" };
  }
}

/** 2) Generate two quests (title + real-life action) */
async function generateQuests(goal) {
  const prompt = `
The user wants to achieve: "${goal}".
Provide exactly two short "quest" options in a dark fantasy style:
1) Give each quest a 1-line fantasy-themed TITLE (no more than 7 words).
2) Then give a 1-line real-world ACTION (e.g. "Study at the library for 1 hour").

Format: 
Quest 1 Title: ...
Quest 1 Action: ...
Quest 2 Title: ...
Quest 2 Action: ...
`;
  try {
    const res = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    // Basic text parsing:
    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);

    let questsArr = [];
    let questObj = {};

    lines.forEach(line => {
      if (line.toLowerCase().startsWith("quest 1 title:")) {
        questObj = {};
        questObj.title = line.replace(/quest 1 title:/i, "").trim();
      } else if (line.toLowerCase().startsWith("quest 1 action:")) {
        questObj.description = line.replace(/quest 1 action:/i, "").trim();
        questsArr.push({ ...questObj });
      } else if (line.toLowerCase().startsWith("quest 2 title:")) {
        questObj = {};
        questObj.title = line.replace(/quest 2 title:/i, "").trim();
      } else if (line.toLowerCase().startsWith("quest 2 action:")) {
        questObj.description = line.replace(/quest 2 action:/i, "").trim();
        questsArr.push({ ...questObj });
      }
    });

    return { quests: questsArr };
  } catch (error) {
    console.error("Error in generateQuests:", error);
    return { quests: [] };
  }
}

/** 3) Generate 2 images, each with a tarot-style look for the given quest titles */
async function generateImages(quests) {
  // "quests" is an array of { title, description }, so we only need the titles
  const prompt = `
Create two dark fantasy style illustrations, each evoking a tarot-card look for these quest titles:
1) ${quests[0].title}
2) ${quests[1].title}
`;

  try {
    const res = await fetch(`${OPENAI_API_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        n: 2,
        size: "256x256",
      }),
    });
    const data = await res.json();
    const urls = data.data?.map(item => item.url) || [];
    return { urls };
  } catch (error) {
    console.error("Error in generateImages:", error);
    return { urls: [] };
  }
}
