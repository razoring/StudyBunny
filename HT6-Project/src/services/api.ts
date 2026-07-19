const API_BASE_URL = 'http://localhost:8000';

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
}

export interface FocusEvent {
  user_id: string;
  document_id: string;
  focus: number;
  distraction: number;
  struggling: number;
  mood: string;
  mood_confidence: number;
  tiredness: number;
  talking: boolean;
  timestamp?: string;
}

export interface ChatMessage {
  id: string;
  quest_id: string;
  role: 'user' | 'avatar';
  text: string;
  created_at: string;
}

//////////////// QUEST INFORMATION EXPORTS 
export interface Quest {
  id: string;
  document_id: string;
  user_id: string;
  title: string;
  summary: string;
  order: number;
  status: "locked" | "active" | "done";
}


///////////////

export const api = {
  async listDocuments(userId?: string): Promise<Document[]> {
    const url = userId ? `${API_BASE_URL}/documents?user_id=${userId}` : `${API_BASE_URL}/documents`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async getDocument(documentId: string): Promise<Document> {
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}`);
    if (!res.ok) throw new Error('Failed to fetch document details');
    return res.json();
  },

  async uploadDocument(userId: string, file: File): Promise<{ document_id: string; status: string }> {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },

  async sendFocusEvent(event: FocusEvent): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE_URL}/focus/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Failed to send focus event');
    return res.json();
  },

  async getFocusHistory(documentId: string): Promise<FocusEvent[]> {
    const res = await fetch(`${API_BASE_URL}/focus/history/${documentId}`);
    if (!res.ok) throw new Error('Failed to fetch focus history');
    return res.json();
  },

  async sendChatMessage(
    questId: string,
    documentId: string,
    userId: string,
    message: string
  ): Promise<{ reply: string; source_chunks: string[] }> {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_id: questId, document_id: documentId, user_id: userId, message }),
    });
    if (!res.ok) throw new Error('Failed to send chat message');
    return res.json();
  },

  async getChatHistory(documentId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE_URL}/chat/history/${documentId}`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async injectChatMessage(
    questId: string,
    documentId: string,
    message: string
  ): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE_URL}/chat/inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_id: questId, document_id: documentId, message }),
    });
    if (!res.ok) throw new Error('Failed to inject chat message');
    return res.json();
  },


  //Working, hope it doesnt break the website 
  //fetching quest list 
  async listQuests(documentId: string): Promise<Quest[]> {
    const res = await fetch(`${API_BASE_URL}/quests/document/${documentId}`);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
  },

  async completeQuest(questId: string): Promise<Quest> {
    const res = await fetch(`${API_BASE_URL}/quests/${questId}/complete`, {
      method: "PATCH",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
  },
  


};
