import { useState } from 'react';
import { BlockScreen } from './block-screen';

export function BlockPreview({ user_id }: { user_id: string }) {
  const [blocked, set_blocked] = useState(false);
  const [status, set_status] = useState<'default' | 'blocked' | 'lifted'>('default');

  return (
    <BlockScreen
      locale="en"
      status={blocked ? 'blocked' : status}
      user_id={user_id}
      blocked={blocked}
      on_block={() => {
        set_blocked(true);
        set_status('blocked');
      }}
      on_lift={() => {
        set_blocked(false);
        set_status('lifted');
      }}
    />
  );
}
