# ADR 0003. Mobile View Devtools Expo and androidStudio

**Status.** Accepted 
**Date.** 2026-10-05
**Deciders.** Noah Terpe Woods, Elias Hildebrandt, Simon Klarlund Nielsen
**Related backlog items.** MET-X-000

## Context
The steward side of our system has to run on Android phone Samsung Galaxy A56. 
We therefore needed development tools that would allow us to build, view, and test the application in an Android environment.

We chose to use Expo and Android Studio together, as they solve different parts of this problem.

Expo allows us to simplify app development by managing the android system for us, allowing us to focus on developing the application in React Native. Lets us work with android without having the phone ourselves. 
It also gives us a QR-code that allows developers to open the application on compatible physical devices.

Android Studio provides an Android emulator, allowing us to run and visually test the application on a virtual Android device without needing a physical phone.


The main factors behind this decision were the need for an Android development environment, limited access to physical test devices, and the ability to develop and test changes efficiently.

## Decision

We use Expo as our React Native development framework and Android Studio's Android Emulator to run and test the steward application on virtual Android devices. 
Expo also allows us to preview and test changes on compatible physical phones during development.

## Consequences

Advantages:
- Developers can test the application without needing a physical Android phone.
- Changes can be viewed quickly during development, making it easier to identify and fix UI problems.
- Expo reduces the amount of native Android configuration we need to manage ourselves.
- Android Studio allows us to test different virtual Android devices and screen configurations.

Disadvantages:

- Android Studio and its emulator require installation, configuration, and relatively high computer resources.
- An emulator cannot fully reproduce the performance, hardware behavior, or manufacturer-specific features of a physical Samsung Galaxy A56.
- Expo Go has limitations when using native libraries that are not included in its supported environment. Additional development builds may therefore be required.
- Testing through Expo on physical phones may depend on network connectivity and a compatible development environment.

## Alternatives considered

**React Native without Expo.** 
We could develop the application using React Native with manually managed native Android configuration.
This would provide more direct control over the Android project, but would also require additional setup and maintenance. 
We chose Expo because this level of control was not necessary for our initial development needs.

**Testing only with Expo on physical devices.** 
We could use Expo to run the application on physical phones without setting up an emulator. 
However, we do not have access to an Android device, and would make it less convenient to test different device configurations.


## Notes
- The target device is the Samsung Galaxy A56.
- The Android emulator should be configured with a screen size and Android version representative of the target device where possible.
- Emulator testing does not replace testing on the actual target device.
- The decision should be revisited if the application requires native Android functionality that the current development setup cannot support.
