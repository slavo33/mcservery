
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  screenshot_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Users can create bug reports
CREATE POLICY "Authenticated users can create bug reports"
  ON public.bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own bug reports
CREATE POLICY "Users can view own bug reports"
  ON public.bug_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Admins can view all bug reports
CREATE POLICY "Admins can view all bug reports"
  ON public.bug_reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update bug reports
CREATE POLICY "Admins can update bug reports"
  ON public.bug_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete bug reports
CREATE POLICY "Admins can delete bug reports"
  ON public.bug_reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for bug screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bug screenshots
CREATE POLICY "Authenticated users can upload bug screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bug-screenshots');

CREATE POLICY "Anyone can view bug screenshots"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bug-screenshots');

CREATE POLICY "Admins can delete bug screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bug-screenshots' AND public.has_role(auth.uid(), 'admin'));
