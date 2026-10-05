# Controlled Sanity change-impact drill

Run this administrator-only verification from the local checkout while the live app is available at http://localhost:3333. It uses the existing authorized CLI session in process memory. It creates no token, grants, scheduled work, public controls, or paid service.

The script defaults to a local preview:

```powershell
. .\scripts\env.ps1
$env:NEXT_PUBLIC_SANITY_PROJECT_ID = 'o3jy1zm6'
$env:NEXT_PUBLIC_SANITY_DATASET = 'production'
node .\node_modules\sanity\bin\sanity exec scripts/verify-change-impact.ts --with-user-token
```

For an authorized coordinated run, append `-- --run`. Keep the application server available and coordinate other editors while the drill temporarily changes June and Leila's published recording policy. It refuses to overwrite an existing draft or a changed source revision.

The drill:

1. Opens a private, explicitly labeled fictional review for June and Leila with Iona and Orin. It records the required answers, plan, and three individual consents, then completes a genuine native care review bound to that placement revision.
2. Creates an unpublished household draft with an active-camera policy. Anonymous content and recommendations must remain unchanged.
3. Publishes using `sanity.action.document.publish`, supplying both `ifDraftRevisionId` and `ifPublishedRevisionId`. Active recording must trigger Orin's camera-free boundary, suppress fit scores, and prevent the earlier approved case from advancing.
4. Changes the recording policy to unknown. The result must request information and recording agreement, without treating uncertainty as permission or as a proven hard conflict.
5. Restores the exact original household facts. Fit may recover, but the changed source revision must keep the old agreement invalid. Explicitly refreshing the case must clear answers and consent; the earlier native approval must fail for the new placement revision.
6. Closes the test review and verifies exact original source content, no temporary draft, and no anonymous access to private case, audit, or workflow records.

Results are saved to change-impact-verification.json. A source-only recovery copy is kept under `.tmp/change-impact-<run-id>.json`; it contains no credentials. The final source revision advances even when its business values are restored.

This is real Content Lake, Actions, native Workflows, and application API verification. It does not claim that signed-in App SDK browser controls were exercised. Native workflow guards are advisory; the API independently checks current facts and consent, and Content Lake permissions protect private documents. A narrow race remains between reading independently editable source documents and committing the revision-guarded placement/audit transaction.

References: [drafts and published documents](https://www.sanity.io/docs/content-lake/drafts-and-versions), [official publish-action client reference](https://reference.sanity.io/_sanity/client/), [workflow enforcement boundaries](https://www.sanity.io/docs/workflows/actors-and-enforcement).
The raw verification report and local recovery copies are operational evidence and are excluded from the proposed public repository. The README, architecture summary and About registry explorer describe the completed result.
