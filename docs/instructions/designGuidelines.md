# Metro Steward & Control — Design Guidelines

## 1. Colour Palette

The interface should use the Metro colour palette consistently to support recognition, readability, and clear status communication.

| Colour | HEX | Usage |
|---|---|---|
| **Metro Black** | `#1E1E1E` | Steward foreground, Control room background |
| **Metro White** | `#FFFFFF` | Steward background, Control room foreground |
| **M1 Green** | `#007D55` | Positive / manned status |
| **M2 Yellow** | `#FFC82D` | Pending / attention status |
| **M3 Red** | `#E6140F` | Unmanned / critical status |
| **M4 Blue** | `#00A0BE` | Informational elements and supporting UI |

### Status Colours

Station status should be communicated consistently using colour:

- **Green:** Manned
- **Yellow:** Pending
- **Red:** Unmanned

Colour should not be the only indicator of status. Where possible, combine colour with text, icons, or labels to ensure accessibility.

---

## 2. Visual Design

### High Contrast

Use high-contrast colour combinations throughout the interface to maximise readability and accessibility.

- **Steward App:** White background with black primary UI elements.
- **Metro Control:** Inverse treatment, using a black background with white primary UI elements.
- Status colours should primarily be reserved for status communication and important actions.

### Typography

Use large, highly legible fonts throughout the interface.

- Prioritise readability over information density.
- Use clear typographic hierarchy to distinguish headings, labels, status information, and supporting information.
- Avoid unnecessarily small text, particularly for critical operational information.

---

## 3. Navigation & Interaction

### Two-Click Principle

**No action should require more than two clicks to complete.**

The interface should minimise navigation steps and make primary actions immediately accessible.

### Buttons

Buttons should:

- Be large enough to be easily selected.
- Use clear, descriptive labels.
- Communicate the action that will occur when selected.
- Avoid ambiguous labels such as `OK`, `Go`, or `Next` when a more descriptive label is possible.

---

## 4. Core Components

### Scenario Overview

Provide a searchable overview of available scenarios.

The overview should allow users to:

- Search for a specific scenario.
- Identify relevant scenarios quickly.
- Select a scenario to view its details.

### Scenario Map

Display a map of the selected scenario together with relevant information.

The map should provide a clear visual representation of:

- The selected scenario.
- Relevant stations or locations.
- Current station status.
- Other information required to support the user's task.

For **stewards**, the map should be hidden once station placement has been confirmed, allowing the interface to focus on the next relevant task.

### Activation

Provide a clearly visible activation button for initiating the selected scenario or action.

Activation must require confirmation through a modal to prevent accidental activation.

The confirmation modal should:

- Clearly describe the action being confirmed.
- Make the consequences of activation clear.
- Provide distinct **Confirm** and **Cancel** actions.

### Station List

Display a list of relevant stations with their current status.

Station statuses:

- 🟢 **Manned**
- 🟡 **Pending**
- 🔴 **Unmanned**

The station list should only be displayed when it is relevant to the controller's current task.

### Chat

Provide a chat function for communication between relevant users.

> **Requirement:** The chat functionality must have a clearly defined purpose and use case before implementation. The design should specify who can communicate, when communication is required, and what information should be exchanged.

---

## 5. Role-Specific Guidelines

### Steward App

The Steward App should prioritise **simplicity, task completion, and readability**.

- Use a white background with black UI elements.
- Present only information relevant to the steward's current task.
- Use large, descriptive buttons.
- Hide the scenario map once station placement has been confirmed.
- Minimise unnecessary information and navigation.

### Metro Control

Metro Control should prioritise **situational awareness and operational information**.

- Use a black background with white UI elements.
- Display the scenario map as a primary element where relevant.
- Reveal additional details, such as the station list and chat, only when they become relevant to the controller's task.
- Keep critical status information immediately visible.
- Avoid overwhelming the controller with information that is not currently required.

---

## 6. Progressive Disclosure

The interface should follow the principle of **progressive disclosure**: only show information and functionality when it becomes relevant to the user's current task.

For controllers in particular:

- The **station list** should only appear when relevant.
- **Chat** should only appear when communication is required or relevant.
- Additional scenario information should be revealed as needed rather than displayed all at once.

This keeps the interface focused while still providing access to detailed operational information when required.

---

## 7. Design Principles

All screens and components should follow these core principles:

1. **Readable** — Use large typography and high contrast.
2. **Clear** — Use descriptive labels and unambiguous actions.
3. **Fast** — No action should require more than two clicks.
4. **Focused** — Show only information relevant to the current task.
5. **Safe** — Require confirmation for consequential actions such as activation.
6. **Consistent** — Use the Metro colour palette and status conventions consistently.
7. **Accessible** — Do not rely on colour alone to communicate important information.
8. **Role-specific** — Optimise the interface for the different needs of stewards and controllers.
