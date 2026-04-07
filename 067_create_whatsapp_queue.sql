CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message_id text,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status_created_at
  ON public.whatsapp_queue (status, created_at);

ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages whatsapp queue" ON public.whatsapp_queue;
CREATE POLICY "Service role manages whatsapp queue"
  ON public.whatsapp_queue
  USING (true)
  WITH CHECK (true);
