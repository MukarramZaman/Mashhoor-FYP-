# -*- coding: utf-8 -*-
"""Mashhoor campaign assistant — Colab pipeline (guardrail NN + optional Qwen LLM)."""
from __future__ import annotations

import os
import re
import logging
from typing import Any

import numpy as np

logging.getLogger("transformers").setLevel(logging.ERROR)
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

CAMPAIGN_SCHEMA = {
    "campaign_budget": "budget pay cost payout money cash fee compensation payment",
    "campaign_start_date": "start begin launch starting date timeline",
    "campaign_end_date": "end finish deadline conclude ending timeline",
    "target_region": "region location country city pakistan zone where geographic",
    "target_niche": "niche category content type audience vertical",
    "campaign_description": "description overview brief summary about product campaign",
    "influencer_task": "task deliverable deliverables role expected work do content",
    "influencer_requirements": "requirement requirements criteria follower followers trust score min",
    "campaign_objective": "objective goal purpose metrics targets",
    "campaign_name": "campaign name title project",
}

PHRASE_PREFIXES = [
    "what is", "tell me about", "can you share", "i want to know",
    "please show the", "give me details on", "brief me regarding",
]

CAMPAIGN_QUESTIONS = [
    "what is the budget", "how much do you pay", "what is the payout", "is there any compensation",
    "how much money will I get", "what is the fee for this", "compensation details", "payment terms",
    "cost of the campaign", "how much cash", "what do I get paid", "is this paid", "payment amount",
    "when does it start", "start date", "when do we launch", "when is the start", "timeline",
    "schedule", "when should I begin", "start timeline", "launch date", "starting date",
    "when does it end", "what is the deadline", "end date", "when is it finishing", "concluding date",
    "due date", "submission deadline", "when is the last date to submit", "finish date",
    "what region is this for", "which country", "where is this located", "is it for pakistan",
    "target locations", "geographic region", "where do the influencers need to be", "location requirements",
    "what is the niche", "what category", "type of content", "who is the target audience",
    "what is the vertical", "content category", "what topic should I cover", "audience niche",
    "tell me about the campaign", "what is this about", "campaign summary", "describe this project",
    "overview of the campaign", "brand brief", "what is the product", "campaign details",
    "what is my role", "what do I need to do", "what are the deliverables", "what is expected of me",
    "what should I create", "what content do I make", "my task", "influencer deliverables",
    "what is the requirement", "do I need to post a video", "task details", "deliverable requirements",
    "what is the goal", "what is the objective", "purpose of the campaign", "campaign metrics",
    "what are we trying to achieve", "target goals", "key objectives",
    "what is the name of the campaign", "campaign title", "project name", "what is this called"
]

OUT_OF_SCOPE = [
    # Coding & Programming
    "write a python script", "how to code in java", "javascript array map", "css flexbox tutorial",
    "git commit command", "what is a docker container", "how to write a query in sql",
    "what is html and css", "c++ pointers tutorial", "write a bash script", "react hooks guide",
    # Recipes & Cooking
    "how to cook biryani", "recipe for chocolate cake", "how to make lasagna", "ingredients for pizza",
    "how to boil an egg", "chicken karahi recipe", "how to make a cup of coffee", "recipe for pancakes",
    "best chocolate chip cookie recipe", "how to bake bread", "what is the recipe of biryani ??",
    "recipe of biryani", "how to cook rice", "cooking instructions", "ingredients list",
    # Sports & Games
    "who won the cricket match", "cricket score today", "how to play football", "rules of basketball",
    "who is messi", "real madrid score", "formula 1 standings", "ipl match schedule",
    # Politics & News
    "who is the president", "prime minister of pakistan", "elections in the US", "uk government cabinet",
    "stock market news today", "inflation rate updates", "who is the mayor", "world war history",
    # Geography & General Knowledge
    "capital city of spain", "where is Paris located", "population of Tokyo", "height of mount everest",
    "longest river in the world", "how many continents are there", "what is the currency of japan",
    # Weather & Science
    "weather today in Lahore", "will it rain tomorrow", "distance to the moon", "what is global warming",
    "photosynthesis process", "how do volcanoes work", "speed of light value", "periodic table elements",
    # Casual / Chatbot Trivia
    "tell me a joke", "do you have a girlfriend", "who made you", "what is your age", "do you like pizza",
    "tell me a story", "what is the meaning of life", "are you human", "how are you today",
    # Math & Logic
    "what is 2 + 2", "solve for x in 3x+5=20", "square root of 225", "what is pi value",
    "derivative of x squared", "binary conversion", "how to calculate percentage",
    # Health & Fitness
    "how to lose weight fast", "best exercises for abs", "symptoms of flu", "healthy diet plan",
    "benefits of drinking water", "how to get fit", "vitamins for energy"
]


class MashhoorCampaignAssistant:
    def __init__(self) -> None:
        self.embed_model = None
        self.relevance_nn = None
        self.schema_vectors: dict[str, np.ndarray] = {}
        self.llm_pipeline = None
        self._ready = False

    def load(self) -> None:
        if self._ready:
            return

        from sentence_transformers import SentenceTransformer
        import tensorflow as tf

        self.embed_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

        X_phrases: list[str] = []
        y_labels: list[float] = []
        for _key, text in CAMPAIGN_SCHEMA.items():
            for w in text.split():
                for prefix in PHRASE_PREFIXES:
                    X_phrases.append(f"{prefix} {w}")
                    y_labels.append(1.0)
        for q in CAMPAIGN_QUESTIONS:
            X_phrases.append(q)
            y_labels.append(1.0)
            X_phrases.append(q.lower())
            y_labels.append(1.0)
        for noise in OUT_OF_SCOPE:
            X_phrases.append(noise)
            y_labels.append(0.0)
            X_phrases.append(f"what is {noise}")
            y_labels.append(0.0)

        X_emb = self.embed_model.encode(X_phrases, convert_to_numpy=True)
        y_train = np.array(y_labels, dtype=np.float32)

        # Calculate class weights to handle class imbalance
        num_pos = int(sum(y_labels))
        num_neg = len(y_labels) - num_pos
        class_weight = {0: float(num_pos) / max(1, num_neg), 1: 1.0}

        model = tf.keras.Sequential([
            tf.keras.layers.Dense(128, activation="relu", input_shape=(384,)),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(32, activation="relu"),
            tf.keras.layers.Dense(1, activation="sigmoid"),
        ])
        model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["mae"])
        model.fit(X_emb, y_train, epochs=40, batch_size=32, verbose=0, class_weight=class_weight)
        self.relevance_nn = model

        self.schema_vectors = {
            k: self.embed_model.encode(v, convert_to_numpy=True)
            for k, v in CAMPAIGN_SCHEMA.items()
        }

        if os.getenv("MASHHOOR_USE_LLM", "false").lower() == "true":
            self._load_llm()

        self._ready = True

    def _load_llm(self) -> None:
        import torch
        import gc
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

        gc.collect()
        model_id = os.getenv("MASHHOOR_LLM_MODEL", "Qwen/Qwen2.5-3B-Instruct")
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        use_cuda = torch.cuda.is_available()
        llm_model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.float16 if use_cuda else torch.float32,
            device_map="cuda" if use_cuda else "cpu",
            low_cpu_mem_usage=True,
        )
        self.llm_pipeline = pipeline(
            "text-generation",
            model=llm_model,
            tokenizer=tokenizer,
            device_map="cuda" if use_cuda else "cpu",
        )
        self.llm_pipeline.model.generation_config.max_length = None

    def _llm_generate(self, system: str, user: str, max_tokens: int = 120) -> str:
        if not self.llm_pipeline:
            return ""
        prompt = (
            f"<|im_start|>system\n{system}\n"
            f"<|im_start|>user\n{user}\n"
            f"<|im_start|>assistant\n"
        )
        out = self.llm_pipeline(
            prompt,
            max_new_tokens=max_tokens,
            do_sample=True,
            temperature=0.3,
            top_p=0.9,
        )
        text = out[0]["generated_text"][len(prompt) :].strip()
        return re.sub(r"^(assistant:|bot:)", "", text, flags=re.I).strip()

    def _cosine(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

    def run(
        self,
        user_raw: str,
        chat_history: list[dict[str, str]],
        record: dict[str, Any],
    ) -> dict[str, str]:
        self.load()
        raw = user_raw.lower().strip()
        cleaned = re.sub(r"[?!.,#>]", "", raw).strip()
        name = record.get("campaign_name", "Campaign")

        if not cleaned:
            return {"reply": "Please type a valid question regarding the campaign metrics."}

        if cleaned in {"yes", "no", "ok", "okay", "sure", "thanks", "thank you", "great", "understood"}:
            return {
                "reply": "Understood! Please let me know if you have any questions about the campaign budget, timeline, target region, content niche, or deliverables. I'm here to help!",
            }

        user_vec = self.embed_model.encode(cleaned, convert_to_numpy=True)
        greet_vec = self.embed_model.encode("hi hello hey aoa greetings salam", convert_to_numpy=True)
        if self._cosine(user_vec, greet_vec) > 0.45 and len(cleaned.split()) <= 3:
            if self.llm_pipeline:
                sys_inst = (
                    f"You are the virtual manager for '{name}'. Greet professionally and "
                    "invite questions about budget, timeline, location, niche, or deliverables. "
                    "End with: Feel free to ask me any questions you have about this campaign!"
                )
                reply = self._llm_generate(sys_inst, f"The user said: {user_raw}")
                if reply:
                    return {"reply": reply}
            return {
                "reply": (
                    f"Hi there! I'm your Mashhoor assistant for the \"{name}\" campaign. "
                    "I can answer any questions you have regarding the budget, timeline, target region, niche, or deliverables. "
                    "What would you like to know?"
                ),
            }

        rel_score = float(self.relevance_nn(np.expand_dims(user_vec, 0), training=False)[0][0])
        matches = {
            k: self._cosine(user_vec, v) for k, v in self.schema_vectors.items()
        }
        top_field = max(matches, key=matches.get)
        top_sim = matches[top_field]

        if rel_score < 0.52 or top_sim < 0.18:
            if self.llm_pipeline:
                sys_inst = (
                    f"Campaign manager for '{name}'. User asked out-of-scope: '{user_raw}'. "
                    "Politely refuse; only discuss campaign data. "
                    "End with: Let me know if you have any other questions about the campaign!"
                )
                reply = self._llm_generate(sys_inst, "Generate refusal.")
                if reply:
                    return {"reply": reply, "trace": "Out-Of-Scope Guardrail Triggered"}
            return {
                "reply": (
                    f"I can only help with questions related to the \"{name}\" campaign, such as its budget, timeline, niche, or deliverables. "
                    "Let me know if you have any questions about those!"
                ),
                "trace": "Out-Of-Scope Guardrail Triggered",
            }

        asked_budget = any(w in cleaned for w in ["budget", "pay", "cost", "money", "fee", "compensation", "payment"])
        asked_dates = any(w in cleaned for w in ["start", "begin", "launch", "starting", "end", "finish", "deadline", "conclude", "ending", "date", "dates", "timeline", "schedule", "when"])
        asked_region = any(w in cleaned for w in ["region", "location", "where", "country", "city"])
        asked_niche = any(w in cleaned for w in ["niche", "category", "audience"])
        asked_task = any(w in cleaned for w in ["task", "deliverable", "deliverables", "do", "expected", "role", "work"])
        asked_reqs = any(w in cleaned for w in ["requirement", "requirements", "criteria", "follower", "followers", "trust", "score"])
        asked_objective = any(w in cleaned for w in ["objective", "goal", "purpose", "metrics"])
        asked_about = any(w in cleaned for w in ["about", "describe", "summary", "brief", "overview", "product"])

        facts: list[str] = []
        missing_fields: list[str] = []

        if asked_budget:
            val = record.get('campaign_budget', '')
            if val and val != 'N/A' and val != '0':
                facts.append(f"The budget for this campaign is {val}.")
            else:
                missing_fields.append("budget")

        if asked_dates:
            start = record.get('campaign_start_date', '')
            end = record.get('campaign_end_date', '')
            has_start = start and start != 'N/A'
            has_end = end and end != 'N/A'
            if has_start and has_end:
                facts.append(f"The campaign is scheduled to run from {start} to {end}.")
            elif has_start:
                facts.append(f"The campaign is scheduled to start on {start}.")
            elif has_end:
                facts.append(f"The campaign will wrap up by {end}.")
            else:
                missing_fields.append("dates")

        if asked_region:
            val = record.get('target_region', '')
            if val and val != 'N/A':
                facts.append(f"The target region for this campaign is {val}.")
            else:
                missing_fields.append("target region")

        if asked_niche:
            val = record.get('target_niche', '')
            if val and val != 'N/A':
                facts.append(f"The content niche for this campaign is {val}.")
            else:
                missing_fields.append("content niche")

        if asked_task:
            val = record.get('influencer_task', '')
            if val and val != 'N/A':
                facts.append(f"Your expected deliverables are: {val}.")
            else:
                missing_fields.append("deliverables")

        if asked_reqs:
            val = record.get('influencer_requirements', '')
            if val and val != 'N/A':
                facts.append(f"The campaign requirements are: {val}.")
            else:
                missing_fields.append("requirements")

        if asked_objective:
            val = record.get('campaign_objective', '')
            if val and val != 'N/A':
                facts.append(f"The campaign objective is: {val}.")
            else:
                missing_fields.append("objective")

        # If they asked for specific fields, but all of them are missing
        if missing_fields and not facts:
            readable = ", ".join(missing_fields)
            if "deliverables" in missing_fields or "requirements" in missing_fields:
                return {
                    "reply": "I don't have details about the campaign deliverables or requirements on file right now. Would you like to start a real-time chat with the brand to discuss these? Are you interested?",
                    "trace": f"Missing: {readable}",
                }
            return {
                "reply": f"I don't have the details for the campaign {readable} on file at the moment. Let me know if you have other questions!",
                "trace": f"Missing: {readable}",
            }

        # If no specific facts were matched or they asked generally about the campaign
        if not facts or asked_about:
            desc = record.get('campaign_description', '')
            if desc and desc != 'N/A':
                facts.append(f"Here is a quick overview of the campaign: {desc}")
            else:
                facts.append(f"This is the \"{name}\" campaign.")

        facts_text = " ".join(facts)
        if self.llm_pipeline:
            hist = ""
            for turn in chat_history[-3:]:
                hist += f"Influencer: {turn.get('user', '')}\nAssistant: {turn.get('bot', '')}\n"
            sys_inst = (
                f"Brand manager for '{name}'. Answer ONLY using facts: {facts_text}\n{hist}"
                "End cleanly; no open-ended questions. Mention other campaign fields if useful."
            )
            reply = self._llm_generate(
                sys_inst,
                f"Influencer asks: '{user_raw}'. Short professional answer.",
                max_tokens=150,
            )
            if reply:
                return {"reply": reply, "trace": f"Matched: {top_field}"}

        closing_text = (
            f" Let me know if you need details on any other aspect of \"{name}\"!"
            if len(chat_history) > 0
            else " Let me know if you have any other questions about the campaign!"
        )

        return {
            "reply": f"{facts_text}{closing_text}",
            "trace": f"Matched: {top_field}",
        }


_assistant: MashhoorCampaignAssistant | None = None


def get_assistant() -> MashhoorCampaignAssistant:
    global _assistant
    if _assistant is None:
        _assistant = MashhoorCampaignAssistant()
    return _assistant
