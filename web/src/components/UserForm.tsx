import { useState, type FormEvent } from "react";
import {
  LINE_GROUP_LABELS,
  LINE_GROUPS,
  type LineGroup,
} from "../../../shared/auth/line-groups";
import { ROLES, type Role } from "../../../shared/auth/roles";
import type { User } from "../../../shared/types/v1/user";
import type { UserUpdate } from "../../../shared/types/v1/user-update";
import { ROLE_LABELS } from "../users";

export type UserFormValues = {
  username: string;
  password: string;
  role: Role;
  lineGroup: LineGroup;
};

// The same rule as user-create.schema.json and user-update.schema.json.
const MIN_PASSWORD_LENGTH = 12;

function invalidReason(values: UserFormValues, creating: boolean) {
  if (creating && values.username.trim() === "") {
    return "Udfyld brugernavnet.";
  }
  if (creating && values.password === "") return "Udfyld adgangskoden.";
  // An empty password when editing keeps the current one.
  if (values.password === "") return null;
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    return `Adgangskoden skal være mindst ${MIN_PASSWORD_LENGTH} tegn.`;
  }
  if (!/[0-9]/.test(values.password)) {
    return "Adgangskoden skal indeholde mindst ét tal.";
  }
  return null;
}
export function UserForm({
  editing,
  isSelf = false,
  error = null,
  onSubmit,
  onCancel,
}: {
  editing?: User;
  isSelf?: boolean;
  error?: string | null;
  onSubmit: (values: UserFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<UserFormValues>({
    username: editing?.username ?? "",
    password: "",
    role: editing?.role ?? "OPERATOR",
    lineGroup: editing?.lineGroup ?? "M1_M2",
  });
  const [saving, setSaving] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const shownError = invalid ?? error;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const reason = invalidReason(values, editing === undefined);
    setInvalid(reason);
    if (reason) return;
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="user-form"
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      <label>
        Brugernavn
        <input
          value={values.username}
          disabled={editing !== undefined}
          required
          onChange={(event) =>
            setValues({ ...values, username: event.target.value })
          }
        />
      </label>
      <label>
        Adgangskode
        <input
          type="password"
          value={values.password}
          minLength={MIN_PASSWORD_LENGTH}
          required={editing === undefined}
          placeholder={editing ? "Lad stå tom for at beholde" : undefined}
          onChange={(event) =>
            setValues({ ...values, password: event.target.value })
          }
        />
      </label>
      <label>
        Rolle
        <select
          value={values.role}
          disabled={isSelf}
          onChange={(event) =>
            setValues({ ...values, role: event.target.value as Role })
          }
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Linjegruppe
        <select
          value={values.lineGroup}
          onChange={(event) =>
            setValues({
              ...values,
              lineGroup: event.target.value as LineGroup,
            })
          }
        >
          {LINE_GROUPS.map((group) => (
            <option key={group} value={group}>
              {LINE_GROUP_LABELS[group]}
            </option>
          ))}
        </select>
      </label>
      {isSelf && (
        <p className="user-form-note">
          Når du gemmer, bliver du logget ud og skal logge ind igen.
        </p>
      )}
      {shownError && <p role="alert">{shownError}</p>}
      <div className="user-form-actions">
        <button type="submit" disabled={saving}>
          {editing ? "Gem ændringer" : "Opret bruger"}
        </button>
        <button type="button" onClick={onCancel}>
          Annullér
        </button>
      </div>
    </form>
  );
}

// Only the fields that changed, so an unchanged role is not sent.
export function changesFrom(user: User, values: UserFormValues): UserUpdate {
  return {
    ...(values.password !== "" ? { password: values.password } : {}),
    ...(values.role !== user.role ? { role: values.role } : {}),
    ...(values.lineGroup !== user.lineGroup
      ? { lineGroup: values.lineGroup }
      : {}),
  };
}
