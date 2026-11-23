import { useEffect, useState } from "react";
import { LINE_GROUP_LABELS } from "../../../shared/auth/line-groups";
import { userIdFromToken } from "../../../shared/auth/login";
import type { User } from "../../../shared/types/v1/user";
import {
  createUser,
  fetchUsers,
  ROLE_LABELS,
  updateUser,
  userAdminMessage,
} from "../users";
import { changesFrom, UserForm, type UserFormValues } from "./UserForm";
import "./UserAdmin.css";

// The open form, if any: creating a user or editing one.
type OpenForm = { kind: "create" } | { kind: "edit"; user: User } | null;

// The "Brugere" page: every account, and a form to create or edit one.
export function UserAdmin({ token }: { token: string }) {
  const ownId = Number(userIdFromToken(token));
  const [users, setUsers] = useState<User[] | null>(null);
  const [form, setForm] = useState<OpenForm>(null);
  // What the last saved change did, shown above the list.
  const [message, setMessage] = useState<string | null>(null);
  // Why the open form could not be saved, shown in the form.
  const [formError, setFormError] = useState<string | null>(null);
  // Raised after a change, so the list is fetched again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(token, controller.signal).then(setUsers, (error: unknown) => {
      if (!controller.signal.aborted) setMessage(userAdminMessage(error));
    });
    return () => controller.abort();
  }, [token, version]);

  function open(next: OpenForm) {
    setForm(next);
    setFormError(null);
    setMessage(null);
  }

  function saved(text: string) {
    setForm(null);
    setMessage(text);
    setVersion((current) => current + 1);
  }

  async function create(values: UserFormValues) {
    setFormError(null);
    try {
      await createUser(token, values);
      saved(`${values.username} er oprettet.`);
    } catch (error) {
      setFormError(userAdminMessage(error));
    }
  }

  async function save(user: User, values: UserFormValues) {
    const changes = changesFrom(user, values);
    if (Object.keys(changes).length === 0) {
      setForm(null);
      return;
    }
    setFormError(null);
    try {
      await updateUser(token, user.userId, changes);
      saved(`${user.username} er gemt.`);
    } catch (error) {
      setFormError(userAdminMessage(error));
    }
  }

  return (
    <section className="user-admin" aria-labelledby="users-heading">
      <h2 id="users-heading">Brugere</h2>
      {message && <p role="status">{message}</p>}

      {form === null && (
        <button type="button" onClick={() => open({ kind: "create" })}>
          Ny bruger
        </button>
      )}
      {form?.kind === "create" && (
        <>
          <h3>Opret bruger</h3>
          <UserForm
            error={formError}
            onSubmit={create}
            onCancel={() => setForm(null)}
          />
        </>
      )}
      {form?.kind === "edit" && (
        <>
          <h3>Rediger {form.user.username}</h3>
          <UserForm
            key={form.user.userId}
            editing={form.user}
            isSelf={form.user.userId === ownId}
            error={formError}
            onSubmit={(values) => save(form.user, values)}
            onCancel={() => setForm(null)}
          />
        </>
      )}

      {users === null ? (
        <p>Henter brugere…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Brugernavn</th>
              <th>Rolle</th>
              <th>Linjegruppe</th>
              <th>
                <span className="visually-hidden">Handlinger</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.userId}>
                <td>{user.username}</td>
                <td>{ROLE_LABELS[user.role]}</td>
                <td>{LINE_GROUP_LABELS[user.lineGroup]}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => open({ kind: "edit", user })}
                  >
                    Rediger
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
