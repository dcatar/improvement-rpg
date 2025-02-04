// Replace with your Netlify function endpoint
// Example: if your site is at https://my-netlify-demo.netlify.app,
// the function URL might be https://my-netlify-demo.netlify.app/.netlify/functions/generate
const NETLIFY_FUNCTION_URL = "https://<YOUR_NETLIFY_SITE>.netlify.app/.netlify/functions/generate";

const goalInput = document.getElementById("goal-input");
const generateQuestsBtn = document.getElementById("generate-quests-btn");
const spinner = document.getElementById("spinner");
const storySection = document.getElementById("story-section");
const storyTextElem = document.getElementById("story-text");
const cardsContainer = document.getElementById("cards-container");

generateQuestsBtn.addEventListener("click", async () => {
  const userGoal = goalInput.value.trim();
  if (!userGoal) {
    alert("Please enter your goal before generating quests.");
    return;
  }

  showSpinner();

  try {
    // 1) Get Intro
    const introData = await postToFunction({ requestType: "intro", goal: userGoal });
    storyTextElem.textContent = introData?.text || "No intro available.";
    storySection.style.display = "block";

    // 2) Get Quests
    const questsData = await postToFunction({ requestType: "quests", goal: userGoal });
    const quests = questsData?.quests || [];

    if (quests.length < 2) {
      alert("Failed to generate two quests. Try again!");
      return;
    }

    // 3) Get Images for Quests
    const imageData = await postToFunction({ requestType: "images", quests });
    const urls = imageData?.urls || [];

    renderQuestCards(quests, urls);
    cardsContainer.style.display = "flex";

  } catch (err) {
    console.error(err);
    alert("Something went wrong. Check console for details.");
  } finally {
    hideSpinner();
  }
});

/** Helper to call the Netlify function with JSON body */
async function postToFunction(bodyObject) {
  const response = await fetch(NETLIFY_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObject),
  });
  if (!response.ok) {
    throw new Error(`Function returned an error: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

/** Show the spinner */
function showSpinner() {
  spinner.style.display = "block";
}

/** Hide the spinner */
function hideSpinner() {
  spinner.style.display = "none";
}

/** Render the two quest cards */
function renderQuestCards(quests, imageUrls) {
  cardsContainer.innerHTML = "";
  for (let i = 0; i < quests.length; i++) {
    const quest = quests[i];
    const imageUrl = imageUrls[i];

    const card = document.createElement("div");
    card.classList.add("quest-card");

    // Quest image
    const img = document.createElement("img");
    img.src = imageUrl || "";
    img.alt = quest.title;
    card.appendChild(img);

    // Quest title
    const titleElem = document.createElement("h3");
    titleElem.textContent = quest.title;
    card.appendChild(titleElem);

    // Quest real-life description
    const descElem = document.createElement("p");
    descElem.textContent = quest.description;
    card.appendChild(descElem);

    // Select button
    const selectBtn = document.createElement("button");
    selectBtn.classList.add("select-btn");
    selectBtn.textContent = "Choose This Quest";
    selectBtn.addEventListener("click", () => {
      alert(`You chose: "${quest.title}"\nNow do: ${quest.description}`);
    });
    card.appendChild(selectBtn);

    cardsContainer.appendChild(card);
  }
}
