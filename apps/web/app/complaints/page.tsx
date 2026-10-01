'use client';

import { useState } from 'react';
import { ComplaintScreen } from '../../src/features/notices/complaint-screen';

export default function ComplaintPage() {
  const [submitted, set_submitted] = useState<string | null>(null);

  return (
    <>
      <ComplaintScreen
        locale="en"
        status="default"
        target_type="article"
        target_id="018f3c2a-7b10-7c3e-8f21-0000000000a1"
        on_submit={set_submitted}
      />
      {submitted ? <p>Complaint filed</p> : null}
    </>
  );
}
