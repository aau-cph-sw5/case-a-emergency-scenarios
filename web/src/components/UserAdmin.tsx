import { useEffect, useState } from "react";
import { LINE_GROUP_LABELS } from "../../../shared/auth/line-groups";
import { userIdFromToken } from "../../../shared/auth/login";
import type { User } from "../../../shared/types/v1/user";
import {
  createUser,
  deleteUser,
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
export function UserAdmin({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
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
      // The server ended the admin's own session with the edit, so sign out
      // here as the form warned.
      if (user.userId === ownId) {
        onLogout();
        return;
      }
      saved(`${user.username} er gemt.`);
    } catch (error) {
      setFormError(userAdminMessage(error));
    }
  }

  // A disabled user cannot sign in until enabled again; the row stays.
  async function setDisabled(user: User, disabled: boolean) {
    setMessage(null);
    try {
      await updateUser(token, user.userId, { disabled });
      saved(
        disabled
          ? `${user.username} er deaktiveret.`
          : `${user.username} er aktiveret igen.`,
      );
    } catch (error) {
      setMessage(userAdminMessage(error));
    }
  }

  // Deleting cannot be undone from the page, so it is confirmed first.
  async function remove(user: User) {
    if (
      !window.confirm(
        `Slet ${user.username}? Brugeren kan ikke logge ind igen og forsvinder fra listen.`,
      )
    ) {
      return;
    }
    setMessage(null);
    try {
      await deleteUser(token, user.userId);
      saved(`${user.username} er slettet.`);
    } catch (error) {
      setMessage(userAdminMessage(error));
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
              <th>Status</th>
              <th>
                <span className="visually-hidden">Handlinger</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              // A disabled account is faded, and its status says so in words.
              <tr
                key={user.userId}
                className={user.disabled ? "user-disabled" : undefined}
              >
                <td>{user.username}</td>
                <td>{ROLE_LABELS[user.role]}</td>
                <td>{LINE_GROUP_LABELS[user.lineGroup]}</td>
                <td>{user.disabled ? "Deaktiveret" : "Aktiv"}</td>
                <td className="user-actions">
                  <button
                    type="button"
                    onClick={() => open({ kind: "edit", user })}
                  >
                    Rediger
                  </button>
                  {/* An admin cannot disable or delete their own account. */}
                  {user.userId !== ownId && (
                    <>
                      <button
                        type="button"
                        onClick={() => void setDisabled(user, !user.disabled)}
                      >
                        {user.disabled ? "Aktivér" : "Deaktivér"}
                      </button>
                      <button type="button" onClick={() => void remove(user)}>
                        Slet
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
