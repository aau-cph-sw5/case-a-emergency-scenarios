# Developing the mobile frontend with expo and android studio

The mobile app in `mobile/` is an Expo (React Native) app. You can run it in
two ways during development:

1. **On your own phone with Expo Go**, by scanning a QR code. This does
   **not** work on the university Wi-Fi.
2. **On a virtual phone in Android Studio.** This works on any network,
   including the university Wi-Fi.

Both need the server running.

## Before you start

1. Make sure your `.env` in the repository root contains:

   ```f
   API_URL=http://localhost:3000
   ```

## Option 1: Your phone with Expo Go (QR code)

1. Install **Expo Go** from the App Store or Google Play.
2. Start the API server in one terminal:

   ```bash
   npm run dev
   ```

3. Start Expo in a second terminal:

   ```bash
   npm run mobile
   ```

4. Scan the QR code shown in the terminal.
5. The app opens. Saving a file in `mobile/` updates the phone straight away.

Your phone and your PC must be on the **same network**.


## Option 2: Virtual phone in Android Studio

### 1. Install Android Studio and the SDK tools

1. Install [Android Studio](https://developer.android.com/studio).
2. Open **More Actions → SDK Manager → SDK Tools**, tick
   **Android SDK Platform-Tools** and click **Apply**. Expo needs its `adb`
   tool to talk to the emulator.
3. Tell Windows where the SDK is. Run this once in PowerShell:

   ```powershell
   $sdk = "$env:LOCALAPPDATA\Android\Sdk"
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdk, "User")
   $path = [Environment]::GetEnvironmentVariable("Path", "User")
   [Environment]::SetEnvironmentVariable("Path", "$path;$sdk\platform-tools;$sdk\emulator", "User")
   ```

4. Restart VS Code completely.

### 3. Download the Samsung skin

1. Download the Galaxy A56 skin from
   [Samsung Galaxy Emulator Skins (Galaxy A)](https://developer.samsung.com/galaxy-emulator-skin/galaxy-a.html).


### 4. Create the virtual phone (1080 × 2340, 6.7")

1. Open android studio **More Actions** -> **Virtual Device Manager** -> **+ → Create Virtual Device**.
2. Click **New Hardware Profile** and fill in:
   - **Device Name:** `Samsung Galaxy A56`
   - **Screen size:** `6.7` inches
   - **Resolution:** `1080` × `2340` px
   - **skin:** `choose the Galaxy_A56 skin` just downloaded
3. Click **Finish**, select the new profile and click **Next**..

### 5. Run the app on the emulator

1. Start the virtual phone from **Device Manager** and wait for the
   Android home screen.
2. Start the server and Expo in two terminals:

   ```bash
   npm run dev
   npm run mobile
   ```

3. Press **`a`** in the Expo terminal. The first time, Expo installs Expo Go on
   the emulator, then opens the app.

Saving a file in `mobile/` updates the emulator straight away.