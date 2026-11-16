import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { AdminDashboard } from "../../web/src/AdminDashboard";
import type { User } from "../../shared/types/v1/user";

jest.mock("../../web/src/components/UserAdmin.css", () => ({}));

// The admin is user 1; the token only needs its claims for the page.
const token = `header.${btoa(JSON.stringify({ userId: 1, role: "ADMIN" }))}.signature`;
const admin: User = {
  userId: 1,
  username: "admin",
  role: "ADMIN",
  lineGroup: "M1_M2",
};
const operator: User = {
  userId: 2,
  username: "operator",
  role: "OPERATOR",
  lineGroup: "M1_M2",
};

const fetchMock = jest.fn<typeof fetch>();
let originalFetch: typeof fetch;
let container: HTMLDivElement;
let root: Root;
let users: User[];

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function requests(method: string) {
  return fetchMock.mock.calls.filter(
    ([, init]) => (init?.method ?? "GET") === method,
  );
}

function sentBody(method: string) {
  const [, init] = requests(method).at(-1)!;
  return JSON.parse(String(init?.body));
}

// Opens the Brugere page from the admin's front page.
async function mount() {
  await act(async () =>
    root.render(<AdminDashboard token={token} onLogout={() => {}} />),
  );
  await click("Brugere");
}

// React tracks input values itself, so the value is set through the native
// setter before the event, as a browser would.
async function type(label: string, value: string) {
  await act(async () => {
    const input = field<HTMLInputElement>(label);
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function choose(label: string, value: string) {
  await act(async () => {
    const select = field<HTMLSelectElement>(label);
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function field<T extends HTMLElement>(label: string): T {
  const found = [...container.querySelectorAll("label")].find((element) =>
    element.textContent?.startsWith(label),
  );
  return found!.querySelector("input, select") as T;
}

function button(text: string) {
  return [...container.querySelectorAll("button")].find(
    (element) => element.textContent === text,
  )!;
}

async function click(text: string) {
  await act(async () => button(text).click());
}

function status() {
  return container.querySelector("[role=status]")?.textContent;
}

function formAlert() {
  return container.querySelector(".user-form [role=alert]")?.textContent;
}

function formHeading() {
  return container.querySelector("h3")?.textContent;
}

async function editRow(index: number) {
  const row = container.querySelectorAll("tbody tr")[index];
  await act(async () => row.querySelector("button")!.click());
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  users = [admin, operator];
  originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, init) => {
    const method = init?.method ?? "GET";
    if (path === "/api/v1/users" && method === "GET") return response(users);
    if (path === "/api/v1/users" && method === "POST") {
      const created = { userId: 3, ...JSON.parse(String(init?.body)) };
      delete created.password;
      users = [...users, created];
      return response(created, 201);
    }
    const match = String(path).match(/^\/api\/v1\/users\/(\d+)$/);
    if (match && method === "PATCH") {
      const changes = JSON.parse(String(init?.body));
      delete changes.password;
      users = users.map((user) =>
        user.userId === Number(match[1]) ? { ...user, ...changes } : user,
      );
      return response(users.find((user) => user.userId === Number(match[1])));
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("the Brugere page (MET-A-030)", () => {
  it("starts on the front page and goes back to it", async () => {
    await act(async () =>
      root.render(<AdminDashboard token={token} onLogout={() => {}} />),
    );
    expect(container.querySelector("h1")?.textContent).toBe("Admin");
    expect(container.querySelector("table")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    await click("Brugere");
    expect(container.querySelector("h2")?.textContent).toBe("Brugere");
    await click("Tilbage");
    expect(container.querySelector("h2")).toBeNull();
    expect(button("Brugere")).toBeTruthy();
  });

  it("lists every account with its role and line group", async () => {
    await mount();
    const rows = [...container.querySelectorAll("tbody tr")].map((row) =>
      [...row.querySelectorAll("td")]
        .slice(0, 3)
        .map((cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ["admin", "Administrator", "M1/M2"],
      ["operator", "Operatør", "M1/M2"],
    ]);
    expect(requests("GET")[0][1]?.headers).toEqual({
      Authorization: `Bearer ${token}`,
    });
  });

  it("opens the create form from a button and closes it on cancel", async () => {
    await mount();
    expect(container.querySelector("form")).toBeNull();
    await click("Ny bruger");
    expect(formHeading()).toBe("Opret bruger");
    await click("Annullér");
    expect(container.querySelector("form")).toBeNull();
  });

  it("asks in Danish for a username and a password of at least 8 characters", async () => {
    await mount();
    await click("Ny bruger");
    await click("Opret bruger");
    expect(formAlert()).toBe("Udfyld brugernavnet.");

    await type("Brugernavn", "new-steward");
    await click("Opret bruger");
    expect(formAlert()).toBe("Udfyld adgangskoden.");

    await type("Adgangskode", "1234567");
    await click("Opret bruger");
    expect(formAlert()).toBe("Adgangskoden skal være mindst 8 tegn.");
    // Nothing is sent until the fields are valid.
    expect(requests("POST")).toHaveLength(0);
  });

  it("creates a user, closes the form and shows the user in the list", async () => {
    await mount();
    await click("Ny bruger");
    await type("Brugernavn", "new-steward");
    await type("Adgangskode", "a-long-password");
    await choose("Rolle", "STEWARD");
    await choose("Linjegruppe", "M3_M4");
    await click("Opret bruger");

    expect(sentBody("POST")).toEqual({
      username: "new-steward",
      password: "a-long-password",
      role: "STEWARD",
      lineGroup: "M3_M4",
    });
    expect(status()).toBe("new-steward er oprettet.");
    expect(container.querySelector("tbody")?.textContent).toContain(
      "new-steward",
    );
    expect(container.querySelector("form")).toBeNull();
    expect(button("Ny bruger")).toBeTruthy();
  });

  it("says in Danish in the open form when the username is taken", async () => {
    const normalFetch = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (path, init) =>
      init?.method === "POST"
        ? response(
            {
              error: {
                code: "E0007",
                message: "The username is already taken",
              },
            },
            409,
          )
        : normalFetch(path, init),
    );
    await mount();
    await click("Ny bruger");
    await type("Brugernavn", "operator");
    await type("Adgangskode", "a-long-password");
    await click("Opret bruger");

    expect(formAlert()).toBe("Brugernavnet findes allerede.");
    // The form stays open with the values, so the admin can pick another name.
    expect(field<HTMLInputElement>("Brugernavn").value).toBe("operator");
  });

  it("shows an account's current values, without the password, when editing", async () => {
    await mount();
    await editRow(1);

    expect(formHeading()).toBe("Rediger operator");
    const username = field<HTMLInputElement>("Brugernavn");
    expect(username.value).toBe("operator");
    expect(username.disabled).toBe(true);
    expect(field<HTMLInputElement>("Adgangskode").value).toBe("");
    // An empty password keeps the current one.
    expect(field<HTMLInputElement>("Adgangskode").required).toBe(false);
    expect(field<HTMLSelectElement>("Rolle").value).toBe("OPERATOR");
    expect(field<HTMLSelectElement>("Linjegruppe").value).toBe("M1_M2");
  });

  it("refuses a new password under 8 characters when editing", async () => {
    await mount();
    await editRow(1);
    await type("Adgangskode", "short");
    await click("Gem ændringer");
    expect(formAlert()).toBe("Adgangskoden skal være mindst 8 tegn.");
    expect(requests("PATCH")).toHaveLength(0);
  });

  it("sends only the changed fields, closes the form and shows the saved values", async () => {
    await mount();
    await editRow(1);
    await choose("Rolle", "STEWARD");
    await click("Gem ændringer");

    const [path] = requests("PATCH")[0];
    expect(path).toBe("/api/v1/users/2");
    expect(sentBody("PATCH")).toEqual({ role: "STEWARD" });
    expect(status()).toBe("operator er gemt.");
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("tbody")?.textContent).toContain("Steward");
  });

  it("locks the admin's own role", async () => {
    await mount();
    await editRow(0);
    expect(field<HTMLSelectElement>("Rolle").disabled).toBe(true);
  });

  it("shows a message when the list cannot be fetched", async () => {
    fetchMock.mockImplementation(async () => response({}, 503));
    await mount();
    expect(status()).toBeTruthy();
    expect(container.querySelector("table")).toBeNull();
  });
});
