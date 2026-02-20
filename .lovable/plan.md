
## ICU → Ward Transfer Workflow Redesign

### What's Changing

Currently the ICU page has a "Discharge" button (via the `DischargeSummary` component) that simultaneously marks the patient as discharged from ICU AND silently creates a ward record in the background. The user wants to make this a two-step, explicit process:

1. ICU → **Move to Ward** (explicit button, with bed selection)
2. Ward → **Discharge** (final discharge from the system, already exists in `Ward.tsx`)

The `DischargeSummary` component (which also generates the PDF) should be retained but renamed/repurposed as a "Transfer to Ward" action.

---

### Changes Required

**`src/pages/ICU.tsx`**

- Remove the `DischargeSummary` component import and usage from the actions column.
- Remove the `dischargeMutation` that currently fires the combined discharge + ward-insert.
- Add a **"Move to Ward"** button in the actions column that opens a confirmation/transfer dialog.
- The transfer dialog will:
  - Show the patient name and current ICU bed.
  - Allow selection of an available **ward bed** (W-101 to W-205).
  - Have a text field for transfer notes (e.g., "Stable, ready for step-down").
  - On confirm: update `icu_admissions.status = 'transferred'` and `discharged_at = now()`, then insert into `ward_admissions` with `source = 'icu_discharge'`.
- Add a new `transferToWardMutation` to handle the two-step database write atomically.
- Keep the "Add Note" and "View" (progress notes) buttons as-is.
- Update the stat card label from "discharged" language to reflect the new flow.

**`src/components/icu/DischargeSummary.tsx`**

- The PDF generation logic inside this component is valuable and should be kept.
- The "Discharge" button trigger on line 388 will be replaced — the component will be adapted so the "Transfer to Ward" dialog in ICU.tsx triggers the PDF download **separately** (as an "Export Summary" button) rather than being the discharge gate.
- Alternatively, keep the component as a standalone "Export ICU Summary" button (not tied to discharge action), so staff can still print the ICU clinical summary at any time without it triggering a transfer.

**`src/pages/Ward.tsx`**

- No structural changes needed — it already handles discharge correctly and shows patients from all sources including `icu_discharge`.
- The "Discharge" button in Ward remains the final discharge point.

---

### New Flow Diagram

```text
ICU Admitted
     │
     ├── [Add Note]  ──► Progress notes recorded
     ├── [View]      ──► View all ICU notes
     ├── [Export Summary] ──► PDF of ICU clinical record (no transfer)
     └── [Move to Ward] ──► Opens Transfer Dialog
                                │
                          Select Ward Bed
                          Add Transfer Notes
                          Confirm
                                │
                   icu_admissions → status: 'transferred'
                   ward_admissions → source: 'icu_discharge'
                                │
                         Ward Module
                                │
                         [Discharge] ──► Final discharge from system
```

---

### Technical Implementation Details

**New `transferToWardMutation` in ICU.tsx:**
```typescript
const transferToWardMutation = useMutation({
  mutationFn: async ({ admissionId, wardBed, notes }) => {
    // Step 1: Mark ICU admission as transferred
    await supabase.from('icu_admissions')
      .update({ status: 'transferred', discharged_at: new Date().toISOString() })
      .eq('id', admissionId);

    // Step 2: Create ward admission
    await supabase.from('ward_admissions').insert({
      patient_id: admission.patient_id,
      surgery_id: admission.surgery_id || null,
      icu_admission_id: admissionId,
      admitted_by: user?.id,
      bed_number: wardBed || null,
      admission_reason: notes || `ICU step-down: ${admission.admission_reason}`,
      source: 'icu_discharge',
      status: 'admitted',
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['icu-admissions'] });
    queryClient.invalidateQueries({ queryKey: ['ward-admissions'] });
    toast.success('Patient transferred to Ward successfully');
    setTransferDialogOpen(false);
  }
});
```

**Ward bed list** (already defined in Ward.tsx, will be duplicated in ICU.tsx for the selection):
```
W-101 through W-110, W-201 through W-205
```

**ICU admission query** will continue to filter `status = 'admitted'` — so transferred patients disappear from the ICU list automatically once the transfer is confirmed.

**The `DischargeSummary` component** will be repurposed as a standalone "Export ICU Summary" button that opens the PDF preview dialog without triggering any database write — it will no longer be the discharge mechanism.

---

### Summary of Files to Edit

| File | Change |
|---|---|
| `src/pages/ICU.tsx` | Remove discharge mutation, add "Move to Ward" dialog + transfer mutation, repurpose DischargeSummary as export-only |
| `src/components/icu/DischargeSummary.tsx` | Remove `onDischarge`/`isDischarging` props and the discharge button from the dialog footer — make it export-only |
| `src/pages/Ward.tsx` | No changes needed |
