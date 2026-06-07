-- Allow participants (organizer or joined player) to delete their own chat threads.
-- Also allow deleting messages in a thread the user can delete.

-- chat_threads: participants can delete threads they are part of
DROP POLICY IF EXISTS "chat_threads: participant delete" ON chat_threads;
CREATE POLICY "chat_threads: participant delete" ON chat_threads
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id AND (
        m.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM match_participants mp
          WHERE mp.match_id = m.id
            AND mp.profile_id = auth.uid()
            AND mp.status = 'joined'
        )
      )
    )
  );

-- chat_messages: allow deleting all messages in a thread the user can delete
DROP POLICY IF EXISTS "chat_messages: thread participant delete" ON chat_messages;
CREATE POLICY "chat_messages: thread participant delete" ON chat_messages
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_threads ct
      JOIN matches m ON m.id = ct.match_id
      WHERE ct.id = thread_id AND (
        m.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM match_participants mp
          WHERE mp.match_id = m.id
            AND mp.profile_id = auth.uid()
            AND mp.status = 'joined'
        )
      )
    )
  );

NOTIFY pgrst, 'reload schema';
