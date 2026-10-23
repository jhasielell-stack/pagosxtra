import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types';
import type { Profile } from '@/types';
import { Send, Paperclip, FileText, Download } from 'lucide-react';

interface RequestChatProps {
  requestId: string;
  profile: Profile;
}

export default function RequestChat({ requestId, profile }: RequestChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('request_comments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setMessages(data as ChatMessage[]);
    }
    setLoadingMessages(false);
  }, [requestId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!text.trim() && !file) return;
    setLoading(true);

    let filePath: string | null = null;
    let fileName: string | null = null;

    if (file) {
      const ext = file.name.split('.').pop();
      const uniqueName = `chat-${requestId}-${Date.now()}.${ext}`;
      const path = `chat/${profile.id}/${uniqueName}`;
      const { error: uploadError } = await supabase.storage.from('payment-files').upload(path, file);
      if (uploadError) {
        setLoading(false);
        return;
      }
      filePath = path;
      fileName = file.name;
    }

    const { data } = await supabase
      .from('request_comments')
      .insert({
        request_id: requestId,
        user_id: profile.id,
        user_name: profile.full_name,
        user_role: profile.role,
        message: text.trim() || null,
        file_path: filePath,
        file_name: fileName,
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) => [...prev, data as ChatMessage]);
    }

    setText('');
    setFile(null);
    setLoading(false);
  }

  async function getSignedUrl(path: string): Promise<string | null> {
    const { data } = await supabase.storage.from('payment-files').createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  }

  const isAdmin = profile.role === 'administrador' || profile.role === 'aprobador';

  return (
    <div className="bg-neutral-950 rounded-xl border border-neutral-800">
      <div className="px-4 py-3 border-b border-neutral-800">
        <h4 className="text-sm font-semibold text-white">Conversación</h4>
        <p className="text-xs text-neutral-500">Mensajes y documentos entre solicitante y administrador</p>
      </div>

      <div ref={scrollRef} className="px-4 py-4 space-y-3 max-h-64 overflow-y-auto">
        {loadingMessages ? (
          <p className="text-center text-neutral-500 text-sm">Cargando mensajes...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-neutral-600 text-sm py-4">Sin mensajes aún. Inicie la conversación.</p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === profile.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${isOwn ? 'bg-pink-600/20 border border-pink-500/30' : 'bg-neutral-800 border border-neutral-700'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-neutral-300">{msg.user_name}</span>
                    {isAdmin && msg.user_role !== 'administrador' && msg.user_role !== 'aprobador' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">Solicitante</span>
                    )}
                  </div>
                  {msg.message && <p className="text-sm text-neutral-200">{msg.message}</p>}
                  {msg.file_path && (
                    <FileAttachmentButton
                      filePath={msg.file_path}
                      fileName={msg.file_name ?? 'Documento'}
                      getSignedUrl={getSignedUrl}
                    />
                  )}
                </div>
                <span className="text-[10px] text-neutral-600 mt-0.5">
                  {new Date(msg.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer shrink-0">
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center text-neutral-400 transition-colors">
              <Paperclip className="w-4 h-4" />
            </div>
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escriba un mensaje..."
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={loading || (!text.trim() && !file)}
            className="shrink-0 w-9 h-9 rounded-lg bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {file && (
          <div className="mt-2 flex items-center gap-2 text-xs text-pink-400">
            <FileText className="w-3.5 h-3.5" />
            <span>{file.name}</span>
            <button onClick={() => setFile(null)} className="text-neutral-500 hover:text-neutral-300 ml-1">Quitar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FileAttachmentButton({
  filePath,
  fileName,
  getSignedUrl,
}: {
  filePath: string;
  fileName: string;
  getSignedUrl: (path: string) => Promise<string | null>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSignedUrl(filePath).then((u) => { setUrl(u); setLoading(false); });
  }, [filePath, getSignedUrl]);

  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
        <FileText className="w-4 h-4" />
        <span>Cargando archivo...</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
        <FileText className="w-4 h-4" />
        <span>{fileName}</span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-2 text-xs bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 px-3 py-1.5 rounded-lg border border-pink-500/20 transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      {fileName}
    </a>
  );
}
