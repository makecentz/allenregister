"use client";

import { useState } from "react";
import { ACCOUNT_HOLDER_PARTICIPANT_ID } from "@/lib/participant-constants";

type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  isAccountHolder?: boolean;
};

type ParticipantPickerProps = {
  participants: Participant[];
  accountHolder: { firstName: string; lastName: string } | null;
};

export function ParticipantPicker({
  participants,
  accountHolder,
}: ParticipantPickerProps) {
  const savedParticipants = participants.map((participant) => ({
    ...participant,
    label: `${participant.firstName} ${participant.lastName}${participant.birthDate ? ` · ${participant.birthDate}` : ""}`,
  }));
  const accountHolderIsSaved = savedParticipants.some(
    (participant) => participant.isAccountHolder,
  );
  const choices = [
    ...(!accountHolderIsSaved && accountHolder
      ? [
          {
            id: ACCOUNT_HOLDER_PARTICIPANT_ID,
            firstName: accountHolder.firstName,
            lastName: accountHolder.lastName,
            birthDate: null,
            label: `My profile · ${accountHolder.firstName} ${accountHolder.lastName}`,
          },
        ]
      : []),
    ...savedParticipants,
  ];
  const [participantId, setParticipantId] = useState("");
  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
  });
  const selected = choices.find((participant) => participant.id === participantId);

  return (
    <>
      {choices.length ? (
        <label>
          Choose a household member
          <select
            name="participantId"
            onChange={(event) => setParticipantId(event.target.value)}
            value={participantId}
          >
            <option value="">Add someone new</option>
            {choices.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selected ? (
        <div className="saved-participant-summary" aria-live="polite">
          <p className="eyebrow">Participant selected</p>
          <strong>
            {selected.firstName} {selected.lastName}
          </strong>
          {selected.birthDate ? <span>Born {selected.birthDate}</span> : null}
          <button onClick={() => setParticipantId("")} type="button">
            Choose someone else
          </button>
        </div>
      ) : (
        <div className="new-participant-fields">
          <p className="small-note">
            Add someone new to your household. You will be able to select them
            next time.
          </p>
          <label>
            First name
            <input
              autoComplete="given-name"
              name="firstName"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
              required
              value={draft.firstName}
            />
          </label>
          <label>
            Last name
            <input
              autoComplete="family-name"
              name="lastName"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
              required
              value={draft.lastName}
            />
          </label>
          <label>
            Date of birth <span>(recommended for youth programs)</span>
            <input
              name="birthDate"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  birthDate: event.target.value,
                }))
              }
              type="date"
              value={draft.birthDate}
            />
          </label>
        </div>
      )}
    </>
  );
}
