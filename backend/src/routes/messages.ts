import { Router } from "express";
import {
  getConversations,
  getMessages,
  sendMessage,
  askCampaignAssistant,
  deleteConversation,
} from "../controllers/messageController";
import { protect } from "../middleware/auth";

const router = Router();

// ⚠️  FIXED: /conversations and /send MUST come before /:conversationId
// otherwise Express matches them as conversation ids

router.get("/conversations", protect, getConversations);
router.post("/send", protect, sendMessage);
router.post("/:conversationId/ask-assistant", protect, askCampaignAssistant);

router.get("/:conversationId", protect, getMessages);
router.delete("/:conversationId", protect, deleteConversation);

export default router;
