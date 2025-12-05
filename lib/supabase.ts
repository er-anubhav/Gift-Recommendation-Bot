import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ChatMessage {
  id?: string;
  session_id: string;
  role: "user" | "bot";
  content: string;
  created_at?: string;
}

/**
 * Retrieves chat history for a given session
 * @param sessionId - The session ID to retrieve messages for
 * @returns Array of chat messages or null if error
 */
export const getHistory = async (sessionId: string) => {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching chat history:", error);
      return null;
    }

    return data as ChatMessage[];
  } catch (error) {
    console.error("Unexpected error fetching chat history:", error);
    return null;
  }
};

/**
 * Saves a message to the chat history
 * @param sessionId - The session ID
 * @param role - The role of the sender ("user" or "bot")
 * @param content - The message content
 * @returns The inserted message or null if error
 */
export const saveMessage = async (
  sessionId: string,
  role: "user" | "bot",
  content: string
) => {
  try {
    const { data, error } = await supabase.from("chat_messages").insert([
      {
        session_id: sessionId,
        role,
        content,
      },
    ]);

    if (error) {
      console.error("Error saving message:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error saving message:", error);
    return null;
  }
};
