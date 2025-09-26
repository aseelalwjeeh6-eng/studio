# **App Name**: Aseel SOSO Cinema

## Core Features:

- Authentication and Session Management: Allow users to enter their name, storing it in a temporary session without requiring registration or email. Name persists across the app usage during the session.
- Room Creation/Join: Enable users to create new rooms or join existing ones for shared viewing experiences.
- YouTube Player Integration: Integrate the YouTube player using the provided YouTube API key (YOUTUBE_API_KEY=AIzaSyCaRWIJlBy4PbVpQ5uV6rnBDiUG3FtfYJk) to play videos within the rooms.
- Real-Time Chat: Implement a real-time chat feature using Socket.IO for instant messaging among users in the room. This MVP avoids a Firebase database to simplify the system. Implement a profanity filter tool on the chat input, with an AI judging when the entered text constitutes profanity, to avoid offensive remarks.
- Virtual Seating: Provide virtual seating with four seats represented by images and names, allowing users to 'sit' and be visible to others. Microphone features are excluded in the MVP.
- User Interface Theme Customization: Allow users to change the theme (Light/Dark/Romantic) to customize the user interface.
- Basic Profile Cards: Implement simple profile cards displaying username and a short bio (non-editable).

## Style Guidelines:

- Primary color: Burgundy (#800020) to evoke a luxurious and romantic ambiance.
- Background color: Desaturated burgundy (#26000A) for a rich, dark backdrop.
- Accent color: Gold (#D4AF37) as a contrast, for highlights, buttons, and important elements, conveying elegance.
- Font: 'Alegreya', a humanist serif for headers and body text.
- Maintain a 100vh layout without vertical scrolling (except inside the chatbox), with rounded corners (16-20px) and a glassmorphism effect for a modern, sleek design.
- Incorporate smooth 60fps transitions and heart animations on certain interactions to enhance the romantic theme.
- Support full RTL (Right-to-Left) layout for Arabic language.